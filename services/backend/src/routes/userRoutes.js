import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

router.use(authenticate);
router.use(tenantContext);
router.use(requireActiveTenant);

// Get all users with names — scoped to this tenant
router.get('/', requireRole(['admin']), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const users = await query(`
      SELECT
        u.id, u.email, u.role, u.is_active, u.is_verified, u.last_login, u.created_at,
        COALESCE(s.first_name, t.first_name, p.first_name) as first_name,
        COALESCE(s.last_name, t.last_name, p.last_name) as last_name
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN teachers t ON u.id = t.user_id
      LEFT JOIN parents p ON u.id = p.user_id
      WHERE u.tenant_id = $1
      ORDER BY u.created_at DESC
    `, [tenantId]);
    res.json({ success: true, data: users });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

// Get single user — must belong to same tenant
router.get('/:id', authenticate, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const users = await query(`
      SELECT
        u.id, u.email, u.role, u.is_active, u.is_verified, u.last_login, u.created_at,
        COALESCE(s.first_name, t.first_name, p.first_name) as first_name,
        COALESCE(s.last_name, t.last_name, p.last_name) as last_name
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN teachers t ON u.id = t.user_id
      LEFT JOIN parents p ON u.id = p.user_id
      WHERE u.id = $1 AND u.tenant_id = $2
    `, [req.params.id, tenantId]);

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: users[0] });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Error fetching user' });
  }
});

// Create user — stamped with tenant
router.post('/', requireRole(['admin']), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { email, password, role, firstName, lastName } = req.body;

    // Check if email exists within this tenant
    const existing = await query('SELECT id FROM users WHERE email = $1 AND tenant_id = $2', [email, tenantId]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await query(
      `INSERT INTO users (id, email, password, role, tenant_id, is_active, is_verified)
       VALUES ($1, $2, $3, $4, $5, TRUE, TRUE)`,
      [userId, email, hashedPassword, role, tenantId]
    );

    // Create corresponding profile record with tenant_id
    if (role === 'student' && firstName && lastName) {
      const admissionNumber = `STD${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      await query(
        `INSERT INTO students (id, user_id, tenant_id, first_name, last_name, admission_number)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), userId, tenantId, firstName, lastName, admissionNumber]
      );
    } else if (role === 'teacher' && firstName && lastName) {
      const employeeId = `TCH${new Date().getFullYear()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      await query(
        `INSERT INTO teachers (id, user_id, tenant_id, first_name, last_name, employee_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), userId, tenantId, firstName, lastName, employeeId]
      );
    } else if (role === 'parent' && firstName && lastName) {
      await query(
        `INSERT INTO parents (id, user_id, tenant_id, first_name, last_name)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), userId, tenantId, firstName, lastName]
      );
    }

    res.status(201).json({ success: true, message: 'User created', data: { id: userId } });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
});

// Update user — scoped to tenant
router.put('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { email, role, isActive, isVerified } = req.body;

    const result = await query(
      `UPDATE users SET
        email = COALESCE($1, email),
        role = COALESCE($2, role),
        is_active = COALESCE($3, is_active),
        is_verified = COALESCE($4, is_verified),
        updated_at = NOW()
       WHERE id = $5 AND tenant_id = $6
       RETURNING id`,
      [email, role, isActive, isVerified, req.params.id, tenantId]
    );

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User updated' });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// Delete user with cascade — scoped to tenant
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.params.id;

    // Verify user belongs to this tenant
    const check = await query('SELECT id FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete related records first
    await query('DELETE FROM students WHERE user_id = $1 AND tenant_id = $2', [userId, tenantId]);
    await query('DELETE FROM teachers WHERE user_id = $1 AND tenant_id = $2', [userId, tenantId]);
    await query('DELETE FROM parents WHERE user_id = $1 AND tenant_id = $2', [userId, tenantId]);
    await query('DELETE FROM notifications WHERE user_id = $1 AND tenant_id = $2', [userId, tenantId]);
    await query('DELETE FROM messages WHERE (sender_id = $1 OR recipient_id = $1) AND tenant_id = $2', [userId, tenantId]);

    const result = await query('DELETE FROM users WHERE id = $1 AND tenant_id = $2 RETURNING id', [userId, tenantId]);

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
});

// Toggle user status — scoped to tenant
router.patch('/:id/toggle-status', requireRole(['admin']), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const result = await query(
      'UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [req.params.id, tenantId]
    );
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User status toggled' });
  } catch (error) {
    logger.error('Toggle status error:', error);
    res.status(500).json({ success: false, message: 'Error toggling status' });
  }
});

// Reset password — scoped to tenant
router.patch('/:id/reset-password', requireRole(['admin']), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING id',
      [hashedPassword, req.params.id, tenantId]
    );
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
});

export default router;
