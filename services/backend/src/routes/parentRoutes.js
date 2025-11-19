import express from 'express';
import parentController from '../controllers/parentController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { validateRequest, schemas } from '../utils/validators.js';
import Joi from 'joi';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createParentSchema = Joi.object({
  body: Joi.object({
    email: schemas.email,
    password: schemas.password,
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    relationship: Joi.string().valid('father', 'mother', 'guardian', 'other').required(),
    occupation: Joi.string().optional(),
    annualIncome: Joi.number().min(0).optional(),
    education: Joi.string().optional(),
    address: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    pincode: Joi.string().optional(),
    phonePrimary: schemas.phone,
    phoneSecondary: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    emailSecondary: Joi.string().email().optional(),
    aadharNumber: Joi.string().pattern(/^[0-9]{12}$/).optional()
  })
});

const updateParentSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    relationship: Joi.string().valid('father', 'mother', 'guardian', 'other').optional(),
    occupation: Joi.string().optional(),
    annualIncome: Joi.number().min(0).optional(),
    education: Joi.string().optional(),
    address: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    pincode: Joi.string().optional(),
    phonePrimary: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    phoneSecondary: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    emailSecondary: Joi.string().email().optional(),
    aadharNumber: Joi.string().pattern(/^[0-9]{12}$/).optional(),
    profilePhotoUrl: Joi.string().uri().optional()
  })
});

const linkStudentSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    studentId: schemas.id,
    relationship: Joi.string().valid('father', 'mother', 'guardian', 'other').required(),
    isPrimaryContact: Joi.boolean().optional(),
    canPickup: Joi.boolean().optional()
  })
});

const updateStudentLinkSchema = Joi.object({
  params: Joi.object({
    id: schemas.id,
    studentId: schemas.id
  }),
  body: Joi.object({
    isPrimaryContact: Joi.boolean().optional(),
    canPickup: Joi.boolean().optional(),
    receiveNotifications: Joi.boolean().optional()
  })
});

// Routes
router.post(
  '/',
  requireRole(['admin']),
  validateRequest(createParentSchema),
  parentController.createParent
);

router.get(
  '/',
  requireRole(['admin', 'teacher']),
  parentController.getParents
);

router.get(
  '/statistics',
  requireRole(['admin']),
  parentController.getStatistics
);

router.get(
  '/:id',
  parentController.getParentById
);

router.put(
  '/:id',
  requireRole(['admin', 'parent']),
  validateRequest(updateParentSchema),
  parentController.updateParent
);

router.post(
  '/:id/link-student',
  requireRole(['admin']),
  validateRequest(linkStudentSchema),
  parentController.linkStudent
);

router.delete(
  '/:id/unlink-student/:studentId',
  requireRole(['admin']),
  parentController.unlinkStudent
);

router.patch(
  '/:id/student-link/:studentId',
  requireRole(['admin']),
  validateRequest(updateStudentLinkSchema),
  parentController.updateStudentLink
);

router.get(
  '/:id/children',
  parentController.getChildren
);

router.get(
  '/:id/children/:studentId/attendance',
  parentController.getChildAttendance
);

router.get(
  '/:id/children/:studentId/academic-report',
  parentController.getChildAcademicReport
);

router.get(
  '/:id/children/:studentId/fees',
  parentController.getChildFees
);

router.get(
  '/:id/payments',
  parentController.getPaymentHistory
);

router.get(
  '/:id/notifications',
  parentController.getNotifications
);

router.patch(
  '/:id/notifications/:notificationId/read',
  parentController.markNotificationAsRead
);

router.get(
  '/:id/messages',
  parentController.getMessages
);

router.get(
  '/:id/dashboard',
  parentController.getDashboard
);

router.delete(
  '/:id',
  requireRole(['admin']),
  parentController.deleteParent
);

export default router;
