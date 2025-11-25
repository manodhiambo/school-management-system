import express from 'express';
import settingsController from '../controllers/settingsController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { validateRequest, schemas } from '../utils/validators.js';
import Joi from 'joi';

const router = express.Router();

router.use(authenticate);

// Validation schemas
const updateSettingsSchema = Joi.object({
  body: Joi.object({
    schoolName: Joi.string().optional(),
    schoolCode: Joi.string().optional(),
    schoolLogoUrl: Joi.string().uri().optional(),
    address: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    pincode: Joi.string().optional(),
    phone: Joi.string().optional(),
    email: Joi.string().email().optional(),
    website: Joi.string().uri().optional(),
    currentAcademicYear: Joi.string().optional(),
    timezone: Joi.string().optional(),
    currency: Joi.string().optional(),
    dateFormat: Joi.string().optional(),
    timeFormat: Joi.string().optional(),
    attendanceMethod: Joi.string().valid('manual', 'biometric', 'qr', 'rfid', 'all').optional(),
    feeLateeFeeApplicable: Joi.boolean().optional(),
    smsEnabled: Joi.boolean().optional(),
    emailEnabled: Joi.boolean().optional(),
    pushNotificationEnabled: Joi.boolean().optional()
  })
});

const createAcademicYearSchema = Joi.object({
  body: Joi.object({
    year: Joi.string().required(),
    startDate: schemas.date,
    endDate: schemas.date,
    isCurrent: Joi.boolean().default(false)
  })
});

const setCurrentYearSchema = Joi.object({
  body: Joi.object({
    yearId: schemas.id
  })
});

// Dashboard - accessible by all authenticated users
router.get('/dashboard', settingsController.getDashboardStatistics);

// Settings routes - admin only
router.get('/settings', requireRole(['admin']), settingsController.getSettings);
router.put('/settings', requireRole(['admin']), validateRequest(updateSettingsSchema), settingsController.updateSettings);

// Academic year routes - admin only
router.post('/academic-years', requireRole(['admin']), validateRequest(createAcademicYearSchema), settingsController.createAcademicYear);
router.get('/academic-years', requireRole(['admin']), settingsController.getAcademicYears);
router.get('/academic-years/current', requireRole(['admin']), settingsController.getCurrentAcademicYear);
router.post('/academic-years/set-current', requireRole(['admin']), validateRequest(setCurrentYearSchema), settingsController.setCurrentAcademicYear);

// Audit logs - admin only
router.get('/audit-logs', requireRole(['admin']), settingsController.getAuditLogs);

// System logs - admin only
router.get('/system-logs', requireRole(['admin']), settingsController.getSystemLogs);

// Backup - admin only
router.post('/backup', requireRole(['admin']), settingsController.createBackup);

export default router;
