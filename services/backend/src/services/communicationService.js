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
      recipientRole,
      recipientClassId,
      subject,
      body,
      messageType,
      priority,
      attachments,
      parentMessageId
    } = messageData;

    const messageId = uuidv4();
    await query(
      `INSERT INTO messages (
        id, sender_id, recipient_id, recipient_role, recipient_class_id,
        subject, body, message_type, priority, attachments, parent_message_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId, senderId, recipientId, recipientRole, recipientClassId,
        subject, body, messageType, priority, JSON.stringify(attachments), parentMessageId
      ]
    );

    // Create notifications for recipients
    if (messageType === 'direct' && recipientId) {
      await this.createNotification(
        recipientId,
        'New Message',
        `You have a new message: ${subject}`,
        'info',
        { messageId, senderId }
      );
    } else if (messageType === 'broadcast') {
      // Send to all users with specified role
      await this.notifyBroadcastRecipients(messageId, recipientRole, recipientClassId, subject);
    }

    logger.info(`Message sent: ${messageId}`);

    return await this.getMessageById(messageId);
  }

  async notifyBroadcastRecipients(messageId, recipientRole, recipientClassId, subject) {
    let whereConditions = [];
    let queryParams = [];

    if (recipientRole && recipientRole !== 'all') {
      whereConditions.push('u.role = ?');
      queryParams.push(recipientRole);
    }

    // Get recipients
    let recipientQuery = 'SELECT u.id FROM users u WHERE u.is_active = TRUE';
    
    if (recipientClassId) {
      if (recipientRole === 'student') {
        recipientQuery = `
          SELECT u.id FROM users u
          JOIN students s ON u.id = s.user_id
          WHERE s.class_id = ? AND u.is_active = TRUE
        `;
        queryParams = [recipientClassId];
      } else if (recipientRole === 'parent') {
        recipientQuery = `
          SELECT DISTINCT u.id FROM users u
          JOIN parents p ON u.id = p.user_id
          JOIN parent_students ps ON p.id = ps.parent_id
          JOIN students s ON ps.student_id = s.id
          WHERE s.class_id = ? AND u.is_active = TRUE
        `;
        queryParams = [recipientClassId];
      }
    } else if (whereConditions.length > 0) {
      recipientQuery += ` AND ${whereConditions.join(' AND ')}`;
    }

    const recipients = await query(recipientQuery, queryParams);

    // Create notifications
    for (const recipient of recipients) {
      await this.createNotification(
        recipient.id,
        'New Announcement',
        subject,
        'info',
        { messageId }
      );
    }
  }

  async getMessageById(id) {
    const results = await query(
      `SELECT 
        m.*,
        u.email as sender_email,
        CONCAT(COALESCE(s.first_name, t.first_name, p.first_name, ''), ' ', 
               COALESCE(s.last_name, t.last_name, p.last_name, '')) as sender_name
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       LEFT JOIN students s ON u.id = s.user_id
       LEFT JOIN teachers t ON u.id = t.user_id
       LEFT JOIN parents p ON u.id = p.user_id
       WHERE m.id = ?`,
      [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Message not found');
    }

    const message = results[0];

    // Parse JSON fields
    if (message.attachments) {
      message.attachments = JSON.parse(message.attachments);
    }

    return message;
  }

  async getMessages(userId, filters = {}) {
    const { type, isRead, limit = 50 } = filters;

    let whereConditions = [
      '(m.recipient_id = ? OR m.recipient_role IN (SELECT role FROM users WHERE id = ?) OR m.recipient_role = "all")'
    ];
    let queryParams = [userId, userId];

    if (type) {
      whereConditions.push('m.message_type = ?');
      queryParams.push(type);
    }

    if (isRead !== undefined) {
      whereConditions.push('m.is_read = ?');
      queryParams.push(isRead);
    }

    const whereClause = whereConditions.join(' AND ');

    const messages = await query(
      `SELECT 
        m.*,
        u.email as sender_email,
        CONCAT(COALESCE(s.first_name, t.first_name, p.first_name, ''), ' ', 
               COALESCE(s.last_name, t.last_name, p.last_name, '')) as sender_name
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       LEFT JOIN students s ON u.id = s.user_id
       LEFT JOIN teachers t ON u.id = t.user_id
       LEFT JOIN parents p ON u.id = p.user_id
       WHERE ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT ?`,
      [...queryParams, limit]
    );

    return messages;
  }

  async getSentMessages(userId, filters = {}) {
    const { limit = 50 } = filters;

    const messages = await query(
      `SELECT 
        m.*,
        u.email as recipient_email
       FROM messages m
       LEFT JOIN users u ON m.recipient_id = u.id
       WHERE m.sender_id = ?
       ORDER BY m.created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    return messages;
  }

  async markMessageAsRead(messageId, userId) {
    await query(
      'UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE id = ? AND recipient_id = ?',
      [messageId, userId]
    );

    return { message: 'Message marked as read' };
  }

  async deleteMessage(messageId, userId) {
    // Only sender or recipient can delete
    const result = await query(
      'DELETE FROM messages WHERE id = ? AND (sender_id = ? OR recipient_id = ?)',
      [messageId, userId, userId]
    );

    if (result.affectedRows === 0) {
      throw new ApiError(404, 'Message not found or unauthorized');
    }

    return { message: 'Message deleted successfully' };
  }

  // ==================== NOTIFICATIONS ====================
  async createNotification(userId, title, message, type, data = {}) {
    const notificationId = uuidv4();
    await query(
      `INSERT INTO notifications (id, user_id, title, message, type, data)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [notificationId, userId, title, message, type, JSON.stringify(data)]
    );

    logger.info(`Notification created for user ${userId}`);

    return await query('SELECT * FROM notifications WHERE id = ?', [notificationId]);
  }

  async getNotifications(userId, filters = {}) {
    const { isRead, type, limit = 50 } = filters;

    let whereConditions = ['user_id = ?'];
    let queryParams = [userId];

    if (isRead !== undefined) {
      whereConditions.push('is_read = ?');
      queryParams.push(isRead);
    }

    if (type) {
      whereConditions.push('type = ?');
      queryParams.push(type);
    }

    const whereClause = whereConditions.join(' AND ');

    const notifications = await query(
      `SELECT * FROM notifications 
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ?`,
      [...queryParams, limit]
    );

    return notifications;
  }

  async markNotificationAsRead(notificationId, userId) {
    await query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    return { message: 'Notification marked as read' };
  }

  async markAllNotificationsAsRead(userId) {
    await query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    return { message: 'All notifications marked as read' };
  }

  async deleteNotification(notificationId, userId) {
    const result = await query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      throw new ApiError(404, 'Notification not found');
    }

    return { message: 'Notification deleted successfully' };
  }

  // ==================== ANNOUNCEMENTS ====================
  async createAnnouncement(announcementData) {
    const {
      title,
      content,
      targetRole,
      targetClassId,
      priority,
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
      [
        announcementId, title, content, targetRole, targetClassId, priority,
        publishDate, expiryDate, JSON.stringify(attachments), createdBy
      ]
    );

    // Create notifications for target audience
    await this.notifyAnnouncementRecipients(announcementId, title, targetRole, targetClassId);

    logger.info(`Announcement created: ${announcementId}`);

    return await this.getAnnouncementById(announcementId);
  }

  async notifyAnnouncementRecipients(announcementId, title, targetRole, targetClassId) {
    let recipientQuery = 'SELECT u.id FROM users u WHERE u.is_active = TRUE';
    let queryParams = [];

    if (targetRole && targetRole !== 'all') {
      if (targetClassId) {
        if (targetRole === 'student') {
          recipientQuery = `
            SELECT u.id FROM users u
            JOIN students s ON u.id = s.user_id
            WHERE s.class_id = ? AND u.is_active = TRUE
          `;
          queryParams = [targetClassId];
        } else if (targetRole === 'parent') {
          recipientQuery = `
            SELECT DISTINCT u.id FROM users u
            JOIN parents p ON u.id = p.user_id
            JOIN parent_students ps ON p.id = ps.parent_id
            JOIN students s ON ps.student_id = s.id
            WHERE s.class_id = ? AND u.is_active = TRUE
          `;
          queryParams = [targetClassId];
        }
      } else {
        recipientQuery += ' AND u.role = ?';
        queryParams = [targetRole];
      }
    }

    const recipients = await query(recipientQuery, queryParams);

    for (const recipient of recipients) {
      await this.createNotification(
        recipient.id,
        'New Announcement',
        title,
        'announcement',
        { announcementId }
      );
    }
  }

  async getAnnouncementById(id) {
    const results = await query(
      `SELECT 
        a.*,
        c.name as class_name,
        c.section as section_name,
        u.email as created_by_email
       FROM announcements a
       LEFT JOIN classes c ON a.target_class_id = c.id
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = ?`,
      [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Announcement not found');
    }

    const announcement = results[0];

    if (announcement.attachments) {
      announcement.attachments = JSON.parse(announcement.attachments);
    }

    return announcement;
  }

  async getAnnouncements(filters = {}) {
    const { targetRole, targetClassId, isPublished, limit = 50 } = filters;

    let whereConditions = [];
    let queryParams = [];

    if (targetRole) {
      whereConditions.push('(a.target_role = ? OR a.target_role = "all")');
      queryParams.push(targetRole);
    }

    if (targetClassId) {
      whereConditions.push('(a.target_class_id = ? OR a.target_class_id IS NULL)');
      queryParams.push(targetClassId);
    }

    if (isPublished !== undefined) {
      whereConditions.push('a.is_published = ?');
      queryParams.push(isPublished);
    }

    // Only show active announcements (not expired)
    whereConditions.push('(a.expiry_date IS NULL OR a.expiry_date >= CURDATE())');
    whereConditions.push('a.publish_date <= CURDATE()');

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const announcements = await query(
      `SELECT 
        a.*,
        c.name as class_name,
        c.section as section_name
       FROM announcements a
       LEFT JOIN classes c ON a.target_class_id = c.id
       ${whereClause}
       ORDER BY a.publish_date DESC, a.created_at DESC
       LIMIT ?`,
      [...queryParams, limit]
    );

    return announcements;
  }

  async updateAnnouncement(id, updateData) {
    await this.getAnnouncementById(id);

    const {
      title,
      content,
      priority,
      publishDate,
      expiryDate,
      isPublished
    } = updateData;

    const updateFields = [];
    const updateValues = [];

    if (title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    if (content !== undefined) {
      updateFields.push('content = ?');
      updateValues.push(content);
    }
    if (priority !== undefined) {
      updateFields.push('priority = ?');
      updateValues.push(priority);
    }
    if (publishDate !== undefined) {
      updateFields.push('publish_date = ?');
      updateValues.push(publishDate);
    }
    if (expiryDate !== undefined) {
      updateFields.push('expiry_date = ?');
      updateValues.push(expiryDate);
    }
    if (isPublished !== undefined) {
      updateFields.push('is_published = ?');
      updateValues.push(isPublished);
    }

    if (updateFields.length === 0) {
      return await this.getAnnouncementById(id);
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    await query(
      `UPDATE announcements SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    logger.info(`Announcement updated: ${id}`);

    return await this.getAnnouncementById(id);
  }

  async deleteAnnouncement(id) {
    await query('DELETE FROM announcements WHERE id = ?', [id]);

    logger.info(`Announcement deleted: ${id}`);

    return { message: 'Announcement deleted successfully' };
  }

  // ==================== PARENT-TEACHER MEETINGS ====================
  async schedulePTM(ptmData) {
    const {
      parentId,
      teacherId,
      studentId,
      meetingDate,
      startTime,
      endTime,
      location,
      purpose,
      scheduledBy
    } = ptmData;

    // Check for conflicts
    const conflicts = await query(
      `SELECT * FROM parent_teacher_meetings 
       WHERE teacher_id = ? AND meeting_date = ? 
       AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))
       AND status NOT IN ('cancelled', 'completed')`,
      [teacherId, meetingDate, startTime, startTime, endTime, endTime]
    );

    if (conflicts.length > 0) {
      throw new ApiError(400, 'Teacher is not available at this time');
    }

    const ptmId = uuidv4();
    await query(
      `INSERT INTO parent_teacher_meetings (
        id, parent_id, teacher_id, student_id, meeting_date,
        start_time, end_time, location, purpose, status, scheduled_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
      [ptmId, parentId, teacherId, studentId, meetingDate, startTime, endTime, location, purpose, scheduledBy]
    );

    // Notify parent and teacher
    const parent = await query('SELECT user_id FROM parents WHERE id = ?', [parentId]);
    const teacher = await query('SELECT user_id FROM teachers WHERE id = ?', [teacherId]);

    if (parent[0]) {
      await this.createNotification(
        parent[0].user_id,
        'Parent-Teacher Meeting Scheduled',
        `A meeting has been scheduled for ${meetingDate} at ${startTime}`,
        'info',
        { ptmId }
      );
    }

    if (teacher[0]) {
      await this.createNotification(
        teacher[0].user_id,
        'Parent-Teacher Meeting Scheduled',
        `A meeting has been scheduled for ${meetingDate} at ${startTime}`,
        'info',
        { ptmId }
      );
    }

    logger.info(`PTM scheduled: ${ptmId}`);

    return await this.getPTMById(ptmId);
  }

  async getPTMById(id) {
    const results = await query(
      `SELECT 
        ptm.*,
        p.first_name as parent_first_name,
        p.last_name as parent_last_name,
        p.phone_primary as parent_phone,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        s.admission_number
       FROM parent_teacher_meetings ptm
       JOIN parents p ON ptm.parent_id = p.id
       JOIN teachers t ON ptm.teacher_id = t.id
       JOIN students s ON ptm.student_id = s.id
       WHERE ptm.id = ?`,
      [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'PTM not found');
    }

    return results[0];
  }

  async getPTMs(filters = {}) {
    const { parentId, teacherId, studentId, status, date } = filters;

    let whereConditions = [];
    let queryParams = [];

    if (parentId) {
      whereConditions.push('ptm.parent_id = ?');
      queryParams.push(parentId);
    }

    if (teacherId) {
      whereConditions.push('ptm.teacher_id = ?');
      queryParams.push(teacherId);
    }

    if (studentId) {
      whereConditions.push('ptm.student_id = ?');
      queryParams.push(studentId);
    }

    if (status) {
      whereConditions.push('ptm.status = ?');
      queryParams.push(status);
    }

    if (date) {
      whereConditions.push('ptm.meeting_date = ?');
      queryParams.push(date);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const ptms = await query(
      `SELECT 
        ptm.*,
        p.first_name as parent_first_name,
        p.last_name as parent_last_name,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        s.first_name as student_first_name,
        s.last_name as student_last_name
       FROM parent_teacher_meetings ptm
       JOIN parents p ON ptm.parent_id = p.id
       JOIN teachers t ON ptm.teacher_id = t.id
       JOIN students s ON ptm.student_id = s.id
       ${whereClause}
       ORDER BY ptm.meeting_date DESC, ptm.start_time`,
      queryParams
    );

    return ptms;
  }

  async updatePTMStatus(id, status, meetingNotes = null) {
    const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled'];
    
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    const updateFields = ['status = ?', 'updated_at = NOW()'];
    const updateValues = [status];

    if (meetingNotes) {
      updateFields.push('meeting_notes = ?');
      updateValues.push(meetingNotes);
    }

    updateValues.push(id);

    await query(
      `UPDATE parent_teacher_meetings SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    logger.info(`PTM ${id} status updated to ${status}`);

    return await this.getPTMById(id);
  }

  async deletePTM(id) {
    await query('DELETE FROM parent_teacher_meetings WHERE id = ?', [id]);

    logger.info(`PTM deleted: ${id}`);

    return { message: 'PTM deleted successfully' };
  }
}

export default new CommunicationService();
