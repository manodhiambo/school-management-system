import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../utils/ApiError.js';
import tokenService from './tokenService.js';
import passwordService from './passwordService.js';
import mfaService from './mfaService.js';
import logger from '../utils/logger.js';

class AuthService {
  async register(userData) {
    const { email, password, role, firstName, lastName } = userData;

    // Check if user already exists
    const existingUsers = await query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      throw new ApiError(400, 'User with this email already exists');
    }

    // Validate password strength
    const validation = passwordService.validatePasswordStrength(password);
    if (!validation.isValid) {
      throw new ApiError(400, validation.errors.join(', '));
    }

    // Hash password
    const hashedPassword = await passwordService.hashPassword(password);

    // Create user
    const userId = uuidv4();
    await query(
      `INSERT INTO users (id, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, email, hashedPassword, role, true]
    );

    // Create role-specific profile
    await this.createRoleProfile(userId, role, { firstName, lastName });

    logger.info(`New user registered: ${email} with role ${role}`);

    return {
      id: userId,
      email,
      role
    };
  }

  async login(email, password, deviceInfo = {}, ipAddress = null) {
    // Get user
    const users = await query(
      'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );

    if (users.length === 0) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await passwordService.comparePassword(
      password,
      user.password_hash
    );

    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Check if MFA is enabled
    if (user.mfa_enabled) {
      return {
        requiresMFA: true,
        userId: user.id,
        email: user.email
      };
    }

    // Generate tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = tokenService.generateAccessToken(tokenPayload);
    const refreshToken = tokenService.generateRefreshToken(tokenPayload);

    // Create session
    await tokenService.createSession(user.id, refreshToken, deviceInfo, ipAddress);

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    logger.info(`User logged in: ${email}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  }

  async loginWithMFA(userId, mfaToken) {
    // Get user
    const users = await query(
      'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
      [userId]
    );

    if (users.length === 0) {
      throw new ApiError(401, 'User not found');
    }

    const user = users[0];

    // Verify MFA token
    const isValid = mfaService.verifyToken(user.mfa_secret, mfaToken);

    if (!isValid) {
      throw new ApiError(401, 'Invalid MFA token');
    }

    // Generate tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = tokenService.generateAccessToken(tokenPayload);
    const refreshToken = tokenService.generateRefreshToken(tokenPayload);

    // Create session
    await tokenService.createSession(user.id, refreshToken);

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    logger.info(`User logged in with MFA: ${user.email}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  }

  async refreshToken(refreshToken) {
    // Verify refresh token
    const decoded = tokenService.verifyRefreshToken(refreshToken);

    // Validate session
    const session = await tokenService.validateSession(decoded.id, refreshToken);

    if (!session) {
      throw new ApiError(401, 'Invalid session');
    }

    // Get user
    const users = await query(
      'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.id]
    );

    if (users.length === 0) {
      throw new ApiError(401, 'User not found');
    }

    const user = users[0];

    // Generate new access token
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = tokenService.generateAccessToken(tokenPayload);

    return { accessToken };
  }

  async logout(userId, refreshToken) {
    // Find and revoke session
    const session = await tokenService.validateSession(userId, refreshToken);

    if (session) {
      await tokenService.revokeSession(session.id);
    }

    logger.info(`User logged out: ${userId}`);
  }

  async createRoleProfile(userId, role, data) {
    const { firstName, lastName } = data;

    switch (role) {
      case 'student':
        const studentId = uuidv4();
        const admissionNumber = `STU${Date.now().toString().slice(-6)}`;
        await query(
          `INSERT INTO students (id, user_id, admission_number, first_name, last_name, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [studentId, userId, admissionNumber, firstName, lastName, 'active']
        );
        break;

      case 'teacher':
        const teacherId = uuidv4();
        const employeeId = `TCH${Date.now().toString().slice(-6)}`;
        await query(
          `INSERT INTO teachers (id, user_id, employee_id, first_name, last_name, date_of_joining, status)
           VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
          [teacherId, userId, employeeId, firstName, lastName, 'active']
        );
        break;

      case 'parent':
        const parentId = uuidv4();
        await query(
          `INSERT INTO parents (id, user_id, first_name, last_name, phone_primary)
           VALUES (?, ?, ?, ?, ?)`,
          [parentId, userId, firstName, lastName, data.phone || '0000000000']
        );
        break;

      default:
        // Admin doesn't need additional profile
        break;
    }
  }

  async forgotPassword(email) {
    const users = await query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      // Don't reveal if user exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const user = users[0];
    const resetToken = await passwordService.createPasswordResetToken(user.id);

    // TODO: Send email with reset link
    logger.info(`Password reset token generated for ${email}: ${resetToken}`);

    return {
      message: 'If the email exists, a reset link has been sent',
      resetToken // Remove this in production, only for testing
    };
  }

  async resetPassword(token, newPassword) {
    const resetRecord = await passwordService.validateResetToken(token);

    if (!resetRecord) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }

    await passwordService.changePassword(resetRecord.user_id, newPassword);
    await passwordService.markResetTokenAsUsed(token);

    // Revoke all sessions
    await tokenService.revokeAllUserSessions(resetRecord.user_id);

    logger.info(`Password reset completed for user ${resetRecord.user_id}`);

    return { message: 'Password reset successful' };
  }

  async changePassword(userId, oldPassword, newPassword) {
    const users = await query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      throw new ApiError(404, 'User not found');
    }

    const user = users[0];

    // Verify old password
    const isValid = await passwordService.comparePassword(
      oldPassword,
      user.password_hash
    );

    if (!isValid) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    await passwordService.changePassword(userId, newPassword);

    logger.info(`Password changed for user ${userId}`);

    return { message: 'Password changed successfully' };
  }

  async getCurrentUser(userId) {
    const users = await query(
      `SELECT id, email, role, mfa_enabled, last_login, created_at 
       FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      throw new ApiError(404, 'User not found');
    }

    const user = users[0];

    // Get role-specific profile
    let profile = null;

    switch (user.role) {
      case 'student':
        const students = await query(
          'SELECT * FROM students WHERE user_id = ?',
          [userId]
        );
        profile = students[0] || null;
        break;

      case 'teacher':
        const teachers = await query(
          'SELECT * FROM teachers WHERE user_id = ?',
          [userId]
        );
        profile = teachers[0] || null;
        break;

      case 'parent':
        const parents = await query(
          'SELECT * FROM parents WHERE user_id = ?',
          [userId]
        );
        profile = parents[0] || null;
        break;
    }

    return {
      ...user,
      profile
    };
  }
}

export default new AuthService();
