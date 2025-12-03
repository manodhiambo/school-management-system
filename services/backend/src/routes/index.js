import express from 'express';
import authRoutes from './authRoutes.js';
import studentRoutes from './studentRoutes.js';
import teacherRoutes from './teachers.routes.js';
import parentRoutes from './parents.routes.js';
import classRoutes from './classes.routes.js';
import subjectRoutes from './subjects.routes.js';
import examRoutes from './exams.routes.js';
import attendanceRoutes from './attendanceRoutes.js';
import feeRoutes from './feeRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import communicationRoutes from './communication.routes.js';
import dashboardRoutes from './dashboardRoutes.js';
import userRoutes from './userRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import timetableRoutes from './timetableRoutes.js';
import assignmentRoutes from './assignmentRoutes.js';

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/parents', parentRoutes);
router.use('/classes', classRoutes);
router.use('/subjects', subjectRoutes);
router.use('/exams', examRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/fee', feeRoutes);
router.use('/settings', settingsRoutes);
router.use('/communication', communicationRoutes);
router.use('/admin', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);
router.use('/timetable', timetableRoutes);
router.use('/assignments', assignmentRoutes);

export default router;
