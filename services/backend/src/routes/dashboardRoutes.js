import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    logger.info('Loading dashboard stats...');

    // Students statistics
    const studentStats = await query(`
      SELECT
        COUNT(*)::integer as total_students,
        COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0)::integer as active_students,
        COALESCE(SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END), 0)::integer as inactive_students
      FROM students
    `);
    logger.info('Student stats:', studentStats[0]);

    // Teachers statistics
    const teacherStats = await query(`
      SELECT
        COUNT(*)::integer as total_teachers,
        COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0)::integer as active_teachers
      FROM teachers
    `);
    logger.info('Teacher stats:', teacherStats[0]);

    // Parents statistics
    const parentStats = await query('SELECT COUNT(*)::integer as total FROM parents');

    // Classes statistics
    const classStats = await query('SELECT COUNT(*)::integer as total FROM classes');

    // Fee statistics
    const feeStats = await query(`
      SELECT
        COALESCE(SUM(net_amount), 0)::numeric as total_amount,
        COALESCE(SUM(paid_amount), 0)::numeric as total_collected,
        COALESCE(SUM(balance_amount), 0)::numeric as total_pending
      FROM fee_invoices
    `);

    // Today's attendance
    const todayAttendance = await query(`
      SELECT
        COUNT(*)::integer as total,
        COALESCE(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END), 0)::integer as present,
        COALESCE(SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END), 0)::integer as absent,
        COALESCE(SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END), 0)::integer as late
      FROM attendance
      WHERE DATE(date) = CURRENT_DATE
    `);

    // Build response with proper number conversion
    const data = {
      students: {
        total: Number(studentStats[0]?.total_students) || 0,
        active: Number(studentStats[0]?.active_students) || 0,
        inactive: Number(studentStats[0]?.inactive_students) || 0
      },
      teachers: {
        total: Number(teacherStats[0]?.total_teachers) || 0,
        active: Number(teacherStats[0]?.active_teachers) || 0
      },
      parents: {
        total: Number(parentStats[0]?.total) || 0
      },
      classes: {
        total: Number(classStats[0]?.total) || 0
      },
      fees: {
        total_amount: Number(feeStats[0]?.total_amount) || 0,
        total_collected: Number(feeStats[0]?.total_collected) || 0,
        total_pending: Number(feeStats[0]?.total_pending) || 0
      },
      attendance: {
        total: Number(todayAttendance[0]?.total) || 0,
        present: Number(todayAttendance[0]?.present) || 0,
        absent: Number(todayAttendance[0]?.absent) || 0,
        late: Number(todayAttendance[0]?.late) || 0
      }
    };

    logger.info('Dashboard data:', JSON.stringify(data));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Error loading dashboard', error: error.message });
  }
});

export default router;
