const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { mfaMiddleware } = require('../middleware/mfa.middleware');

// Public routes
router.post('/login', AuthController.login);
router.post('/logout', authMiddleware, AuthController.logout);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password/:token', AuthController.resetPassword);

// Protected routes
router.post('/change-password', authMiddleware, AuthController.changePassword);
router.get('/me', authMiddleware, AuthController.getCurrentUser);

// MFA routes
router.post('/mfa/enable', authMiddleware, AuthController.setupMFA);
router.post('/mfa/verify', authMiddleware, AuthController.verifyMFA);

// Admin impersonation
router.post('/impersonate/:userId', authMiddleware, AuthController.impersonateUser);
router.post('/stop-impersonate', authMiddleware, AuthController.stopImpersonation);

module.exports = router;
