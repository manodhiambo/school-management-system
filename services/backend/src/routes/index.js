const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth.routes');
const studentRoutes = require('./student.routes');
const teacherRoutes = require('./teacher.routes');
const parentRoutes = require('./parent.routes');
const academicRoutes = require('./academic.routes');
const attendanceRoutes = require('./attendance.routes');
const feeRoutes = require('./fee.routes');
const timetableRoutes = require('./timetable.routes');
const communicationRoutes = require('./communication.routes');
const reportRoutes = require('./report.routes');
const adminRoutes = require('./admin.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/parents', parentRoutes);
router.use('/academy', academicRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/fee', feeRoutes);
router.use('/timetable', timetableRoutes);
router.use('/communication', communicationRoutes);
router.use('/reports', reportRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
