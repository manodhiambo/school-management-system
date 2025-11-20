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
        id, email, role, is_active, last_login, created_at
      FROM users 
      ORDER BY created_at DESC
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

// Delete user
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM users WHERE id = ?', [req.params.id]);
    
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
