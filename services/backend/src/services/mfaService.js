import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { query } from '../config/database.js';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

class MFAService {
  generateSecret(email) {
    const secret = speakeasy.generateSecret({
      name: `${config.security.mfaIssuer} (${email})`,
      issuer: config.security.mfaIssuer,
      length: 32
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url
    };
  }

  async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      return qrCodeDataUrl;
    } catch (error) {
      logger.error('QR Code generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  verifyToken(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps before/after
    });
  }

  async enableMFA(userId, secret) {
    await query(
      'UPDATE users SET mfa_secret = ?, mfa_enabled = TRUE WHERE id = ?',
      [secret, userId]
    );
    logger.info(`MFA enabled for user ${userId}`);
  }

  async disableMFA(userId) {
    await query(
      'UPDATE users SET mfa_secret = NULL, mfa_enabled = FALSE WHERE id = ?',
      [userId]
    );
    logger.info(`MFA disabled for user ${userId}`);
  }

  async isMFAEnabled(userId) {
    const results = await query(
      'SELECT mfa_enabled FROM users WHERE id = ?',
      [userId]
    );

    if (results.length === 0) {
      return false;
    }

    return results[0].mfa_enabled;
  }

  async getMFASecret(userId) {
    const results = await query(
      'SELECT mfa_secret FROM users WHERE id = ?',
      [userId]
    );

    if (results.length === 0 || !results[0].mfa_secret) {
      return null;
    }

    return results[0].mfa_secret;
  }
}

export default new MFAService();
