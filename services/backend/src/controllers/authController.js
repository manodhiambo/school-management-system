import authService from '../services/authService.js';
import mfaService from '../services/mfaService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

class AuthController {
  register = asyncHandler(async (req, res) => {
    const userData = req.body;
    const user = await authService.register(userData);

    res.status(201).json(
      new ApiResponse(201, user, 'User registered successfully')
    );
  });

  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      platform: req.headers['sec-ch-ua-platform']
    };
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await authService.login(email, password, deviceInfo, ipAddress);

    if (result.requiresMFA) {
      return res.status(200).json(
        new ApiResponse(200, {
          requiresMFA: true,
          userId: result.userId
        }, 'MFA verification required')
      );
    }

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json(
      new ApiResponse(200, {
        accessToken: result.accessToken,
        user: result.user
      }, 'Login successful')
    );
  });

  loginWithMFA = asyncHandler(async (req, res) => {
    const { userId, mfaToken } = req.body;

    const result = await authService.loginWithMFA(userId, mfaToken);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json(
      new ApiResponse(200, {
        accessToken: result.accessToken,
        user: result.user
      }, 'Login successful')
    );
  });

  refreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      throw new ApiError(401, 'Refresh token not provided');
    }

    const result = await authService.refreshToken(refreshToken);

    res.status(200).json(
      new ApiResponse(200, result, 'Token refreshed successfully')
    );
  });

  logout = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      await authService.logout(req.user.id, refreshToken);
    }

    res.clearCookie('refreshToken');

    res.status(200).json(
      new ApiResponse(200, null, 'Logout successful')
    );
  });

  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);

    res.status(200).json(
      new ApiResponse(200, result, 'Password reset instructions sent')
    );
  });

  resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    const result = await authService.resetPassword(token, newPassword);

    res.status(200).json(
      new ApiResponse(200, result, 'Password reset successful')
    );
  });

  changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const result = await authService.changePassword(
      req.user.id,
      oldPassword,
      newPassword
    );

    res.status(200).json(
      new ApiResponse(200, result, 'Password changed successfully')
    );
  });

  getCurrentUser = asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.id);

    res.status(200).json(
      new ApiResponse(200, user, 'User data retrieved successfully')
    );
  });

  // MFA endpoints
  setupMFA = asyncHandler(async (req, res) => {
    const { email } = req.user;

    const { secret, otpauthUrl } = mfaService.generateSecret(email);
    const qrCode = await mfaService.generateQRCode(otpauthUrl);

    res.status(200).json(
      new ApiResponse(200, {
        secret,
        qrCode
      }, 'MFA setup initiated. Scan QR code with authenticator app')
    );
  });

  enableMFA = asyncHandler(async (req, res) => {
    const { secret, token } = req.body;

    // Verify the token before enabling
    const isValid = mfaService.verifyToken(secret, token);

    if (!isValid) {
      throw new ApiError(400, 'Invalid MFA token');
    }

    await mfaService.enableMFA(req.user.id, secret);

    res.status(200).json(
      new ApiResponse(200, null, 'MFA enabled successfully')
    );
  });

  disableMFA = asyncHandler(async (req, res) => {
    const { password } = req.body;

    // Verify password before disabling MFA
    const users = await query(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      throw new ApiError(404, 'User not found');
    }

    const isValid = await passwordService.comparePassword(
      password,
      users[0].password_hash
    );

    if (!isValid) {
      throw new ApiError(401, 'Invalid password');
    }

    await mfaService.disableMFA(req.user.id);

    res.status(200).json(
      new ApiResponse(200, null, 'MFA disabled successfully')
    );
  });

  verifyMFA = asyncHandler(async (req, res) => {
    const { token } = req.body;

    const secret = await mfaService.getMFASecret(req.user.id);

    if (!secret) {
      throw new ApiError(400, 'MFA not enabled for this user');
    }

    const isValid = mfaService.verifyToken(secret, token);

    res.status(200).json(
      new ApiResponse(200, { isValid }, 'MFA token verified')
    );
  });
}

export default new AuthController();
