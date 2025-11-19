import express from 'express';
import studentController from '../controllers/studentController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { validateRequest, schemas } from '../utils/validators.js';
import Joi from 'joi';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createStudentSchema = Joi.object({
  body: Joi.object({
    email: schemas.email,
    password: schemas.password,
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    dateOfBirth: schemas.date,
    gender: Joi.string().valid('male', 'female', 'other').required(),
    bloodGroup: Joi.string().optional(),
    religion: Joi.string().optional(),
    caste: Joi.string().optional(),
    category: Joi.string().valid('general', 'obc', 'sc', 'st', 'other').optional(),
    aadharNumber: Joi.string().pattern(/^[0-9]{12}$/).optional(),
    classId: schemas.id.optional(),
    sectionId: schemas.id.optional(),
    parentId: schemas.id.optional(),
    joiningDate: schemas.date.optional(),
    admissionDate: schemas.date.optional(),
    medicalNotes: Joi.string().optional(),
    emergencyContact: Joi.object().optional(),
    address: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    pincode: Joi.string().optional()
  })
});

const updateStudentSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    dateOfBirth: schemas.date.optional(),
    gender: Joi.string().valid('male', 'female', 'other').optional(),
    bloodGroup: Joi.string().optional(),
    religion: Joi.string().optional(),
    caste: Joi.string().optional(),
    category: Joi.string().valid('general', 'obc', 'sc', 'st', 'other').optional(),
    aadharNumber: Joi.string().pattern(/^[0-9]{12}$/).optional(),
    rollNumber: Joi.string().optional(),
    classId: schemas.id.optional(),
    sectionId: schemas.id.optional(),
    parentId: schemas.id.optional(),
    medicalNotes: Joi.string().optional(),
    emergencyContact: Joi.object().optional(),
    address: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    pincode: Joi.string().optional(),
    profilePhotoUrl: Joi.string().uri().optional()
  })
});

const updateStatusSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    status: Joi.string().valid('active', 'inactive', 'suspended', 'transferred', 'graduated').required()
  })
});

const promoteStudentSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    toClassId: schemas.id,
    session: Joi.string().required(),
    result: Joi.string().valid('promoted', 'detained', 'transferred').required(),
    percentage: Joi.number().min(0).max(100).optional(),
    remarks: Joi.string().optional()
  })
});

const addDocumentSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    documentType: Joi.string().valid('birth_certificate', 'transfer_certificate', 'medical', 'address_proof', 'photo', 'other').required(),
    fileUrl: Joi.string().uri().required(),
    fileName: Joi.string().required(),
    fileSize: Joi.number().required(),
    mimeType: Joi.string().required()
  })
});

const bulkImportSchema = Joi.object({
  body: Joi.object({
    students: Joi.array().items(
      Joi.object({
        email: schemas.email,
        password: Joi.string().optional(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        dateOfBirth: Joi.date().required(),
        gender: Joi.string().valid('male', 'female', 'other').required(),
        classId: Joi.string().optional(),
        parentId: Joi.string().optional()
      })
    ).min(1).required()
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

router.post(
  '/bulk-import',
  requireRole(['admin']),
  validateRequest(bulkImportSchema),
  studentController.bulkImportStudents
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

router.post(
  '/:id/promote',
  requireRole(['admin']),
  validateRequest(promoteStudentSchema),
  studentController.promoteStudent
);

router.get(
  '/:id/timetable',
  studentController.getStudentTimetable
);

router.get(
  '/:id/documents',
  studentController.getStudentDocuments
);

router.post(
  '/:id/documents',
  requireRole(['admin', 'teacher']),
  validateRequest(addDocumentSchema),
  studentController.addStudentDocument
);

router.delete(
  '/:id/documents/:documentId',
  requireRole(['admin', 'teacher']),
  studentController.deleteStudentDocument
);

export default router;
