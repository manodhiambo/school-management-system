import express from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import { sendEmail } from '../services/emailService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// User changes their own password
router.post('/change', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get current user
    const users = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );

    logger.info(`User ${userId} changed their password`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Error changing password' });
  }
});

// Admin resets user password
router.post('/reset/:userId', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword, sendEmail: shouldSendEmail } = req.body;

    // Generate random password if not provided
    const tempPassword = newPassword || generateRandomPassword();

    // Get user info
    const users = await query(`
      SELECT u.*, 
        COALESCE(s.first_name, t.first_name, p.first_name, 'User') as first_name,
        COALESCE(s.last_name, t.last_name, p.last_name, '') as last_name
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN teachers t ON u.id = t.user_id
      LEFT JOIN parents p ON u.id = p.user_id
      WHERE u.id = $1
    `, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Update password
    await query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );

    // Send email notification if requested
    if (shouldSendEmail !== false && user.email) {
      await sendEmail(user.email, 'passwordReset', {
        name: `${user.first_name} ${user.last_name}`.trim(),
        tempPassword,
        isNewPassword: false
      });
    }

    logger.info(`Admin ${req.user.id} reset password for user ${userId}`);

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        tempPassword,
        emailSent: shouldSendEmail !== false && !!user.email
      }
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
});

// Admin bulk reset passwords
router.post('/reset-bulk', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { userIds, sendEmail: shouldSendEmail } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    const results = [];

    for (const userId of userIds) {
      try {
        const tempPassword = generateRandomPassword();

        // Get user info
        const users = await query(`
          SELECT u.*, 
            COALESCE(s.first_name, t.first_name, p.first_name, 'User') as first_name,
            COALESCE(s.last_name, t.last_name, p.last_name, '') as last_name
          FROM users u
          LEFT JOIN students s ON u.id = s.user_id
          LEFT JOIN teachers t ON u.id = t.user_id
          LEFT JOIN parents p ON u.id = p.user_id
          WHERE u.id = $1
        `, [userId]);

        if (users.length === 0) {
          results.push({ userId, success: false, error: 'User not found' });
          continue;
        }

        const user = users[0];

        // Hash and update password
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        await query(
          'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
          [hashedPassword, userId]
        );

        // Send email if requested
        if (shouldSendEmail !== false && user.email) {
          await sendEmail(user.email, 'passwordReset', {
            name: `${user.first_name} ${user.last_name}`.trim(),
            tempPassword,
            isNewPassword: false
          });
        }

        results.push({
          userId,
          email: user.email,
          success: true,
          tempPassword,
          emailSent: shouldSendEmail !== false && !!user.email
        });
      } catch (err) {
        results.push({ userId, success: false, error: err.message });
      }
    }

    logger.info(`Admin ${req.user.id} bulk reset passwords for ${userIds.length} users`);

    res.json({
      success: true,
      message: `Processed ${results.length} password resets`,
      data: results
    });
  } catch (error) {
    logger.error('Bulk reset password error:', error);
    res.status(500).json({ success: false, message: 'Error resetting passwords' });
  }
});

// Generate random password helper
function generateRandomPassword(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default router;
