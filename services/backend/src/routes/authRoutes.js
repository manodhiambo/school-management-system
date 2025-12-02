import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

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
