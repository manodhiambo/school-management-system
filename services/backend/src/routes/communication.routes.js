import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get announcements
router.get('/announcements', authenticate, async (req, res) => {
  try {
    const announcements = await query(`
      SELECT a.*, u.email as created_by_email
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.is_active = true
      ORDER BY a.created_at DESC
    `);
    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ success: false, message: 'Error fetching announcements' });
  }
});

// Create announcement
router.post('/announcements', authenticate, async (req, res) => {
  try {
    const { title, content, type, target_audience, expires_at } = req.body;
    
    const announcementId = uuidv4();
    await query(
      `INSERT INTO announcements (id, title, content, type, target_audience, expires_at, created_by, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [announcementId, title, content, type || 'general', target_audience || 'all', expires_at || null, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully'
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ success: false, message: 'Error creating announcement' });
  }
});

// Get messages
router.get('/messages', authenticate, async (req, res) => {
  try {
    const messages = await query(`
      SELECT m.*, 
        sender.email as sender_email,
        recipient.email as recipient_email
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users recipient ON m.recipient_id = recipient.id
      WHERE m.recipient_id = $1 OR m.sender_id = $1
      ORDER BY m.created_at DESC
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: { messages }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Error fetching messages' });
  }
});

// Send message
router.post('/messages', authenticate, async (req, res) => {
  try {
    const { recipient_id, subject, content } = req.body;
    
    const messageId = uuidv4();
    await query(
      `INSERT INTO messages (id, sender_id, recipient_id, subject, content)
       VALUES ($1, $2, $3, $4, $5)`,
      [messageId, req.user.id, recipient_id, subject, content]
    );

    res.status(201).json({
      success: true,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Error sending message' });
  }
});

// Mark message as read
router.put('/messages/:id/read', authenticate, async (req, res) => {
  try {
    await query(
      `UPDATE messages SET is_read = true WHERE id = $1`,
      [req.params.id]
    );
    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Mark message error:', error);
    res.status(500).json({ success: false, message: 'Error marking message' });
  }
});

export default router;
