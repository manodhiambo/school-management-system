const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');
const logger = require('../utils/logger');

class TokenService {
  static generateAccessToken(userId, role) {
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY }
    );
  }

  static generateRefreshToken(userId) {
    const token = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY }
    );
    return token;
  }

  static generateTokens(userId, role) {
    const accessToken = this.generateAccessToken(userId, role);
    const refreshToken = this.generateRefreshToken(userId);
    return { accessToken, refreshToken };
  }

  static async storeRefreshToken(userId, refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    await query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at) 
       VALUES (UUID(), ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [userId, tokenHash]
    );
  }

  static async verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      const [session] = await query(
        'SELECT * FROM sessions WHERE user_id = ? AND token_hash = ? AND expires_at > NOW()',
        [decoded.userId, tokenHash]
      );
      
      return !!session;
    } catch (error) {
      logger.error('Refresh token verification failed:', error);
      return false;
    }
  }

  static async revokeRefreshToken(userId) {
    await query('DELETE FROM sessions WHERE user_id = ?', [userId]);
  }

  static async revokeAllUserTokens(userId) {
    await query('DELETE FROM sessions WHERE user_id = ?', [userId]);
  }
}

module.exports = TokenService;
