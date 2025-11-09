const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { query } = require('../config/database');
const logger = require('../utils/logger');

class MFAService {
  static generateSecret(email) {
    const secret = speakeasy.generateSecret({
      name: `SchoolMgmt:${email}`,
      length: 32
    });
    return secret;
  }

  static async generateQRCode(secret) {
    try {
      const otpauthUrl = speakeasy.otpauthURL({
        secret: secret.ascii,
        label: secret.name,
        issuer: 'School Management System'
      });
      
      const qrCode = await QRCode.toDataURL(otpauthUrl);
      return qrCode;
    } catch (error) {
      logger.error('QR Code generation failed:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  static verifyToken(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'ascii',
      token: token,
      window: 2 // Allow 2 time windows (30s each) for clock skew
    });
  }

  static async enableMFA(userId, secret) {
    await query(
      'UPDATE users SET mfa_secret = ?, mfa_enabled = TRUE WHERE id = ?',
      [secret, userId]
    );
  }

  static async disableMFA(userId) {
    await query(
      'UPDATE users SET mfa_secret = NULL, mfa_enabled = FALSE WHERE id = ?',
      [userId]
    );
  }

  static async verifyAndEnableMFA(userId, token, secret) {
    const isValid = this.verifyToken(secret, token);
    
    if (isValid) {
      await this.enableMFA(userId, secret);
      return true;
    }
    
    return false;
  }
}

module.exports = MFAService;
