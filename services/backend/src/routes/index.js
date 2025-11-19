import express from 'express';
import authRoutes from './authRoutes.js';
import studentRoutes from './studentRoutes.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);

export default router;
