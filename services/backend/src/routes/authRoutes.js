import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    logger.info(`Login attempt for: ${email}`);
    
    const users = await query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (users.length === 0) {
      logger.warn(`User not found: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    
    const user = users[0];
    logger.info(`User found: ${user.email}, role: ${user.role}`);
    
    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }
    
    if (!user.password) {
      logger.error('User has no password set');
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Invalid password for: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    
    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiresIn }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
    
    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    
    logger.info(`Login successful for: ${email}`);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isActive: user.is_active,
          isVerified: user.is_verified
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, email, role, is_active, is_verified, last_login, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Error fetching user' });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Delete session if exists
    await query('DELETE FROM user_sessions WHERE user_id = $1', [req.user.id]).catch(() => {});
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required' });
    }
    
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    
    const users = await query('SELECT * FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);
    
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    const user = users[0];
    
    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiresIn }
    );
    
    res.json({
      success: true,
      data: { accessToken: newAccessToken }
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// Forgot password — sends a reset link by email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Look up user — always return the same message to prevent email enumeration
    const users = await query(
      'SELECT id, email FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (users.length > 0) {
      const user = users[0];

      // Generate a short-lived JWT as the reset token (1 hour)
      const resetToken = jwt.sign(
        { userId: user.id, email: user.email, purpose: 'password-reset' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      const frontendUrl = process.env.FRONTEND_URL || 'https://skulmanager.org';
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

      try {
        await sendEmail(user.email, 'forgotPassword', {
          name: user.email.split('@')[0],
          resetLink,
        });
      } catch (emailErr) {
        logger.error('Failed to send password reset email:', emailErr);
      }

      logger.info(`Password reset email sent to: ${email}`);
    }

    // Always return success regardless of whether the email exists
    res.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.'
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Error processing request' });
  }
});

// Reset password — validates the JWT token and sets the new password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Verify the JWT reset token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link. Please request a new one.' });
    }

    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ success: false, message: 'Invalid reset token' });
    }

    const users = await query(
      'SELECT id FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(400).json({ success: false, message: 'User not found or account is deactivated' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, decoded.userId]
    );

    logger.info(`Password reset completed for user: ${decoded.email}`);

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
});

// Change password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const users = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const user = users[0];
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, req.user.id]);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Error changing password' });
  }
});

export default router;
