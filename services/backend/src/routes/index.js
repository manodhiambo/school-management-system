import express from 'express';
import authRoutes from './authRoutes.js';
import studentRoutes from './studentRoutes.js';
import teacherRoutes from './teacherRoutes.js';
import parentRoutes from './parentRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import feeRoutes from './feeRoutes.js';
import academicRoutes from './academicRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import communicationRoutes from './communicationRoutes.js';
import timetableRoutes from './timetableRoutes.js';
import testRoutes from './testRoutes.js';
import classesRoutes from './classes.routes.js';
import subjectsRoutes from './subjects.routes.js';
import examsRoutes from './exams.routes.js';
import messagesRoutes from './messages.routes.js';
import notificationsRoutes from './notifications.routes.js';
import usersRoutes from './users.routes.js';

const router = express.Router();

// Register all routes
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/parents', parentRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/fee', feeRoutes);
router.use('/academic', academicRoutes);
router.use('/admin', settingsRoutes);  // Map /admin to settingsRoutes (has dashboard)
router.use('/settings', settingsRoutes);  // Also keep /settings
router.use('/communication', communicationRoutes);
router.use('/timetable', timetableRoutes);
router.use('/test', testRoutes);
router.use('/classes', classesRoutes);
router.use('/subjects', subjectsRoutes);
router.use('/exams', examsRoutes);
router.use('/messages', messagesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/users', usersRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
