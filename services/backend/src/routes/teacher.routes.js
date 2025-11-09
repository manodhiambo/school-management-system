const express = require('express');
const router = express.Router();
const TeacherController = require('../controllers/teacher.controller');
const { requireRole } = require('../middleware/auth.middleware');

const requireAdmin = requireRole(['admin']);

// All routes require admin access
router.use(requireAdmin);

router.get('/', TeacherController.getTeachers);
router.post('/', TeacherController.createTeacher);
router.get('/:id', TeacherController.getTeacherById);
router.put('/:id', TeacherController.updateTeacher);
router.patch('/:id/assign-class', TeacherController.assignClass);
router.post('/:id/attendance', TeacherController.markAttendance);
router.get('/:id/attendance', TeacherController.getTeacherAttendance);
router.post('/:id/leave', TeacherController.applyLeave);
router.get('/:id/leave', TeacherController.getTeacherLeaves);
router.get('/:id/schedule', TeacherController.getTeacherSchedule);
router.get('/available', TeacherController.getAvailableTeachers);

module.exports = router;
