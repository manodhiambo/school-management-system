import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    // Students statistics
    const studentStats = await query(`
      SELECT
        COUNT(*) as total_students,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_students,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_students
      FROM students
    `);

    // Teachers statistics
    const teacherStats = await query(`
      SELECT
        COUNT(*) as total_teachers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_teachers
      FROM teachers
    `);

    // Parents statistics
    const parentStats = await query('SELECT COUNT(*) as total FROM parents');

    // Classes statistics
    const classStats = await query('SELECT COUNT(*) as total FROM classes');

    // Fee statistics
    const feeStats = await query(`
      SELECT
        COALESCE(SUM(net_amount), 0) as total_amount,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(balance_amount), 0) as total_pending
      FROM fee_invoices
    `);

    // Today's attendance
    const todayAttendance = await query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
      FROM attendance
      WHERE DATE(date) = CURRENT_DATE
    `);

    // Recent admissions
    const recentAdmissions = await query(`
      SELECT first_name, last_name, admission_number, created_at
      FROM students
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Recent payments
    const recentPayments = await query(`
      SELECT fp.amount, fp.payment_date, s.first_name, s.last_name
      FROM fee_payments fp
      JOIN fee_invoices fi ON fp.invoice_id = fi.id
      JOIN students s ON fi.student_id = s.id
      ORDER BY fp.payment_date DESC
      LIMIT 5
    `);

    const data = {
      students: {
        total: parseInt(studentStats[0]?.total_students) || 0,
        active: parseInt(studentStats[0]?.active_students) || 0,
        inactive: parseInt(studentStats[0]?.inactive_students) || 0
      },
      teachers: {
        total: parseInt(teacherStats[0]?.total_teachers) || 0,
        active: parseInt(teacherStats[0]?.active_teachers) || 0
      },
      parents: {
        total: parseInt(parentStats[0]?.total) || 0
      },
      classes: {
        total: parseInt(classStats[0]?.total) || 0
      },
      fees: {
        total_amount: parseFloat(feeStats[0]?.total_amount) || 0,
        total_collected: parseFloat(feeStats[0]?.total_collected) || 0,
        total_pending: parseFloat(feeStats[0]?.total_pending) || 0
      },
      attendance: {
        total: parseInt(todayAttendance[0]?.total) || 0,
        present: parseInt(todayAttendance[0]?.present) || 0,
        absent: parseInt(todayAttendance[0]?.absent) || 0,
        late: parseInt(todayAttendance[0]?.late) || 0
      },
      charts: {
        enrollmentTrend: [],
        feeCollectionTrend: []
      },
      recentAdmissions: recentAdmissions || [],
      recentPayments: recentPayments || []
    };

    logger.info('Dashboard data:', JSON.stringify(data));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Error loading dashboard' });
  }
});

export default router;
