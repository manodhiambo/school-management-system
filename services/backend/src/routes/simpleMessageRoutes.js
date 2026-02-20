import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

// Get messageable recipients — available to all authenticated users
router.get('/recipients', authenticate, async (req, res) => {
  try {
    const recipients = await query(`
      SELECT
        u.id,
        u.role,
        COALESCE(t.first_name, s.first_name, p.first_name, '') || ' ' ||
        COALESCE(t.last_name,  s.last_name,  p.last_name,  '') AS name,
        u.email
      FROM users u
      LEFT JOIN teachers t ON u.id = t.user_id
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN parents  p ON u.id = p.user_id
      WHERE u.is_active = true
        AND u.id != $1
        AND u.role IN ('admin', 'teacher')
      ORDER BY u.role, name
    `, [req.user.id]);

    res.json({ success: true, data: recipients });
  } catch (error) {
    logger.error('Get recipients error:', error);
    res.status(500).json({ success: false, message: 'Error fetching recipients' });
  }
});

// Send a message
router.post('/send', authenticate, async (req, res) => {
  try {
    logger.info('Send message request body:', JSON.stringify(req.body));
    
    const { recipientId, subject, body, content, message, priority } = req.body;
    
    // Get message content from various possible field names
    const messageContent = body || content || message;
    
    if (!recipientId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Recipient ID is required' 
      });
    }
    
    if (!subject) {
      return res.status(400).json({ 
        success: false, 
        message: 'Subject is required' 
      });
    }
    
    if (!messageContent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message content is required' 
      });
    }
    
    // Verify recipient exists
    const recipient = await query('SELECT id, email, role FROM users WHERE id = $1', [recipientId]);
    if (recipient.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Recipient not found' 
      });
    }
    
    const messageId = uuidv4();
    
    await query(
      `INSERT INTO messages (id, sender_id, recipient_id, subject, content)
       VALUES ($1, $2, $3, $4, $5)`,
      [messageId, req.user.id, recipientId, subject, messageContent]
    );
    
    // Create notification for recipient
    const notificationId = uuidv4();
    await query(
      `INSERT INTO notifications (id, user_id, title, message, type)
       VALUES ($1, $2, $3, $4, $5)`,
      [notificationId, recipientId, 'New Message', `You have a new message: ${subject}`, 'message']
    );
    
    logger.info(`Message sent: ${messageId} from ${req.user.id} to ${recipientId}`);
    
    res.status(201).json({ 
      success: true, 
      message: 'Message sent successfully',
      data: { id: messageId }
    });
  } catch (error) {
    logger.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Error sending message' });
  }
});

// Get inbox messages (received)
router.get('/inbox', authenticate, async (req, res) => {
  try {
    const messages = await query(
      `SELECT m.*, 
        u.email as sender_email,
        COALESCE(s.first_name, t.first_name, p.first_name, '') || ' ' ||
        COALESCE(s.last_name, t.last_name, p.last_name, '') as sender_name
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       LEFT JOIN students s ON u.id = s.user_id
       LEFT JOIN teachers t ON u.id = t.user_id
       LEFT JOIN parents p ON u.id = p.user_id
       WHERE m.recipient_id = $1
       ORDER BY m.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    
    res.json({ success: true, data: messages });
  } catch (error) {
    logger.error('Get inbox error:', error);
    res.status(500).json({ success: false, message: 'Error fetching messages' });
  }
});

// Get sent messages
router.get('/sent', authenticate, async (req, res) => {
  try {
    const messages = await query(
      `SELECT m.*, 
        u.email as recipient_email,
        COALESCE(s.first_name, t.first_name, p.first_name, '') || ' ' ||
        COALESCE(s.last_name, t.last_name, p.last_name, '') as recipient_name
       FROM messages m
       LEFT JOIN users u ON m.recipient_id = u.id
       LEFT JOIN students s ON u.id = s.user_id
       LEFT JOIN teachers t ON u.id = t.user_id
       LEFT JOIN parents p ON u.id = p.user_id
       WHERE m.sender_id = $1
       ORDER BY m.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    
    res.json({ success: true, data: messages });
  } catch (error) {
    logger.error('Get sent messages error:', error);
    res.status(500).json({ success: false, message: 'Error fetching messages' });
  }
});

// Mark message as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await query(
      'UPDATE messages SET is_read = TRUE WHERE id = $1 AND recipient_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Message marked as read' });
  } catch (error) {
    logger.error('Mark message read error:', error);
    res.status(500).json({ success: false, message: 'Error marking message as read' });
  }
});

// Delete message
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await query(
      'DELETE FROM messages WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)',
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    logger.error('Delete message error:', error);
    res.status(500).json({ success: false, message: 'Error deleting message' });
  }
});

export default router;
