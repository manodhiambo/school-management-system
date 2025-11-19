import express from 'express';
import authController from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateRequest, schemas } from '../utils/validators.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  body: Joi.object({
    email: schemas.email,
    password: schemas.password,
    role: Joi.string().valid('admin', 'teacher', 'student', 'parent').required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional()
  })
});

const loginSchema = Joi.object({
  body: Joi.object({
    email: schemas.email,
    password: Joi.string().required()
  })
});

const mfaLoginSchema = Joi.object({
  body: Joi.object({
    userId: schemas.id,
    mfaToken: Joi.string().length(6).required()
  })
});

const forgotPasswordSchema = Joi.object({
  body: Joi.object({
    email: schemas.email
  })
});

const resetPasswordSchema = Joi.object({
  params: Joi.object({
    token: Joi.string().required()
  }),
  body: Joi.object({
    newPassword: schemas.password
  })
});

const changePasswordSchema = Joi.object({
  body: Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: schemas.password
  })
});

const enableMFASchema = Joi.object({
  body: Joi.object({
    secret: Joi.string().required(),
    token: Joi.string().length(6).required()
  })
});

const disableMFASchema = Joi.object({
  body: Joi.object({
    password: Joi.string().required()
  })
});

const verifyMFASchema = Joi.object({
  body: Joi.object({
    token: Joi.string().length(6).required()
  })
});

// Public routes
router.post('/register', authLimiter, validateRequest(registerSchema), authController.register);
router.post('/login', authLimiter, validateRequest(loginSchema), authController.login);
router.post('/login/mfa', authLimiter, validateRequest(mfaLoginSchema), authController.loginWithMFA);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authLimiter, validateRequest(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password/:token', authLimiter, validateRequest(resetPasswordSchema), authController.resetPassword);

// Protected routes (require authentication)
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/change-password', authenticate, validateRequest(changePasswordSchema), authController.changePassword);

// MFA routes (protected)
router.post('/mfa/setup', authenticate, authController.setupMFA);
router.post('/mfa/enable', authenticate, validateRequest(enableMFASchema), authController.enableMFA);
router.post('/mfa/disable', authenticate, validateRequest(disableMFASchema), authController.disableMFA);
router.post('/mfa/verify', authenticate, validateRequest(verifyMFASchema), authController.verifyMFA);

export default router;
