const { query } = require('../config/database');
const TokenService = require('../services/token.service');
const PasswordService = require('../services/password.service');
const MFAService = require('../services/mfa.service');
const ImpersonationService = require('../services/impersonation.service');
const EmailService = require('../services/email.service');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(['admin', 'teacher', 'student', 'parent'])
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8)
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8)
});

const mfaSetupSchema = z.object({
  token: z.string().length(6)
});

class AuthController {
  static async login(req, res) {
    try {
      const { email, password, role } = loginSchema.parse(req.body);

      const [user] = await query(
        'SELECT id, email, password_hash, role, mfa_enabled, is_active FROM users WHERE email = ? AND role = ?',
        [email, role]
      );

      if (!user || !user.is_active) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials or user not active' 
        });
      }

      const isPasswordValid = await PasswordService.verifyPassword(user.password_hash, password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }

      // Update last login
      await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

      const tokens = TokenService.generateTokens(user.id, user.role);

      if (user.mfa_enabled) {
        // Store tokens temporarily until MFA verified
        await TokenService.storeRefreshToken(user.id, tokens.refreshToken);
        
        return res.status(200).json({
          success: true,
          message: 'MFA verification required',
          mfa_required: true,
          temp_access_token: tokens.accessToken
        });
      }

      await TokenService.storeRefreshToken(user.id, tokens.refreshToken);

      // Set httpOnly cookies
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      logger.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Login failed' 
      });
    }
  }

  static async logout(req, res) {
    try {
      await TokenService.revokeRefreshToken(req.user.id);
      
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      
      res.status(200).json({ 
        success: true, 
        message: 'Logout successful' 
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Logout failed' 
      });
    }
  }

  static async refreshToken(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({ 
          success: false, 
          message: 'No refresh token provided' 
        });
      }

      const isValid = await TokenService.verifyRefreshToken(refreshToken);
      
      if (!isValid) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid or expired refresh token' 
        });
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const newAccessToken = TokenService.generateAccessToken(decoded.userId, decoded.role);

      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000
      });

      res.status(200).json({ 
        success: true, 
        message: 'Token refreshed successfully' 
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(401).json({ 
        success: false, 
        message: 'Token refresh failed' 
      });
    }
  }

  static async forgotPassword(req, res) {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      
      const [user] = await query(
        'SELECT id, email FROM users WHERE email = ?',
        [email]
      );

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      await query(
        'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
        [resetToken, resetTokenExpiry, user.id]
      );

      await EmailService.sendPasswordResetEmail(user.email, resetToken);

      res.status(200).json({ 
        success: true, 
        message: 'Password reset email sent' 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      logger.error('Forgot password error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to process request' 
      });
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);

      const [user] = await query(
        'SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
        [token]
      );

      if (!user) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid or expired reset token' 
        });
      }

      const passwordValidation = PasswordService.validatePassword(newPassword);
      if (!passwordValidation.success) {
        return res.status(400).json({ 
          success: false, 
          message: 'Password does not meet requirements',
          errors: passwordValidation.error.errors 
        });
      }

      const hashedPassword = await PasswordService.hashPassword(newPassword);

      await query(
        'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
        [hashedPassword, user.id]
      );

      res.status(200).json({ 
        success: true, 
        message: 'Password reset successful' 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      logger.error('Reset password error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Password reset failed' 
      });
    }
  }

  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

      const [user] = await query(
        'SELECT password_hash FROM users WHERE id = ?',
        [req.user.id]
      );

      const isCurrentPasswordValid = await PasswordService.verifyPassword(
        user.password_hash, 
        currentPassword
      );

      if (!isCurrentPasswordValid) {
        return res.status(400).json({ 
          success: false, 
          message: 'Current password is incorrect' 
        });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({ 
          success: false, 
          message: 'New password must be different from current password' 
        });
      }

      const passwordValidation = PasswordService.validatePassword(newPassword);
      if (!passwordValidation.success) {
        return res.status(400).json({ 
          success: false, 
          message: 'Password does not meet requirements',
          errors: passwordValidation.error.errors 
        });
      }

      const hashedPassword = await PasswordService.hashPassword(newPassword);

      await query(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [hashedPassword, req.user.id]
      );

      // Revoke all tokens for security
      await TokenService.revokeAllUserTokens(req.user.id);

      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      res.status(200).json({ 
        success: true, 
        message: 'Password changed successfully. Please login again.' 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      logger.error('Change password error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Password change failed' 
      });
    }
  }

  static async getCurrentUser(req, res) {
    try {
      const [user] = await query(
        'SELECT id, email, role, mfa_enabled, last_login, created_at FROM users WHERE id = ?',
        [req.user.id]
      );

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch user profile' 
      });
    }
  }

  static async setupMFA(req, res) {
    try {
      const userId = req.user.id;
      const [user] = await query(
        'SELECT email, mfa_enabled FROM users WHERE id = ?',
        [userId]
      );

      if (user.mfa_enabled) {
        return res.status(400).json({ 
          success: false, 
          message: 'MFA is already enabled' 
        });
      }

      const secret = MFAService.generateSecret(user.email);
      const qrCode = await MFAService.generateQRCode(secret);

      // Store secret temporarily in Redis (expires in 10 minutes)
      const { createClient } = require('redis');
      const redis = createClient({
        url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
      });
      await redis.connect();
      
      await redis.setEx(`mfa_setup:${userId}`, 600, secret.ascii);

      res.status(200).json({
        success: true,
        data: {
          qrCode,
          secret: secret.ascii,
          message: 'Scan this QR code with your authenticator app'
        }
      });
    } catch (error) {
      logger.error('MFA setup error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'MFA setup failed' 
      });
    }
  }

  static async verifyMFA(req, res) {
    try {
      const { token } = mfaSetupSchema.parse(req.body);
      const userId = req.user.id;

      const { createClient } = require('redis');
      const redis = createClient({
        url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
      });
      await redis.connect();
      
      const secret = await redis.get(`mfa_setup:${userId}`);
      
      if (!secret) {
        return res.status(400).json({ 
          success: false, 
          message: 'MFA setup expired. Please start again.' 
        });
      }

      const isValid = await MFAService.verifyAndEnableMFA(userId, token, secret);
      
      if (isValid) {
        await redis.del(`mfa_setup:${userId}`);
        
        res.status(200).json({ 
          success: true, 
          message: 'MFA enabled successfully' 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid MFA token' 
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      logger.error('MFA verification error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'MFA verification failed' 
      });
    }
  }

  static async impersonateUser(req, res) {
    try {
      const { userId } = req.params;
      
      const result = await ImpersonationService.startImpersonation(req.user.id, userId);
      
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000 // 1 hour for impersonation
      });

      res.cookie('impersonation', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000
      });

      res.status(200).json({
        success: true,
        message: `Impersonating ${result.targetUser.email}`,
        user: result.targetUser
      });
    } catch (error) {
      logger.error('Impersonation error:', error);
      res.status(403).json({ 
        success: false, 
        message: error.message || 'Impersonation failed' 
      });
    }
  }

  static async stopImpersonation(req, res) {
    try {
      const result = await ImpersonationService.stopImpersonation(req.user.id);
      
      res.clearCookie('impersonation');
      
      res.status(200).json(result);
    } catch (error) {
      logger.error('Stop impersonation error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to stop impersonation' 
      });
    }
  }
}

module.exports = AuthController;
