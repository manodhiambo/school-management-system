import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { sendEmail } from '../services/emailService.js';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { logAction } from './auditLogRoutes.js';
import { passwordResetLimiter } from '../middleware/rateLimiter.js';
import { findBlacklistMatch } from '../utils/blacklist.js';
import { buildAuditContext } from '../utils/auditContext.js';

const router = express.Router();

// One active session per user — a fresh login/refresh replaces the previous
// row, which is what actually makes /logout and refresh-token revocation work
// (the JWT itself stays valid until natural expiry regardless, so this DB row
// is the only thing that lets us invalidate a refresh token early).
async function upsertSession(userId, refreshToken, req) {
  const { ipAddress, userAgent } = buildAuditContext(req);
  await query(
    `INSERT INTO user_sessions (user_id, refresh_token, expires_at, ip_address, user_agent, updated_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET refresh_token = $2, expires_at = NOW() + INTERVAL '7 days',
           ip_address = $3, user_agent = $4, updated_at = NOW()`,
    [userId, refreshToken, ipAddress || null, userAgent || null]
  ).catch(err => logger.warn('Failed to persist session:', err.message));
}

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.info(`Login attempt for: ${email}`);

    const { ipAddress, userAgent } = buildAuditContext(req);
    const blacklistReason = await findBlacklistMatch(ipAddress, userAgent);
    if (blacklistReason) {
      logger.warn(`Blocked login attempt from blacklisted device: ${ipAddress}`);
      req.user = { email };
      logAction(req, 'login_blocked', 'user', null, { email, reason: 'device_blacklisted', detail: blacklistReason });
      return res.status(403).json({ success: false, message: 'Access from this device has been blocked.' });
    }

    const users = await query(
      'SELECT id, email, password, role, is_active, is_verified, is_blacklisted, tenant_id, totp_enabled, first_name, last_name FROM users WHERE email = $1',
      [email]
    );

    if (users.length === 0) {
      logger.warn(`User not found: ${email}`);
      req.user = { email };
      logAction(req, 'login_failed', 'user', null, { email, reason: 'user_not_found' });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = users[0];
    logger.info(`User found: ${user.email}, role: ${user.role}`);
    req.user = { email: user.email, role: user.role, tenant_id: user.tenant_id || null };

    if (user.is_blacklisted) {
      logAction(req, 'login_blocked', 'user', user.id, { email, reason: 'user_blacklisted' });
      return res.status(403).json({ success: false, message: 'This account has been blocked by the platform administrator.' });
    }

    if (!user.is_active) {
      logAction(req, 'login_failed', 'user', user.id, { email, reason: 'account_deactivated' });
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    if (!user.password) {
      logger.error('User has no password set');
      logAction(req, 'login_failed', 'user', user.id, { email, reason: 'no_password_set' });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Invalid password for: ${email}`);
      logAction(req, 'login_failed', 'user', user.id, { email, reason: 'invalid_password' });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Back-fill tenant_id for parent/student accounts created before it was stored on users
    if (!user.tenant_id && (user.role === 'parent' || user.role === 'student')) {
      let backfillTid = null;
      if (user.role === 'parent') {
        const rows = await query('SELECT tenant_id FROM parents WHERE user_id = $1 LIMIT 1', [user.id]);
        if (rows.length > 0) backfillTid = rows[0].tenant_id;
      } else {
        const rows = await query('SELECT tenant_id FROM students WHERE user_id = $1 LIMIT 1', [user.id]);
        if (rows.length > 0) backfillTid = rows[0].tenant_id;
      }
      if (backfillTid) {
        user.tenant_id = backfillTid;
        query('UPDATE users SET tenant_id = $1 WHERE id = $2', [backfillTid, user.id])
          .catch(err => logger.warn('Failed to back-fill tenant_id for ' + user.role + ':', err.message));
      }
    }

    // Resolve first_name / last_name for roles whose names live in profile tables
    if (!user.first_name) {
      try {
        let nameRow = null;
        if (user.role === 'parent') {
          const rows = await query('SELECT first_name, last_name FROM parents WHERE user_id = $1 LIMIT 1', [user.id]);
          if (rows.length) nameRow = rows[0];
        } else if (user.role === 'student') {
          const rows = await query('SELECT first_name, last_name FROM students WHERE user_id = $1 LIMIT 1', [user.id]);
          if (rows.length) nameRow = rows[0];
        }
        if (nameRow) {
          user.first_name = nameRow.first_name;
          user.last_name  = nameRow.last_name;
          // Persist to users table so future logins skip this lookup
          query('UPDATE users SET first_name=$1, last_name=$2 WHERE id=$3', [nameRow.first_name, nameRow.last_name, user.id]).catch(() => {});
        }
      } catch { /* non-critical */ }
    }

    // For non-superadmin users, check tenant status
    let tenantStatus = null;
    let tenantDisabledModules = [];
    if (user.role !== 'superadmin' && user.tenant_id) {
      const tenantRows = await query(
        'SELECT status, disabled_modules FROM tenants WHERE id = $1',
        [user.tenant_id]
      );
      if (tenantRows.length > 0) {
        tenantStatus = tenantRows[0].status;
        tenantDisabledModules = Array.isArray(tenantRows[0].disabled_modules) ? tenantRows[0].disabled_modules : [];
        if (tenantStatus === 'suspended') {
          logAction(req, 'login_blocked', 'user', user.id, { email, reason: 'tenant_suspended' });
          return res.status(403).json({
            success: false,
            message: 'School account is suspended. Please contact Helvino Technologies Limited at helvinotechltd@gmail.com or 0703445756.'
          });
        }
        if (tenantStatus === 'expired') {
          logAction(req, 'login_blocked', 'user', user.id, { email, reason: 'tenant_expired' });
          return res.status(403).json({
            success: false,
            message: 'School subscription has expired. Please renew to continue.'
          });
        }
        if (tenantStatus === 'pending') {
          logAction(req, 'login_blocked', 'user', user.id, { email, reason: 'tenant_pending' });
          return res.status(403).json({
            success: false,
            message: 'School registration is pending payment. Please complete payment to activate.'
          });
        }
      }
    }

    // If admin has 2FA enabled, issue a short-lived challenge token instead of full JWT
    if (user.role === 'admin' && user.totp_enabled) {
      const tempToken = jwt.sign(
        { userId: user.id, purpose: '2fa-pending' },
        config.jwt.secret,
        { expiresIn: '5m' }
      );
      return res.json({ success: true, requires_2fa: true, temp_token: tempToken });
    }

    // Generate tokens — include tenant_id in JWT payload
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiresIn }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    // Update last login — fire and forget, don't block the response
    query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id])
      .catch(err => logger.warn('Failed to update last_login:', err.message));
    upsertSession(user.id, refreshToken, req);

    // Audit log — fire and forget
    req.user = { id: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id };
    logAction(req, 'login', 'user', user.id, { email: user.email });

    logger.info(`Login successful for: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenant_id: user.tenant_id,
          first_name: user.first_name || null,
          last_name: user.last_name || null,
          isActive: user.is_active,
          isVerified: user.is_verified,
          disabled_modules: tenantDisabledModules
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
    await query('DELETE FROM user_sessions WHERE user_id = $1', [req.user.id]).catch(() => {});
    logAction(req, 'logout', 'user', req.user.id, { email: req.user.email });
    res.json({ success: true, message: 'Logged out successfully' });
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

    // The JWT signature alone doesn't reflect logout — check it against the
    // session row too, since that's what /logout actually deletes.
    const sessions = await query(
      `SELECT 1 FROM user_sessions WHERE user_id = $1 AND refresh_token = $2 AND expires_at > NOW()`,
      [decoded.userId, refreshToken]
    );
    if (sessions.length === 0) {
      return res.status(401).json({ success: false, message: 'Session expired or logged out. Please log in again.' });
    }

    const users = await query('SELECT * FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const user = users[0];

    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiresIn }
    );

    // Rotate the refresh token so a stolen one only works for a single refresh cycle.
    const newRefreshToken = jwt.sign(
      { userId: user.id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
    await upsertSession(user.id, newRefreshToken, req);

    res.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken }
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// Forgot password — sends a reset link by email
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
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
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters and contain letters and numbers' });
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

    const hashedPassword = await bcrypt.hash(newPassword, 12);
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

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters and contain letters and numbers' });
    }

    const users = await query('SELECT id, password FROM users WHERE id = $1', [req.user.id]);

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
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

// ── 2FA ENDPOINTS ──────────────────────────────────────────────────────────────

// Get 2FA status for current user
router.get('/2fa/status', authenticate, async (req, res) => {
  try {
    const rows = await query('SELECT totp_enabled FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true, data: { enabled: rows[0]?.totp_enabled || false } });
  } catch (error) {
    logger.error('2FA status error:', error);
    res.status(500).json({ success: false, message: 'Error fetching 2FA status' });
  }
});

// Generate a new TOTP secret and QR code (admin only; does NOT save yet)
router.get('/2fa/setup', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only administrators can set up 2FA' });
  }
  try {
    const secret = speakeasy.generateSecret({
      name: `SkulManager (${req.user.email})`,
      issuer: 'SkulManager',
      length: 20,
    });
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ success: true, data: { secret: secret.base32, qr_code: qrCode } });
  } catch (error) {
    logger.error('2FA setup error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate 2FA setup' });
  }
});

// Verify code and enable 2FA — saves secret and returns backup codes
router.post('/2fa/enable', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only administrators can enable 2FA' });
  }
  const { secret, code } = req.body;
  if (!secret || !code) {
    return res.status(400).json({ success: false, message: 'Secret and verification code are required' });
  }
  try {
    const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: code.replace(/\s/g, ''), window: 1 });
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Invalid code. Make sure your authenticator app time is correct.' });
    }

    // Generate 8 one-time backup codes
    const plainBackupCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
      Math.random().toString(36).substring(2, 6).toUpperCase()
    );
    const hashedBackupCodes = await Promise.all(
      plainBackupCodes.map(async (c) => ({ code: await bcrypt.hash(c, 12), used: false }))
    );

    await query(
      'UPDATE users SET totp_secret = $1, totp_enabled = true, totp_backup_codes = $2 WHERE id = $3',
      [secret, JSON.stringify(hashedBackupCodes), req.user.id]
    );

    logger.info(`2FA enabled for user: ${req.user.email}`);
    res.json({ success: true, message: '2FA enabled successfully', data: { backup_codes: plainBackupCodes } });
  } catch (error) {
    logger.error('2FA enable error:', error);
    res.status(500).json({ success: false, message: 'Failed to enable 2FA' });
  }
});

// Disable 2FA — requires current password
router.post('/2fa/disable', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only administrators can disable 2FA' });
  }
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: 'Current password is required to disable 2FA' });
  }
  try {
    const rows = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password))) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }
    await query(
      "UPDATE users SET totp_secret = NULL, totp_enabled = false, totp_backup_codes = '[]'::jsonb WHERE id = $1",
      [req.user.id]
    );
    logger.info(`2FA disabled for user: ${req.user.email}`);
    res.json({ success: true, message: '2FA has been disabled' });
  } catch (error) {
    logger.error('2FA disable error:', error);
    res.status(500).json({ success: false, message: 'Failed to disable 2FA' });
  }
});

// Validate TOTP code during login (accepts temp_token from login response)
router.post('/2fa/validate', async (req, res) => {
  const { temp_token, code } = req.body;
  if (!temp_token || !code) {
    return res.status(400).json({ success: false, message: 'Session token and code are required' });
  }
  try {
    let decoded;
    try {
      decoded = jwt.verify(temp_token, config.jwt.secret);
    } catch {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    if (decoded.purpose !== '2fa-pending') {
      return res.status(401).json({ success: false, message: 'Invalid session token' });
    }

    const rows = await query(
      'SELECT id, email, role, tenant_id, is_active, is_verified, totp_secret, totp_backup_codes, first_name, last_name FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    const user = rows[0];
    const trimmedCode = code.replace(/\s/g, '');

    // Try TOTP first
    const totpValid = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token: trimmedCode,
      window: 1,
    });

    if (!totpValid) {
      // Try backup codes
      const backupCodes = Array.isArray(user.totp_backup_codes) ? user.totp_backup_codes : [];
      let backupUsed = false;
      const updatedCodes = [...backupCodes];

      for (let i = 0; i < updatedCodes.length; i++) {
        if (!updatedCodes[i].used && await bcrypt.compare(trimmedCode.toUpperCase(), updatedCodes[i].code)) {
          updatedCodes[i] = { ...updatedCodes[i], used: true };
          backupUsed = true;
          break;
        }
      }

      if (!backupUsed) {
        return res.status(401).json({ success: false, message: 'Invalid authentication code' });
      }

      await query('UPDATE users SET totp_backup_codes = $1 WHERE id = $2', [JSON.stringify(updatedCodes), user.id]);
    }

    // Issue full tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiresIn }
    );
    const refreshToken = jwt.sign(
      { userId: user.id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]).catch(() => {});
    upsertSession(user.id, refreshToken, req);
    logger.info(`2FA validated, login successful: ${user.email}`);

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id, first_name: user.first_name || null, last_name: user.last_name || null, isActive: user.is_active, isVerified: user.is_verified },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('2FA validate error:', error);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
});

export default router;
