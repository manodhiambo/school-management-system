import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get messages
router.get('/', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const messages = await query(`
      SELECT * FROM messages
      WHERE tenant_id = $1 AND (recipient_id = $2 OR sender_id = $2)
      ORDER BY created_at DESC
      LIMIT 50
    `, [tid, req.user.id]);

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
    const tid = req.user.tenant_id;

    const messageId = uuidv4();

    await query(
      'INSERT INTO messages (id, sender_id, recipient_id, subject, content, tenant_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [messageId, req.user.id, recipient_id, subject, content, tid]
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
