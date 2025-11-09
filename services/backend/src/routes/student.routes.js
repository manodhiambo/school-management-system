const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/student.controller');
const { requireRole } = require('../middleware/auth.middleware');
const { upload } = require('../utils/fileUpload');

const requireAdminOrTeacher = requireRole(['admin', 'teacher']);

// All routes require admin or teacher role
router.use(requireAdminOrTeacher);

router.get('/', StudentController.getStudents);
router.post('/', StudentController.createStudent);
router.get('/:id', StudentController.getStudentById);
router.put('/:id', StudentController.updateStudent);
router.patch('/:id/status', StudentController.updateStudentStatus);
router.delete('/:id', StudentController.deleteStudent);

// Bulk import
router.post('/bulk-import', 
  upload({ maxSize: 10 * 1024 * 1024 }).single('file'), 
  StudentController.bulkImportStudents
);

// Student-specific data
router.get('/:id/attendance', StudentController.getStudentAttendance);
router.get('/:id/academic-report', StudentController.getStudentAcademicReport);
router.get('/:id/finance', StudentController.getStudentFinance);

// Documents
router.post('/:id/documents',
  upload({ allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'] }).single('file'),
  StudentController.uploadDocument
);
router.get('/:id/documents', StudentController.getStudentDocuments);

// Promotion
router.post('/:id/promote', StudentController.promoteStudent);

module.exports = router;
