import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';

const router = express.Router();

// Get all users
router.get('/', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const users = await query(`
      SELECT id, email, role, is_active, is_verified, last_login, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    res.json({ success: true, data: users });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

// Get single user
router.get('/:id', authenticate, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, email, role, is_active, is_verified, last_login, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: users[0] });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Error fetching user' });
  }
});

// Create user
router.post('/', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    
    await query(
      `INSERT INTO users (id, email, password, role, is_active, is_verified)
       VALUES ($1, $2, $3, $4, true, true)`,
      [userId, email, hashedPassword, role || 'student']
    );
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id: userId, email, role }
    });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
});

// Update user
router.put('/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { role, is_active } = req.body;
    
    await query(
      `UPDATE users SET role = COALESCE($1, role), is_active = COALESCE($2, is_active), updated_at = NOW()
       WHERE id = $3`,
      [role, is_active, req.params.id]
    );
    
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// Delete user
router.delete('/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
});

export default router;
