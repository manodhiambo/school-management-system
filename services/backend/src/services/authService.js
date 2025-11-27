import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class AuthService {
  async login(email, password) {
    logger.info(`Login attempt for: ${email}`);
    
    // Find user by email
    const users = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (users.length === 0) {
      logger.warn(`User not found: ${email}`);
      throw new ApiError(401, 'Invalid email or password');
    }

    const user = users[0];
    logger.info(`User found: ${user.email}, role: ${user.role}`);

    // Check if user is active
    if (!user.is_active) {
      throw new ApiError(401, 'Account is deactivated');
    }

    // Verify password
    if (!user.password) {
      logger.error('User has no password set');
      throw new ApiError(401, 'Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Invalid password for: ${email}`);
      throw new ApiError(401, 'Invalid email or password');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Update last login
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Create session
    const sessionId = uuidv4();
    await query(
      `INSERT INTO user_sessions (id, user_id, refresh_token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET refresh_token = $3, expires_at = $4`,
      [sessionId, user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), null, null]
    ).catch(err => {
      // Session table might not exist, that's okay
      logger.warn('Could not create session:', err.message);
    });

    logger.info(`Login successful for: ${email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        isVerified: user.is_verified
      },
      accessToken,
      refreshToken
    };
  }

  async register(userData) {
    const { email, password, role = 'student' } = userData;

    // Check if user exists
    const existingUsers = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUsers.length > 0) {
      throw new ApiError(400, 'Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    await query(
      `INSERT INTO users (id, email, password, role, is_active, is_verified)
       VALUES ($1, $2, $3, $4, true, false)`,
      [userId, email, hashedPassword, role]
    );

    const users = await query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = users[0];

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.is_active,
      isVerified: user.is_verified
    };
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      
      const users = await query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId]
      );

      if (users.length === 0) {
        throw new ApiError(401, 'User not found');
      }

      const user = users[0];
      const newAccessToken = this.generateAccessToken(user);

      return { accessToken: newAccessToken };
    } catch (error) {
      throw new ApiError(401, 'Invalid refresh token');
    }
  }

  async logout(userId) {
    await query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [userId]
    ).catch(err => {
      logger.warn('Could not delete session:', err.message);
    });
    return { message: 'Logged out successfully' };
  }

  async getMe(userId) {
    const users = await query(
      'SELECT id, email, role, is_active, is_verified, last_login, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (users.length === 0) {
      throw new ApiError(404, 'User not found');
    }

    return users[0];
  }

  generateAccessToken(user) {
    return jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiresIn }
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      { userId: user.id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
  }

  async changePassword(userId, currentPassword, newPassword) {
    const users = await query('SELECT * FROM users WHERE id = $1', [userId]);

    if (users.length === 0) {
      throw new ApiError(404, 'User not found');
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );

    return { message: 'Password changed successfully' };
  }
}

export default new AuthService();
