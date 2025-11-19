import express from 'express';
import authRoutes from './authRoutes.js';
import studentRoutes from './studentRoutes.js';
import teacherRoutes from './teacherRoutes.js';
import parentRoutes from './parentRoutes.js';
import academicRoutes from './academicRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import feeRoutes from './feeRoutes.js';
import timetableRoutes from './timetableRoutes.js';
import communicationRoutes from './communicationRoutes.js';
import settingsRoutes from './settingsRoutes.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// API Documentation
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'School Management System API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/v1/auth',
      students: '/api/v1/students',
      teachers: '/api/v1/teachers',
      parents: '/api/v1/parents',
      academic: '/api/v1/academic',
      attendance: '/api/v1/attendance',
      fee: '/api/v1/fee',
      timetable: '/api/v1/timetable',
      communication: '/api/v1/communication',
      admin: '/api/v1/admin'
    }
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/parents', parentRoutes);
router.use('/academic', academicRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/fee', feeRoutes);
router.use('/timetable', timetableRoutes);
router.use('/communication', communicationRoutes);
router.use('/admin', settingsRoutes);

export default router;
