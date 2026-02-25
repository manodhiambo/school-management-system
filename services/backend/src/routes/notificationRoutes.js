import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail, sendBulkEmails } from '../services/emailService.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.use(authenticate);
router.use(tenantContext);
router.use(requireActiveTenant);

// Get user's notifications (scoped to user — already safe, but tenant guard added)
router.get('/', async (req, res) => {
  try {
    const notifications = await query(`
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.user.id]);

    res.json({ success: true, data: notifications });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
});

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ success: true, count: parseInt(result[0].count) });
  } catch (error) {
    logger.error('Get unread count error:', error);
    res.status(500).json({ success: false, message: 'Error fetching count' });
  }
});

// Create notification — only targets users in the same tenant
router.post('/', requireRole(['admin']), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const {
      title,
      message,
      type = 'info',
      targetRole,
      targetUserIds,
      sendEmailNotification = false,
      priority = 'normal'
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Determine target users — restricted to this tenant
    let targetUsers = [];

    if (targetUserIds && targetUserIds.length > 0) {
      const placeholders = targetUserIds.map((_, i) => `$${i + 2}`).join(',');
      targetUsers = await query(`
        SELECT u.id, u.email, u.role,
          COALESCE(s.first_name, t.first_name, p.first_name, 'User') as first_name,
          COALESCE(s.last_name, t.last_name, p.last_name, '') as last_name
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        LEFT JOIN teachers t ON u.id = t.user_id
        LEFT JOIN parents p ON u.id = p.user_id
        WHERE u.tenant_id = $1 AND u.id IN (${placeholders}) AND u.is_active = true
      `, [tenantId, ...targetUserIds]);
    } else if (targetRole && targetRole !== 'all') {
      targetUsers = await query(`
        SELECT u.id, u.email, u.role,
          COALESCE(s.first_name, t.first_name, p.first_name, 'User') as first_name,
          COALESCE(s.last_name, t.last_name, p.last_name, '') as last_name
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        LEFT JOIN teachers t ON u.id = t.user_id
        LEFT JOIN parents p ON u.id = p.user_id
        WHERE u.tenant_id = $1 AND u.role = $2 AND u.is_active = true
      `, [tenantId, targetRole]);
    } else {
      targetUsers = await query(`
        SELECT u.id, u.email, u.role,
          COALESCE(s.first_name, t.first_name, p.first_name, 'User') as first_name,
          COALESCE(s.last_name, t.last_name, p.last_name, '') as last_name
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        LEFT JOIN teachers t ON u.id = t.user_id
        LEFT JOIN parents p ON u.id = p.user_id
        WHERE u.tenant_id = $1 AND u.is_active = true
      `, [tenantId]);
    }

    let createdCount = 0;
    for (const user of targetUsers) {
      await query(`
        INSERT INTO notifications (id, user_id, tenant_id, title, message, type, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
      `, [uuidv4(), user.id, tenantId, title, message, type]);
      createdCount++;
    }

    let emailResults = [];
    if (sendEmailNotification && targetUsers.length > 0) {
      const recipients = targetUsers
        .filter(u => u.email)
        .map(u => ({ email: u.email, name: `${u.first_name} ${u.last_name}`.trim() }));

      if (recipients.length > 0) {
        emailResults = await sendBulkEmails(recipients, 'notification', { title, message, priority });
      }
    }

    logger.info(`Admin ${req.user.id} sent notification to ${createdCount} users in tenant ${tenantId}`);

    res.json({
      success: true,
      message: `Notification sent to ${createdCount} users`,
      data: {
        notificationsCreated: createdCount,
        emailsSent: emailResults.filter(r => r.success).length,
        emailsFailed: emailResults.filter(r => !r.success).length
      }
    });
  } catch (error) {
    logger.error('Create notification error:', error);
    res.status(500).json({ success: false, message: 'Error creating notification' });
  }
});

// Send announcement — tenant-scoped
router.post('/announcement', requireRole(['admin']), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const {
      title,
      message,
      targetRole = 'all',
      priority = 'normal',
      sendEmail: shouldSendEmail = true
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    // Get target users within this tenant only
    let whereClause = 'WHERE u.tenant_id = $1 AND u.is_active = true';
    const params = [tenantId];

    if (targetRole && targetRole !== 'all') {
      whereClause += ` AND u.role = $2`;
      params.push(targetRole);
    }

    const targetUsers = await query(`
      SELECT u.id, u.email, u.role,
        COALESCE(s.first_name, t.first_name, p.first_name, 'User') as first_name,
        COALESCE(s.last_name, t.last_name, p.last_name, '') as last_name
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN teachers t ON u.id = t.user_id
      LEFT JOIN parents p ON u.id = p.user_id
      ${whereClause}
    `, params);

    let createdCount = 0;
    for (const user of targetUsers) {
      await query(`
        INSERT INTO notifications (id, user_id, tenant_id, title, message, type, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, 'announcement', false, NOW())
      `, [uuidv4(), user.id, tenantId, title, message]);
      createdCount++;
    }

    // Save to announcements table if it exists
    try {
      await query(`
        INSERT INTO announcements (id, tenant_id, title, content, target_audience, priority, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [uuidv4(), tenantId, title, message, targetRole, priority, req.user.id]);
    } catch (e) {
      logger.warn('Could not save to announcements table:', e.message);
    }

    let emailResults = [];
    if (shouldSendEmail) {
      const recipients = targetUsers
        .filter(u => u.email)
        .map(u => ({ email: u.email, name: `${u.first_name} ${u.last_name}`.trim() }));

      if (recipients.length > 0) {
        emailResults = await sendBulkEmails(recipients, 'announcement', { title, message, priority });
      }
    }

    logger.info(`Admin ${req.user.id} sent announcement: ${title} to tenant ${tenantId}`);

    res.json({
      success: true,
      message: 'Announcement sent successfully',
      data: {
        notificationsCreated: createdCount,
        emailsSent: emailResults.filter(r => r.success).length,
        targetRole
      }
    });
  } catch (error) {
    logger.error('Send announcement error:', error);
    res.status(500).json({ success: false, message: 'Error sending announcement' });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Mark read error:', error);
    res.status(500).json({ success: false, message: 'Error updating notification' });
  }
});

// Mark all as read
router.post('/mark-all-read', async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Mark all read error:', error);
    res.status(500).json({ success: false, message: 'Error updating notifications' });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: 'Error deleting notification' });
  }
});

export default router;
