import express from 'express';
import teacherController from '../controllers/teacherController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { validateRequest, schemas } from '../utils/validators.js';
import Joi from 'joi';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createTeacherSchema = Joi.object({
  body: Joi.object({
    email: schemas.email,
    password: schemas.password,
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    dateOfBirth: schemas.date.optional(),
    gender: Joi.string().valid('male', 'female', 'other').required(),
    dateOfJoining: schemas.date.required(),
    qualification: Joi.string().optional(),
    specialization: Joi.string().optional(),
    experienceYears: Joi.number().min(0).optional(),
    departmentId: schemas.id.optional(),
    designation: Joi.string().optional(),
    salaryGrade: Joi.string().optional(),
    basicSalary: Joi.number().min(0).optional(),
    accountNumber: Joi.string().optional(),
    ifscCode: Joi.string().optional(),
    panNumber: Joi.string().optional(),
    aadharNumber: Joi.string().pattern(/^[0-9]{12}$/).optional(),
    address: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    pincode: Joi.string().optional(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    emergencyContact: Joi.object().optional(),
    isClassTeacher: Joi.boolean().optional(),
    classId: schemas.id.optional(),
    sectionId: schemas.id.optional()
  })
});

const updateTeacherSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    dateOfBirth: schemas.date.optional(),
    gender: Joi.string().valid('male', 'female', 'other').optional(),
    qualification: Joi.string().optional(),
    specialization: Joi.string().optional(),
    experienceYears: Joi.number().min(0).optional(),
    departmentId: schemas.id.optional(),
    designation: Joi.string().optional(),
    salaryGrade: Joi.string().optional(),
    basicSalary: Joi.number().min(0).optional(),
    accountNumber: Joi.string().optional(),
    ifscCode: Joi.string().optional(),
    panNumber: Joi.string().optional(),
    aadharNumber: Joi.string().pattern(/^[0-9]{12}$/).optional(),
    address: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    pincode: Joi.string().optional(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    emergencyContact: Joi.object().optional(),
    isClassTeacher: Joi.boolean().optional(),
    classId: schemas.id.optional(),
    sectionId: schemas.id.optional(),
    profilePhotoUrl: Joi.string().uri().optional()
  })
});

const assignClassSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    classId: schemas.id
  })
});

const assignSubjectSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    classId: schemas.id,
    subjectId: schemas.id,
    weeklyHours: Joi.number().min(1).max(20).optional()
  })
});

const markAttendanceSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    date: schemas.date,
    status: Joi.string().valid('present', 'absent', 'late', 'half_day', 'on_leave').required(),
    checkInTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
    checkOutTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
    location: Joi.object().optional(),
    remarks: Joi.string().optional()
  })
});

const applyLeaveSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    leaveType: Joi.string().valid('casual', 'sick', 'earned', 'maternity', 'paternity', 'unpaid', 'other').required(),
    startDate: schemas.date,
    endDate: schemas.date,
    reason: Joi.string().required()
  })
});

const approveLeaveSchema = Joi.object({
  params: Joi.object({
    leaveId: schemas.id
  }),
  body: Joi.object({
    status: Joi.string().valid('approved', 'rejected').required(),
    rejectionReason: Joi.string().optional()
  })
});

// Routes
router.post(
  '/',
  requireRole(['admin']),
  validateRequest(createTeacherSchema),
  teacherController.createTeacher
);

router.get(
  '/',
  requireRole(['admin', 'teacher']),
  teacherController.getTeachers
);

router.get(
  '/statistics',
  requireRole(['admin']),
  teacherController.getTeacherStatistics
);

router.get(
  '/available',
  requireRole(['admin', 'teacher']),
  teacherController.getAvailableTeachers
);

router.get(
  '/:id',
  teacherController.getTeacherById
);

router.put(
  '/:id',
  requireRole(['admin']),
  validateRequest(updateTeacherSchema),
  teacherController.updateTeacher
);

router.post(
  '/:id/assign-class',
  requireRole(['admin']),
  validateRequest(assignClassSchema),
  teacherController.assignClass
);

router.post(
  '/:id/assign-subject',
  requireRole(['admin']),
  validateRequest(assignSubjectSchema),
  teacherController.assignSubject
);

router.get(
  '/:id/schedule',
  teacherController.getTeacherSchedule
);

router.post(
  '/:id/attendance',
  requireRole(['admin', 'teacher']),
  validateRequest(markAttendanceSchema),
  teacherController.markAttendance
);

router.get(
  '/:id/attendance',
  teacherController.getTeacherAttendance
);

router.post(
  '/:id/leave',
  requireRole(['teacher', 'admin']),
  validateRequest(applyLeaveSchema),
  teacherController.applyLeave
);

router.get(
  '/:id/leave',
  teacherController.getTeacherLeaves
);

router.patch(
  '/leave/:leaveId/approve',
  requireRole(['admin']),
  validateRequest(approveLeaveSchema),
  teacherController.approveLeave
);

router.get(
  '/:id/salary',
  requireRole(['admin', 'teacher']),
  teacherController.getTeacherSalary
);

router.delete(
  '/:id',
  requireRole(['admin']),
  teacherController.deleteTeacher
);

export default router;
