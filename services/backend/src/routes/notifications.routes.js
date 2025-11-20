import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Create notification (broadcast)
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, message, type, targetAudience } = req.body;

    // Get target users based on audience
    let targetUsers = [];
    
    if (targetAudience === 'all' || !targetAudience) {
      targetUsers = await query('SELECT id FROM users WHERE is_active = TRUE');
    } else if (targetAudience === 'students') {
      targetUsers = await query('SELECT user_id as id FROM students WHERE status = "active"');
    } else if (targetAudience === 'teachers') {
      targetUsers = await query('SELECT user_id as id FROM teachers WHERE status = "active"');
    } else if (targetAudience === 'parents') {
      targetUsers = await query('SELECT user_id as id FROM parents');
    } else if (targetAudience === 'staff') {
      targetUsers = await query('SELECT id FROM users WHERE role = "admin" AND is_active = TRUE');
    }

    // Create notifications for all target users (one by one to avoid bulk insert issues)
    let count = 0;
    for (const user of targetUsers) {
      await query(
        'INSERT INTO notifications (id, user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), user.id, title, message, type || 'announcement', false]
      );
      count++;
    }

    res.status(201).json({
      success: true,
      message: `Notification sent to ${count} users`,
      data: { count }
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ success: false, message: 'Error creating notification' });
  }
});

// Get notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await query(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.user.id]);

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
});

// Mark as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification error:', error);
    res.status(500).json({ success: false, message: 'Error updating notification' });
  }
});

// Mark all as read
router.post('/mark-all-read', authenticate, async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications error:', error);
    res.status(500).json({ success: false, message: 'Error updating notifications' });
  }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: 'Error deleting notification' });
  }
});

export default router;
