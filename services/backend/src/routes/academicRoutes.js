import express from 'express';
import academicController from '../controllers/academicController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { validateRequest, schemas } from '../utils/validators.js';
import Joi from 'joi';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ==================== VALIDATION SCHEMAS ====================

// Subject schemas
const createSubjectSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    code: Joi.string().min(2).max(20).required(),
    description: Joi.string().optional(),
    category: Joi.string().valid('core', 'elective', 'co_curricular', 'extra_curricular').required(),
    credits: Joi.number().min(0).optional()
  })
});

const updateSubjectSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    code: Joi.string().min(2).max(20).optional(),
    description: Joi.string().optional(),
    category: Joi.string().valid('core', 'elective', 'co_curricular', 'extra_curricular').optional(),
    credits: Joi.number().min(0).optional(),
    isActive: Joi.boolean().optional()
  })
});

// Class schemas
const createClassSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().required(),
    numericValue: Joi.number().required(),
    section: Joi.string().required(),
    classTeacherId: schemas.id.optional(),
    maxStudents: Joi.number().min(1).default(40),
    roomNumber: Joi.string().optional(),
    academicYear: Joi.string().required()
  })
});

const updateClassSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    name: Joi.string().optional(),
    section: Joi.string().optional(),
    classTeacherId: schemas.id.optional(),
    maxStudents: Joi.number().min(1).optional(),
    roomNumber: Joi.string().optional(),
    isActive: Joi.boolean().optional()
  })
});

const assignSubjectToClassSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    subjectId: schemas.id,
    teacherId: schemas.id.optional(),
    isOptional: Joi.boolean().default(false),
    weeklyHours: Joi.number().min(0).optional(),
    passingMarks: Joi.number().min(0).default(33),
    maxMarks: Joi.number().min(0).default(100)
  })
});

// Exam schemas
const createExamSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid('unit_test', 'term', 'half_yearly', 'final', 'practical', 'internal').required(),
    session: Joi.string().required(),
    classId: schemas.id.optional(),
    startDate: schemas.date,
    endDate: schemas.date,
    maxMarks: Joi.number().min(0).required(),
    passingMarks: Joi.number().min(0).required(),
    weightage: Joi.number().min(0).max(1).default(1)
  })
});

const updateExamSchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    name: Joi.string().optional(),
    type: Joi.string().valid('unit_test', 'term', 'half_yearly', 'final', 'practical', 'internal').optional(),
    startDate: schemas.date.optional(),
    endDate: schemas.date.optional(),
    maxMarks: Joi.number().min(0).optional(),
    passingMarks: Joi.number().min(0).optional(),
    weightage: Joi.number().min(0).max(1).optional()
  })
});

// Result schemas
const enterResultSchema = Joi.object({
  body: Joi.object({
    examId: schemas.id,
    studentId: schemas.id,
    subjectId: schemas.id,
    marksObtained: Joi.number().min(0).required(),
    grade: Joi.string().optional(),
    isAbsent: Joi.boolean().default(false),
    remarks: Joi.string().optional()
  })
});

const bulkEnterResultsSchema = Joi.object({
  body: Joi.object({
    examId: schemas.id,
    results: Joi.array().items(
      Joi.object({
        studentId: schemas.id,
        subjectId: schemas.id,
        marksObtained: Joi.number().min(0).required(),
        grade: Joi.string().optional(),
        isAbsent: Joi.boolean().default(false),
        remarks: Joi.string().optional()
      })
    ).min(1).required()
  })
});

// Gradebook schemas
const createGradebookEntrySchema = Joi.object({
  body: Joi.object({
    classId: schemas.id,
    studentId: schemas.id,
    subjectId: schemas.id,
    assessmentType: Joi.string().valid('homework', 'classwork', 'project', 'presentation', 'quiz', 'behavior', 'participation').required(),
    title: Joi.string().required(),
    marks: Joi.number().min(0).required(),
    maxMarks: Joi.number().min(0).required(),
    grade: Joi.string().optional(),
    date: schemas.date,
    notes: Joi.string().optional()
  })
});

const updateGradebookEntrySchema = Joi.object({
  params: Joi.object({
    id: schemas.id
  }),
  body: Joi.object({
    marks: Joi.number().min(0).optional(),
    grade: Joi.string().optional(),
    notes: Joi.string().optional()
  })
});

// ==================== SUBJECT ROUTES ====================
router.post(
  '/subjects',
  requireRole(['admin']),
  validateRequest(createSubjectSchema),
  academicController.createSubject
);

router.get(
  '/subjects',
  requireRole(['admin', 'teacher']),
  academicController.getSubjects
);

router.get(
  '/subjects/:id',
  requireRole(['admin', 'teacher']),
  academicController.getSubjectById
);

router.put(
  '/subjects/:id',
  requireRole(['admin']),
  validateRequest(updateSubjectSchema),
  academicController.updateSubject
);

router.delete(
  '/subjects/:id',
  requireRole(['admin']),
  academicController.deleteSubject
);

// ==================== CLASS ROUTES ====================
router.post(
  '/classes',
  requireRole(['admin']),
  validateRequest(createClassSchema),
  academicController.createClass
);

router.get(
  '/classes',
  requireRole(['admin', 'teacher']),
  academicController.getClasses
);

router.get(
  '/classes/:id',
  requireRole(['admin', 'teacher']),
  academicController.getClassById
);

router.put(
  '/classes/:id',
  requireRole(['admin']),
  validateRequest(updateClassSchema),
  academicController.updateClass
);

router.post(
  '/classes/:id/subjects',
  requireRole(['admin']),
  validateRequest(assignSubjectToClassSchema),
  academicController.assignSubjectToClass
);

router.delete(
  '/classes/:id/subjects/:subjectId',
  requireRole(['admin']),
  academicController.removeSubjectFromClass
);

// ==================== EXAM ROUTES ====================
router.post(
  '/exams',
  requireRole(['admin', 'teacher']),
  validateRequest(createExamSchema),
  academicController.createExam
);

router.get(
  '/exams',
  requireRole(['admin', 'teacher', 'student', 'parent']),
  academicController.getExams
);

router.get(
  '/exams/:id',
  requireRole(['admin', 'teacher', 'student', 'parent']),
  academicController.getExamById
);

router.put(
  '/exams/:id',
  requireRole(['admin', 'teacher']),
  validateRequest(updateExamSchema),
  academicController.updateExam
);

router.delete(
  '/exams/:id',
  requireRole(['admin']),
  academicController.deleteExam
);

// ==================== EXAM RESULT ROUTES ====================
router.post(
  '/results',
  requireRole(['admin', 'teacher']),
  validateRequest(enterResultSchema),
  academicController.enterResult
);

router.post(
  '/results/bulk',
  requireRole(['admin', 'teacher']),
  validateRequest(bulkEnterResultsSchema),
  academicController.bulkEnterResults
);

router.get(
  '/exams/:examId/results',
  requireRole(['admin', 'teacher', 'student', 'parent']),
  academicController.getExamResults
);

router.post(
  '/exams/:examId/publish-results',
  requireRole(['admin']),
  academicController.publishResults
);

router.post(
  '/exams/:examId/unpublish-results',
  requireRole(['admin']),
  academicController.unpublishResults
);

// ==================== GRADEBOOK ROUTES ====================
router.post(
  '/gradebook',
  requireRole(['admin', 'teacher']),
  validateRequest(createGradebookEntrySchema),
  academicController.createGradebookEntry
);

router.get(
  '/gradebook',
  requireRole(['admin', 'teacher', 'student', 'parent']),
  academicController.getGradebookEntries
);

router.put(
  '/gradebook/:id',
  requireRole(['admin', 'teacher']),
  validateRequest(updateGradebookEntrySchema),
  academicController.updateGradebookEntry
);

router.delete(
  '/gradebook/:id',
  requireRole(['admin', 'teacher']),
  academicController.deleteGradebookEntry
);

// ==================== REPORT ROUTES ====================
router.get(
  '/reports/student/:studentId/exam/:examId',
  requireRole(['admin', 'teacher', 'student', 'parent']),
  academicController.generateStudentReportCard
);

router.get(
  '/reports/class/:classId/exam/:examId',
  requireRole(['admin', 'teacher']),
  academicController.getClassPerformanceReport
);

router.get(
  '/reports/exam/:examId/subject-performance',
  requireRole(['admin', 'teacher']),
  academicController.getSubjectWisePerformance
);

export default router;
