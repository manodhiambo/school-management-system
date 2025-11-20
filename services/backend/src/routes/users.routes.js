import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await query(`
      SELECT 
        u.id, u.email, u.role, u.is_active, u.last_login, u.created_at,
        CASE 
          WHEN u.role = 'student' THEN CONCAT(s.first_name, ' ', s.last_name)
          WHEN u.role = 'teacher' THEN CONCAT(t.first_name, ' ', t.last_name)
          WHEN u.role = 'parent' THEN CONCAT(p.first_name, ' ', p.last_name)
          ELSE NULL
        END as full_name
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id AND u.role = 'student'
      LEFT JOIN teachers t ON u.id = t.user_id AND u.role = 'teacher'
      LEFT JOIN parents p ON u.id = p.user_id AND u.role = 'parent'
      ORDER BY u.created_at DESC
    `);
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

// Create user (admin only)
router.post('/', authenticate, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    // Check if user exists
    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await query(
      'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [userId, email, hashedPassword, role]
    );
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id: userId, email, role }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
});

// Update user status
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { is_active } = req.body;
    
    await query('UPDATE users SET is_active = ? WHERE id = ?', [is_active, req.params.id]);
    
    res.json({
      success: true,
      message: 'User status updated successfully'
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ success: false, message: 'Error updating user status' });
  }
});

// Reset password
router.post('/:id/reset-password', authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, req.params.id]);
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
});

// Delete user - CASCADE delete related records
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get user role
    const users = await query('SELECT role FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const role = users[0].role;
    
    // Delete role-specific records first
    if (role === 'student') {
      await query('DELETE FROM students WHERE user_id = ?', [userId]);
    } else if (role === 'teacher') {
      await query('DELETE FROM teachers WHERE user_id = ?', [userId]);
    } else if (role === 'parent') {
      await query('DELETE FROM parents WHERE user_id = ?', [userId]);
    }
    
    // Delete user account
    await query('DELETE FROM users WHERE id = ?', [userId]);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
});

export default router;
