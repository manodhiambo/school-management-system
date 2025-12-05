import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

// Get all users with names
router.get('/', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const users = await query(`
      SELECT 
        u.id, u.email, u.role, u.is_active, u.is_verified, u.last_login, u.created_at,
        COALESCE(s.first_name, t.first_name, p.first_name) as first_name,
        COALESCE(s.last_name, t.last_name, p.last_name) as last_name
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN teachers t ON u.id = t.user_id
      LEFT JOIN parents p ON u.id = p.user_id
      ORDER BY u.created_at DESC
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
    const users = await query(`
      SELECT 
        u.id, u.email, u.role, u.is_active, u.is_verified, u.last_login, u.created_at,
        COALESCE(s.first_name, t.first_name, p.first_name) as first_name,
        COALESCE(s.last_name, t.last_name, p.last_name) as last_name
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN teachers t ON u.id = t.user_id
      LEFT JOIN parents p ON u.id = p.user_id
      WHERE u.id = $1
    `, [req.params.id]);
    
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
    const { email, password, role, firstName, lastName } = req.body;
    
    // Check if email exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    await query(
      `INSERT INTO users (id, email, password_hash, role, is_active, is_verified)
       VALUES ($1, $2, $3, $4, TRUE, TRUE)`,
      [userId, email, hashedPassword, role]
    );
    
    // Create corresponding record based on role
    if (role === 'student' && firstName && lastName) {
      const admissionNumber = `STD${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      await query(
        `INSERT INTO students (id, user_id, first_name, last_name, admission_number)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), userId, firstName, lastName, admissionNumber]
      );
    } else if (role === 'teacher' && firstName && lastName) {
      const employeeId = `TCH${new Date().getFullYear()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      await query(
        `INSERT INTO teachers (id, user_id, first_name, last_name, employee_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), userId, firstName, lastName, employeeId]
      );
    } else if (role === 'parent' && firstName && lastName) {
      await query(
        `INSERT INTO parents (id, user_id, first_name, last_name)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), userId, firstName, lastName]
      );
    }
    
    res.status(201).json({ success: true, message: 'User created', data: { id: userId } });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
});

// Update user
router.put('/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { email, role, isActive, isVerified } = req.body;
    
    await query(
      `UPDATE users SET 
        email = COALESCE($1, email),
        role = COALESCE($2, role),
        is_active = COALESCE($3, is_active),
        is_verified = COALESCE($4, is_verified),
        updated_at = NOW()
       WHERE id = $5`,
      [email, role, isActive, isVerified, req.params.id]
    );
    
    res.json({ success: true, message: 'User updated' });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// Delete user with cascade
router.delete('/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Delete related records first to avoid foreign key constraints
    await query('DELETE FROM students WHERE user_id = $1', [userId]);
    await query('DELETE FROM teachers WHERE user_id = $1', [userId]);
    await query('DELETE FROM parents WHERE user_id = $1', [userId]);
    await query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    await query('DELETE FROM messages WHERE sender_id = $1 OR recipient_id = $1', [userId]);
    
    // Now delete the user
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
});

// Toggle user status
router.patch('/:id/toggle-status', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    await query(
      'UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1',
      [req.params.id]
    );
    res.json({ success: true, message: 'User status toggled' });
  } catch (error) {
    logger.error('Toggle status error:', error);
    res.status(500).json({ success: false, message: 'Error toggling status' });
  }
});

// Reset password
router.patch('/:id/reset-password', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, req.params.id]
    );
    
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
});

export default router;
