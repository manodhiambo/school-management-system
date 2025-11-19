import express from 'express';
import authRoutes from './authRoutes.js';
import studentRoutes from './studentRoutes.js';
import teacherRoutes from './teacherRoutes.js';
import parentRoutes from './parentRoutes.js';
import academicRoutes from './academicRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import feeRoutes from './feeRoutes.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/parents', parentRoutes);
router.use('/academic', academicRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/fee', feeRoutes);

export default router;
