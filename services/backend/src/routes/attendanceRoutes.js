import express from 'express';
import attendanceController from '../controllers/attendanceController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { validateRequest, schemas } from '../utils/validators.js';
import Joi from 'joi';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ==================== VALIDATION SCHEMAS ====================
const createSessionSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().required(),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).required(),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).required()
  })
});

const markAttendanceSchema = Joi.object({
  body: Joi.object({
    studentId: schemas.id,
    date: schemas.date,
    sessionId: schemas.id.optional(),
    status: Joi.string().valid('present', 'absent', 'late', 'half_day', 'holiday', 'excused').required(),
    checkInTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
    checkOutTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
    method: Joi.string().valid('manual', 'biometric', 'qr', 'rfid').optional(),
    location: Joi.object().optional(),
    reason: Joi.string().optional(),
    isExcused: Joi.boolean().default(false)
  })
});

const bulkMarkAttendanceSchema = Joi.object({
  body: Joi.object({
    attendanceList: Joi.array().items(
      Joi.object({
        studentId: schemas.id,
        date: schemas.date,
        sessionId: schemas.id.optional(),
        status: Joi.string().valid('present', 'absent', 'late', 'half_day', 'holiday', 'excused').required(),
        checkInTime: Joi.string().optional(),
        checkOutTime: Joi.string().optional(),
        reason: Joi.string().optional(),
        isExcused: Joi.boolean().optional()
      })
    ).min(1).required(),
    method: Joi.string().valid('manual', 'biometric', 'qr', 'rfid').optional()
  })
});

const markClassAttendanceSchema = Joi.object({
  body: Joi.object({
    classId: schemas.id,
    date: schemas.date,
    sessionId: schemas.id.optional(),
    attendanceList: Joi.array().items(
      Joi.object({
        studentId: schemas.id,
        status: Joi.string().valid('present', 'absent', 'late', 'half_day').required(),
        checkInTime: Joi.string().optional(),
        checkOutTime: Joi.string().optional(),
        reason: Joi.string().optional(),
        isExcused: Joi.boolean().optional()
      })
    ).required()
  })
});

const updateSummarySchema = Joi.object({
  params: Joi.object({
    studentId: schemas.id
  }),
  body: Joi.object({
    month: Joi.date().required()
  })
});

const notifyAbsenceSchema = Joi.object({
  body: Joi.object({
    date: schemas.date
  })
});

// ==================== ATTENDANCE SESSION ROUTES ====================
router.post(
  '/sessions',
  requireRole(['admin']),
  validateRequest(createSessionSchema),
  attendanceController.createAttendanceSession
);

router.get(
  '/sessions',
  requireRole(['admin', 'teacher']),
  attendanceController.getAttendanceSessions
);

// ==================== MARK ATTENDANCE ROUTES ====================
router.post(
  '/mark',
  requireRole(['admin', 'teacher']),
  validateRequest(markAttendanceSchema),
  attendanceController.markAttendance
);

router.post(
  '/mark/bulk',
  requireRole(['admin', 'teacher']),
  validateRequest(bulkMarkAttendanceSchema),
  attendanceController.bulkMarkAttendance
);

router.post(
  '/mark/class',
  requireRole(['admin', 'teacher']),
  validateRequest(markClassAttendanceSchema),
  attendanceController.markClassAttendance
);

// ==================== RETRIEVE ATTENDANCE ROUTES ====================
router.get(
  '/',
  requireRole(['admin', 'teacher', 'parent']),
  attendanceController.getAttendance
);

router.get(
  '/class/:classId/date',
  requireRole(['admin', 'teacher']),
  attendanceController.getClassAttendanceByDate
);

// ==================== STATISTICS ROUTES ====================
router.get(
  '/statistics',
  requireRole(['admin', 'teacher', 'parent']),
  attendanceController.getAttendanceStatistics
);

router.get(
  '/student/:studentId/summary',
  requireRole(['admin', 'teacher', 'parent', 'student']),
  attendanceController.getStudentAttendanceSummary
);

router.post(
  '/student/:studentId/summary',
  requireRole(['admin', 'teacher']),
  validateRequest(updateSummarySchema),
  attendanceController.updateAttendanceSummary
);

// ==================== REPORTS ROUTES ====================
router.get(
  '/defaulters',
  requireRole(['admin', 'teacher']),
  attendanceController.getDefaulters
);

router.get(
  '/report',
  requireRole(['admin', 'teacher']),
  attendanceController.getAttendanceReport
);

// ==================== NOTIFICATION ROUTES ====================
router.post(
  '/notify/absence',
  requireRole(['admin', 'teacher']),
  validateRequest(notifyAbsenceSchema),
  attendanceController.notifyParentsOfAbsence
);

export default router;
