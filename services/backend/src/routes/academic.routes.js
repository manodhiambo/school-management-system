const express = require('express');
const router = express.Router();
const AcademicController = require('../controllers/academic.controller');
const { upload } = require('../utils/fileUpload');
const { requireRole } = require('../middleware/auth.middleware');

const requireAdmin = requireRole(['admin']);
const requireAdminOrTeacher = requireRole(['admin', 'teacher']);

// Subjects
router.post('/subjects', requireAdmin, AcademicController.createSubject);
router.get('/subjects', AcademicController.getSubjects);
router.put('/subjects/:id', requireAdmin, AcademicController.updateSubject);
router.delete('/subjects/:id', requireAdmin, AcademicController.deleteSubject);

// Classes
router.post('/classes', requireAdmin, AcademicController.createClass);
router.get('/classes', AcademicController.getClasses);
router.post('/classes/:id/sections', requireAdmin, AcademicController.addClassSubject);
router.get('/classes/:id/sections', AcademicController.getClassSubjects);

// Exams
router.post('/exams', requireAdminOrTeacher, AcademicController.createExam);
router.get('/exams', AcademicController.getExams);
router.put('/exams/:examId/students/:studentId/results/:subjectId', requireAdminOrTeacher, AcademicController.updateExamResult);
router.post('/exams/:id/results/bulk', 
  requireAdminOrTeacher, 
  upload({ maxSize: 5 * 1024 * 1024 }).single('file'), 
  AcademicController.bulkUploadResults
);
router.get('/exams/:id/results', AcademicController.getStudentExamResults);
router.post('/exams/:id/publish', requireAdmin, AcademicController.publishExamResults);

// Gradebook
router.post('/gradebook', requireAdminOrTeacher, AcademicController.addGradebookEntry);
router.get('/gradebook/student/:studentId', AcademicController.getStudentGradebook);

// Reports
router.post('/reports/generate', requireAdminOrTeacher, AcademicController.generateReportCard);

module.exports = router;
