import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

// Get notifications for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ success: true, data: notifications });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
});

// Create notification
router.post('/', authenticate, async (req, res) => {
  try {
    const { user_id, title, message, type } = req.body;
    
    const notificationId = uuidv4();
    await query(
      `INSERT INTO notifications (id, user_id, title, message, type)
       VALUES ($1, $2, $3, $4, $5)`,
      [notificationId, user_id, title, message, type || 'info']
    );
    
    res.status(201).json({ success: true, message: 'Notification created' });
  } catch (error) {
    logger.error('Create notification error:', error);
    res.status(500).json({ success: false, message: 'Error creating notification' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Mark notification error:', error);
    res.status(500).json({ success: false, message: 'Error marking notification' });
  }
});

// Mark all as read
router.post('/mark-all-read', authenticate, async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Mark all notifications error:', error);
    res.status(500).json({ success: false, message: 'Error marking notifications' });
  }
});

export default router;
