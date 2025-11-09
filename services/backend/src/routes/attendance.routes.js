const express = require('express');
const router = express.Router();
const AttendanceController = require('../controllers/attendance.controller');
const { requireRole } = require('../middleware/auth.middleware');

const requireAdminOrTeacher = requireRole(['admin', 'teacher']);

// Mark attendance
router.post('/mark', requireAdminOrTeacher, AttendanceController.markAttendance);
router.post('/mark-bulk', requireAdminOrTeacher, AttendanceController.markBulkAttendance);

// Get attendance
router.get('/class/:classId/date/:date', requireAdminOrTeacher, AttendanceController.getClassAttendance);
router.get('/student/:studentId/monthly/:month', AttendanceController.getStudentMonthlyAttendance);
router.get('/statistics/:studentId', AttendanceController.getStudentAttendanceStats);

// Reports
router.get('/report', requireAdminOrTeacher, AttendanceController.generateAttendanceReport);

// Biometric import
router.post('/import/biometric', requireAdminOrTeacher, AttendanceController.importBiometricAttendance);

module.exports = router;
