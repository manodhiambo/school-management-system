import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get messages
router.get('/', authenticate, async (req, res) => {
  try {
    const messages = await query(`
      SELECT * FROM messages 
      WHERE recipient_id = ? OR sender_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.user.id, req.user.id]);
    
    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Error fetching messages' });
  }
});

// Send message
router.post('/', authenticate, async (req, res) => {
  try {
    const { recipient_id, subject, content } = req.body;
    
    const messageId = uuidv4();
    
    await query(
      'INSERT INTO messages (id, sender_id, recipient_id, subject, content) VALUES (?, ?, ?, ?, ?)',
      [messageId, req.user.id, recipient_id, subject, content]
    );
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { id: messageId }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Error sending message' });
  }
});

export default router;
