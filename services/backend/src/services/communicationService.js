import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class CommunicationService {
  // ==================== MESSAGES ====================
  async sendMessage(messageData) {
    const {
      senderId,
      recipientId,
      subject,
      body,
      content,
      parentMessageId
    } = messageData;

    // Use body or content (frontend might send either)
    const messageContent = body || content;

    if (!recipientId) {
      throw new ApiError(400, 'Recipient ID is required for direct messages');
    }

    if (!subject || !messageContent) {
      throw new ApiError(400, 'Subject and message content are required');
    }

    const messageId = uuidv4();
    
    await query(
      `INSERT INTO messages (id, sender_id, recipient_id, subject, content, parent_message_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [messageId, senderId, recipientId, subject, messageContent, parentMessageId || null]
    );

    // Create notification for recipient
    await this.createNotification(
      recipientId,
      'New Message',
      `You have a new message: ${subject}`,
      'message',
      { messageId, senderId }
    );

    logger.info(`Message sent: ${messageId} from ${senderId} to ${recipientId}`);

    return await this.getMessageById(messageId);
  }

  async getMessageById(id) {
    const results = await query(
      `SELECT
        m.*,
        u.email as sender_email,
        u.role as sender_role,
        COALESCE(s.first_name, t.first_name, p.first_name, '') || ' ' ||
        COALESCE(s.last_name, t.last_name, p.last_name, '') as sender_name,
        ru.email as recipient_email,
        COALESCE(rs.first_name, rt.first_name, rp.first_name, '') || ' ' ||
        COALESCE(rs.last_name, rt.last_name, rp.last_name, '') as recipient_name
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       LEFT JOIN students s ON u.id = s.user_id
       LEFT JOIN teachers t ON u.id = t.user_id
       LEFT JOIN parents p ON u.id = p.user_id
       LEFT JOIN users ru ON m.recipient_id = ru.id
       LEFT JOIN students rs ON ru.id = rs.user_id
       LEFT JOIN teachers rt ON ru.id = rt.user_id
       LEFT JOIN parents rp ON ru.id = rp.user_id
       WHERE m.id = $1`,
      [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Message not found');
    }

    return results[0];
  }

  async getMessages(userId, filters = {}) {
    const { type, isRead, limit = 50 } = filters;

    let whereConditions = ['m.recipient_id = $1'];
    let queryParams = [userId];
    let paramIndex = 2;

    if (isRead !== undefined) {
      whereConditions.push(`m.is_read = $${paramIndex}`);
      queryParams.push(isRead);
      paramIndex++;
    }

    queryParams.push(limit);

    const whereClause = whereConditions.join(' AND ');

    const messages = await query(
      `SELECT
        m.*,
        u.email as sender_email,
        u.role as sender_role,
        COALESCE(s.first_name, t.first_name, p.first_name, '') || ' ' ||
        COALESCE(s.last_name, t.last_name, p.last_name, '') as sender_name
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       LEFT JOIN students s ON u.id = s.user_id
       LEFT JOIN teachers t ON u.id = t.user_id
       LEFT JOIN parents p ON u.id = p.user_id
       WHERE ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT $${paramIndex}`,
      queryParams
    );

    return messages;
  }

  async getSentMessages(userId, filters = {}) {
    const { limit = 50 } = filters;

    const messages = await query(
      `SELECT
        m.*,
        ru.email as recipient_email,
        ru.role as recipient_role,
        COALESCE(rs.first_name, rt.first_name, rp.first_name, '') || ' ' ||
        COALESCE(rs.last_name, rt.last_name, rp.last_name, '') as recipient_name
       FROM messages m
       LEFT JOIN users ru ON m.recipient_id = ru.id
       LEFT JOIN students rs ON ru.id = rs.user_id
       LEFT JOIN teachers rt ON ru.id = rt.user_id
       LEFT JOIN parents rp ON ru.id = rp.user_id
       WHERE m.sender_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return messages;
  }

  async markMessageAsRead(messageId, userId) {
    await query(
      `UPDATE messages SET is_read = TRUE, updated_at = NOW() 
       WHERE id = $1 AND recipient_id = $2`,
      [messageId, userId]
    );

    return { message: 'Message marked as read' };
  }

  async deleteMessage(messageId, userId) {
    const result = await query(
      'DELETE FROM messages WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2) RETURNING id',
      [messageId, userId]
    );

    if (result.length === 0) {
      throw new ApiError(404, 'Message not found or unauthorized');
    }

    return { message: 'Message deleted successfully' };
  }

  // ==================== NOTIFICATIONS ====================
  async createNotification(userId, title, message, type = 'info', data = {}) {
    const notificationId = uuidv4();
    
    // Check notification table structure first
    try {
      await query(
        `INSERT INTO notifications (id, user_id, title, message, type, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [notificationId, userId, title, message, type, JSON.stringify(data)]
      );
    } catch (error) {
      // If data column doesn't exist, try without it
      if (error.message.includes('data')) {
        await query(
          `INSERT INTO notifications (id, user_id, title, message, type)
           VALUES ($1, $2, $3, $4, $5)`,
          [notificationId, userId, title, message, type]
        );
      } else {
        throw error;
      }
    }

    logger.info(`Notification created for user ${userId}: ${title}`);

    const result = await query('SELECT * FROM notifications WHERE id = $1', [notificationId]);
    return result[0];
  }

  async getNotifications(userId, filters = {}) {
    const { isRead, type, limit = 50 } = filters;

    let whereConditions = ['user_id = $1'];
    let queryParams = [userId];
    let paramIndex = 2;

    if (isRead !== undefined) {
      whereConditions.push(`is_read = $${paramIndex}`);
      queryParams.push(isRead);
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    queryParams.push(limit);

    const whereClause = whereConditions.join(' AND ');

    const notifications = await query(
      `SELECT * FROM notifications
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex}`,
      queryParams
    );

    return notifications;
  }

  async markNotificationAsRead(notificationId, userId) {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    return { message: 'Notification marked as read' };
  }

  async markAllNotificationsAsRead(userId) {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    return { message: 'All notifications marked as read' };
  }

  async deleteNotification(notificationId, userId) {
    const result = await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [notificationId, userId]
    );

    if (result.length === 0) {
      throw new ApiError(404, 'Notification not found');
    }

    return { message: 'Notification deleted successfully' };
  }

  // ==================== ANNOUNCEMENTS ====================
  async createAnnouncement(announcementData) {
    const {
      title,
      content,
      targetRole = 'all',
      targetClassId,
      priority = 'normal',
      publishDate,
      expiryDate,
      attachments,
      createdBy
    } = announcementData;

    const announcementId = uuidv4();
    
    await query(
      `INSERT INTO announcements (
        id, title, content, target_role, target_class_id, priority,
        publish_date, expiry_date, attachments, is_published, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10)`,
      [
        announcementId, title, content, targetRole, targetClassId || null, priority,
        publishDate || new Date(), expiryDate || null, attachments ? JSON.stringify(attachments) : null, createdBy
      ]
    );

    logger.info(`Announcement created: ${announcementId}`);

    return await this.getAnnouncementById(announcementId);
  }

  async getAnnouncementById(id) {
    const results = await query(
      `SELECT
        a.*,
        c.name as class_name,
        u.email as created_by_email
       FROM announcements a
       LEFT JOIN classes c ON a.target_class_id = c.id
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = $1`,
      [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Announcement not found');
    }

    return results[0];
  }

  async getAnnouncements(filters = {}) {
    const { targetRole, targetClassId, isPublished, limit = 50 } = filters;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (targetRole) {
      whereConditions.push(`(a.target_role = $${paramIndex} OR a.target_role = 'all')`);
      queryParams.push(targetRole);
      paramIndex++;
    }

    if (targetClassId) {
      whereConditions.push(`(a.target_class_id = $${paramIndex} OR a.target_class_id IS NULL)`);
      queryParams.push(targetClassId);
      paramIndex++;
    }

    if (isPublished !== undefined) {
      whereConditions.push(`a.is_published = $${paramIndex}`);
      queryParams.push(isPublished);
      paramIndex++;
    }

    queryParams.push(limit);

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const announcements = await query(
      `SELECT
        a.*,
        c.name as class_name
       FROM announcements a
       LEFT JOIN classes c ON a.target_class_id = c.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${paramIndex}`,
      queryParams
    );

    return announcements;
  }

  async updateAnnouncement(id, updateData) {
    await this.getAnnouncementById(id);

    const { title, content, priority, publishDate, expiryDate, isPublished } = updateData;

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      updateValues.push(title);
      paramIndex++;
    }
    if (content !== undefined) {
      updateFields.push(`content = $${paramIndex}`);
      updateValues.push(content);
      paramIndex++;
    }
    if (priority !== undefined) {
      updateFields.push(`priority = $${paramIndex}`);
      updateValues.push(priority);
      paramIndex++;
    }
    if (publishDate !== undefined) {
      updateFields.push(`publish_date = $${paramIndex}`);
      updateValues.push(publishDate);
      paramIndex++;
    }
    if (expiryDate !== undefined) {
      updateFields.push(`expiry_date = $${paramIndex}`);
      updateValues.push(expiryDate);
      paramIndex++;
    }
    if (isPublished !== undefined) {
      updateFields.push(`is_published = $${paramIndex}`);
      updateValues.push(isPublished);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return await this.getAnnouncementById(id);
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    await query(
      `UPDATE announcements SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
      updateValues
    );

    logger.info(`Announcement updated: ${id}`);

    return await this.getAnnouncementById(id);
  }

  async deleteAnnouncement(id) {
    await query('DELETE FROM announcements WHERE id = $1', [id]);

    logger.info(`Announcement deleted: ${id}`);

    return { message: 'Announcement deleted successfully' };
  }

  // ==================== PARENT-TEACHER MEETINGS ====================
  async schedulePTM(ptmData) {
    // Simplified - just return a placeholder since table might not exist
    logger.info('PTM scheduling requested');
    return { message: 'PTM feature coming soon' };
  }

  async getPTMById(id) {
    throw new ApiError(404, 'PTM feature coming soon');
  }

  async getPTMs(filters = {}) {
    return [];
  }

  async updatePTMStatus(id, status, meetingNotes = null) {
    throw new ApiError(404, 'PTM feature coming soon');
  }

  async deletePTM(id) {
    return { message: 'PTM feature coming soon' };
  }
}

export default new CommunicationService();
