const express = require('express');
const prisma = require('../models/index');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, classId, status } = req.query;
    const students = await prisma.student.findMany({
      where: { status: status || 'active', classId },
      include: {
        class: true,
        section: true,
        parent: true
      },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });
    
    const total = await prisma.student.count({
      where: { status: status || 'active', classId }
    });

    res.json({
      success: true,
      data: students,
      meta: { total, page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    console.error('Students fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch students' });
  }
});

module.exports = router;
