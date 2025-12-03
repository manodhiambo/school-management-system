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
    const { role, is_active, isActive } = req.body;
    
    await query(
      `UPDATE users SET 
        role = COALESCE($1, role), 
        is_active = COALESCE($2, is_active), 
        updated_at = NOW()
       WHERE id = $3`,
      [role, is_active ?? isActive, req.params.id]
    );
    
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// Delete user - with cascade deletion of related records
router.delete('/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    
    logger.info('Deleting user:', userId);
    
    // Check if user exists
    const userCheck = await query('SELECT id, role, email FROM users WHERE id = $1', [userId]);
    if (userCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const user = userCheck[0];
    logger.info('Found user to delete:', user.email, 'role:', user.role);
    
    // Delete related records based on user role
    try {
      // Delete student record if exists
      const studentDelete = await query('DELETE FROM students WHERE user_id = $1 RETURNING id', [userId]);
      if (studentDelete.length > 0) {
        logger.info('Deleted student record:', studentDelete[0].id);
      }
      
      // Delete teacher record if exists
      const teacherDelete = await query('DELETE FROM teachers WHERE user_id = $1 RETURNING id', [userId]);
      if (teacherDelete.length > 0) {
        logger.info('Deleted teacher record:', teacherDelete[0].id);
      }
      
      // Delete parent record if exists
      const parentDelete = await query('DELETE FROM parents WHERE user_id = $1 RETURNING id', [userId]);
      if (parentDelete.length > 0) {
        logger.info('Deleted parent record:', parentDelete[0].id);
      }
      
      // Delete notifications
      await query('DELETE FROM notifications WHERE user_id = $1', [userId]).catch(() => {});
      
      // Delete user sessions
      await query('DELETE FROM user_sessions WHERE user_id = $1', [userId]).catch(() => {});
      
    } catch (relatedError) {
      logger.warn('Error deleting related records:', relatedError.message);
      // Continue with user deletion even if some related deletions fail
    }
    
    // Finally delete the user
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    
    if (result.length === 0) {
      return res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
    
    logger.info('User deleted successfully:', userId);
    
    res.json({ success: true, message: 'User and all related records deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Error deleting user: ' + error.message });
  }
});

// Toggle user active status
router.patch('/:id/toggle-status', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const result = await query(
      `UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING is_active`,
      [req.params.id]
    );
    
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      message: `User ${result[0].is_active ? 'activated' : 'deactivated'} successfully`,
      data: { is_active: result[0].is_active }
    });
  } catch (error) {
    logger.error('Toggle user status error:', error);
    res.status(500).json({ success: false, message: 'Error toggling user status' });
  }
});

// Reset user password
router.patch('/:id/reset-password', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(newPassword || 'password123', 10);
    
    await query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, req.params.id]
    );
    
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
});

export default router;
