import express from 'express';
import studentController from '../controllers/studentController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { validateRequest, schemas } from '../utils/validators.js';
import Joi from 'joi';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Flexible validation schemas
const createStudentSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).optional(),
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    dateOfBirth: Joi.date().iso().optional().allow(null, ''),
    gender: Joi.string().valid('male', 'female', 'other', 'Male', 'Female', 'Other').optional().allow(null, ''),
    bloodGroup: Joi.string().optional().allow(null, ''),
    classId: Joi.string().uuid().optional().allow(null, ''),
    parentId: Joi.string().uuid().optional().allow(null, ''),
    admissionDate: Joi.date().iso().optional().allow(null, ''),
    address: Joi.string().optional().allow(null, ''),
    city: Joi.string().optional().allow(null, ''),
    state: Joi.string().optional().allow(null, ''),
    pincode: Joi.string().optional().allow(null, ''),
    phonePrimary: Joi.string().optional().allow(null, '')
  }).unknown(true)
});

const updateStudentSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object({
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
    dateOfBirth: Joi.date().iso().optional().allow(null, ''),
    gender: Joi.string().valid('male', 'female', 'other', 'Male', 'Female', 'Other').optional().allow(null, ''),
    bloodGroup: Joi.string().optional().allow(null, ''),
    classId: Joi.string().uuid().optional().allow(null, ''),
    parentId: Joi.string().uuid().optional().allow(null, ''),
    address: Joi.string().optional().allow(null, ''),
    city: Joi.string().optional().allow(null, ''),
    state: Joi.string().optional().allow(null, ''),
    pincode: Joi.string().optional().allow(null, ''),
    phonePrimary: Joi.string().optional().allow(null, ''),
    status: Joi.string().valid('active', 'inactive', 'suspended', 'transferred', 'graduated').optional()
  }).unknown(true)
});

const updateStatusSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object({
    status: Joi.string().valid('active', 'inactive', 'suspended', 'transferred', 'graduated').required()
  })
});

// Routes
router.post(
  '/',
  requireRole(['admin', 'teacher']),
  validateRequest(createStudentSchema),
  studentController.createStudent
);

router.get(
  '/',
  requireRole(['admin', 'teacher', 'parent']),
  studentController.getStudents
);

router.get(
  '/statistics',
  requireRole(['admin', 'teacher']),
  studentController.getStudentStatistics
);

router.get(
  '/:id',
  studentController.getStudentById
);

router.put(
  '/:id',
  requireRole(['admin', 'teacher']),
  validateRequest(updateStudentSchema),
  studentController.updateStudent
);

router.patch(
  '/:id/status',
  requireRole(['admin']),
  validateRequest(updateStatusSchema),
  studentController.updateStudentStatus
);

router.delete(
  '/:id',
  requireRole(['admin']),
  studentController.deleteStudent
);

router.get(
  '/:id/attendance',
  studentController.getStudentAttendance
);

router.get(
  '/:id/academic-report',
  studentController.getStudentAcademicReport
);

router.get(
  '/:id/finance',
  requireRole(['admin', 'teacher', 'parent']),
  studentController.getStudentFinance
);

router.get(
  '/:id/timetable',
  studentController.getStudentTimetable
);

router.get(
  '/:id/exam-results',
  requireRole(['admin', 'teacher', 'parent', 'student']),
  studentController.getStudentExamResults
);

export default router;
