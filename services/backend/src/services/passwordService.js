import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../config/env.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

class PasswordService {
  async hashPassword(password) {
    return await bcrypt.hash(password, config.security.bcryptRounds);
  }

  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  validatePasswordStrength(password) {
    const errors = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async createPasswordResetToken(userId) {
    const token = this.generateResetToken();
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      `INSERT INTO password_resets (id, user_id, token, expires_at, used)
       VALUES (?, ?, ?, ?, ?)`,
      [tokenId, userId, token, expiresAt, false]
    );

    logger.info(`Password reset token created for user ${userId}`);
    return token;
  }

  async validateResetToken(token) {
    const results = await query(
      `SELECT * FROM password_resets 
       WHERE token = ? AND expires_at > NOW() AND used = FALSE`,
      [token]
    );

    if (results.length === 0) {
      return null;
    }

    return results[0];
  }

  async markResetTokenAsUsed(token) {
    await query(
      'UPDATE password_resets SET used = TRUE WHERE token = ?',
      [token]
    );
    logger.info('Password reset token marked as used');
  }

  async changePassword(userId, newPassword) {
    const validation = this.validatePasswordStrength(newPassword);
    
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const hashedPassword = await this.hashPassword(newPassword);
    
    await query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, userId]
    );

    logger.info(`Password changed for user ${userId}`);
  }

  async cleanupExpiredTokens() {
    const result = await query(
      'DELETE FROM password_resets WHERE expires_at < NOW() OR used = TRUE'
    );
    logger.info(`Cleaned up ${result.affectedRows} expired reset tokens`);
  }
}

export default new PasswordService();
