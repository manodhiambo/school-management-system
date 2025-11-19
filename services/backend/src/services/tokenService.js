import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { query } from '../config/database.js';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';

class TokenService {
  generateAccessToken(payload) {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiry,
      issuer: 'school-management-system'
    });
  }

  generateRefreshToken(payload) {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiry,
      issuer: 'school-management-system'
    });
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.jwt.refreshSecret);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async createSession(userId, refreshToken, deviceInfo = {}, ipAddress = null) {
    const sessionId = uuidv4();
    const tokenHash = await bcrypt.hash(refreshToken, 5);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(
      `INSERT INTO sessions (id, user_id, token_hash, device_info, ip_address, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        userId,
        tokenHash,
        JSON.stringify(deviceInfo),
        ipAddress,
        expiresAt
      ]
    );

    logger.info(`Session created for user ${userId}`);
    return sessionId;
  }

  async validateSession(userId, refreshToken) {
    const sessions = await query(
      `SELECT * FROM sessions WHERE user_id = ? AND expires_at > NOW()`,
      [userId]
    );

    for (const session of sessions) {
      const isValid = await bcrypt.compare(refreshToken, session.token_hash);
      if (isValid) {
        return session;
      }
    }

    return null;
  }

  async revokeSession(sessionId) {
    await query('DELETE FROM sessions WHERE id = ?', [sessionId]);
    logger.info(`Session ${sessionId} revoked`);
  }

  async revokeAllUserSessions(userId) {
    await query('DELETE FROM sessions WHERE user_id = ?', [userId]);
    logger.info(`All sessions revoked for user ${userId}`);
  }

  async cleanupExpiredSessions() {
    const result = await query('DELETE FROM sessions WHERE expires_at < NOW()');
    logger.info(`Cleaned up ${result.affectedRows} expired sessions`);
  }
}

export default new TokenService();
