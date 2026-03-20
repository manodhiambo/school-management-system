import express from 'express';
import teacherController from '../controllers/teacherController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { validateRequest, schemas } from '../utils/validators.js';
import Joi from 'joi';
import { query } from '../config/database.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantContext);
router.use(requireActiveTenant);

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
    phone: Joi.string().pattern(/^[0-9]{7,15}$/).optional(),
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
    phone: Joi.string().pattern(/^[0-9]{7,15}$/).optional(),
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


// Get teacher classes
router.get(
  '/:id/classes',
  requireRole(['admin', 'teacher']),
  teacherController.getTeacherClasses
);

// Get teacher timetable
router.get(
  '/:id/timetable',
  requireRole(['admin', 'teacher']),
  teacherController.getTeacherTimetable
);

// ── Teaching Assignments (class + subject pairs) ─────────────────────────────

// Helper: resolve teacher's user_id (class_subjects.teacher_id references users.id)
// Accepts either teachers.id or users.id (user_id) as input
async function resolveTeacherUserId(teacherId, tenantId) {
  const rows = await query(
    'SELECT user_id FROM teachers WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
    [teacherId, tenantId]
  );
  // If found, return the user_id; otherwise treat input as already a user_id
  return rows[0]?.user_id || teacherId;
}

// Helper: fetch assignment list for a given user_id
async function getAssignmentRows(userIdForCs, tenantId) {
  return query(
    `SELECT cs.id, cs.class_id, cs.subject_id,
            c.name AS class_name, c.section AS class_section,
            s.name AS subject_name, s.code AS subject_code
     FROM class_subjects cs
     JOIN classes c ON c.id = cs.class_id
     JOIN subjects s ON s.id = cs.subject_id
     WHERE cs.teacher_id = $1 AND cs.tenant_id = $2
     ORDER BY c.name, s.name`,
    [userIdForCs, tenantId]
  );
}

// GET /:id/assignments — list all class-subject assignments for a teacher
router.get('/:id/assignments', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const userId = await resolveTeacherUserId(req.params.id, tid);
    if (!userId) return res.json({ success: true, data: [] });
    const rows = await getAssignmentRows(userId, tid);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /:id/assignments — assign teacher to a class+subject
router.post('/:id/assignments', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { class_id, subject_id } = req.body;
    if (!class_id || !subject_id) {
      return res.status(400).json({ success: false, message: 'class_id and subject_id are required' });
    }
    const userId = await resolveTeacherUserId(req.params.id, tid);
    if (!userId) {
      return res.status(404).json({ success: false, message: 'Teacher user account not found' });
    }
    // Upsert: if this class-subject pair exists update teacher, else insert
    await query(
      `INSERT INTO class_subjects (class_id, subject_id, teacher_id, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (class_id, subject_id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id`,
      [class_id, subject_id, userId, tid]
    );
    const rows = await getAssignmentRows(userId, tid);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /:id/assignments/:csId — remove a teaching assignment
router.delete('/:id/assignments/:csId', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const userId = await resolveTeacherUserId(req.params.id, tid);
    if (!userId) {
      return res.status(404).json({ success: false, message: 'Teacher user account not found' });
    }
    await query(
      'UPDATE class_subjects SET teacher_id = NULL WHERE id = $1 AND teacher_id = $2 AND tenant_id = $3',
      [req.params.csId, userId, tid]
    );
    res.json({ success: true, message: 'Assignment removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
