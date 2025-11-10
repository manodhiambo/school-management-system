const express = require('express');
const prisma = require('../models/index');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/dashboard/stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching stats for user:', req.user.id);
    
    const [totalStudents, totalTeachers, totalClasses, recentMessages] = await Promise.all([
      prisma.student.count({ where: { status: 'active' } }),
      prisma.teacher.count({ where: { status: 'active' } }),
      prisma.class.count(),
      prisma.message.count({
        where: {
          receiverId: req.user.id,
          isRead: false
        }
      })
    ]);

    console.log('Stats fetched:', { totalStudents, totalTeachers, totalClasses, recentMessages });

    res.json({
      success: true,
      data: {
        totalStudents,
        totalTeachers,
        totalClasses,
        recentMessages
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error: error.message });
  }
});

module.exports = router;
