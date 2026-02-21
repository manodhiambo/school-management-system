import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    logger.info('Fetching dashboard stats...');
    const tid = req.user.tenant_id;
    if (!tid) {
      return res.status(403).json({ success: false, message: 'No tenant associated with this account' });
    }

    // Students statistics
    const studentStats = await query(`
      SELECT
        COUNT(*)::int as total_students,
        COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0)::int as active_students,
        COALESCE(SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END), 0)::int as inactive_students
      FROM students
      WHERE tenant_id = $1
    `, [tid]);

    // Teachers statistics
    const teacherStats = await query(`
      SELECT
        COUNT(*)::int as total_teachers,
        COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0)::int as active_teachers
      FROM teachers
      WHERE tenant_id = $1
    `, [tid]);

    // Parents statistics
    const parentStats = await query(
      'SELECT COUNT(*)::int as total FROM parents WHERE tenant_id = $1',
      [tid]
    );

    // Classes statistics
    const classStats = await query(
      'SELECT COUNT(*)::int as total FROM classes WHERE tenant_id = $1',
      [tid]
    );

    // Fee statistics
    const feeStats = await query(`
      SELECT
        COALESCE(SUM(net_amount), 0)::numeric as total_amount,
        COALESCE(SUM(paid_amount), 0)::numeric as total_collected,
        COALESCE(SUM(balance_amount), 0)::numeric as total_pending
      FROM fee_invoices
      WHERE tenant_id = $1
    `, [tid]);

    // Today's attendance
    const todayAttendance = await query(`
      SELECT
        COUNT(*)::int as total,
        COALESCE(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END), 0)::int as present,
        COALESCE(SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END), 0)::int as absent,
        COALESCE(SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END), 0)::int as late
      FROM attendance
      WHERE DATE(date) = CURRENT_DATE AND tenant_id = $1
    `, [tid]);

    // Recent admissions
    const recentAdmissions = await query(`
      SELECT first_name, last_name, admission_number, created_at
      FROM students
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [tid]);

    // Recent payments
    const recentPayments = await query(`
      SELECT fp.amount, fp.payment_date, s.first_name, s.last_name
      FROM fee_payments fp
      JOIN fee_invoices fi ON fp.invoice_id = fi.id
      JOIN students s ON fi.student_id = s.id
      WHERE s.tenant_id = $1
      ORDER BY fp.payment_date DESC
      LIMIT 5
    `, [tid]);

    const studentData = studentStats[0] || {};
    const teacherData = teacherStats[0] || {};
    const feeData = feeStats[0] || {};
    const attendanceData = todayAttendance[0] || {};

    const data = {
      students: {
        total: studentData.total_students || 0,
        active: studentData.active_students || 0,
        inactive: studentData.inactive_students || 0
      },
      teachers: {
        total: teacherData.total_teachers || 0,
        active: teacherData.active_teachers || 0
      },
      parents: {
        total: parentStats[0]?.total || 0
      },
      classes: {
        total: classStats[0]?.total || 0
      },
      fees: {
        total_amount: Number(feeData.total_amount) || 0,
        total_collected: Number(feeData.total_collected) || 0,
        total_pending: Number(feeData.total_pending) || 0
      },
      attendance: {
        total: attendanceData.total || 0,
        present: attendanceData.present || 0,
        absent: attendanceData.absent || 0,
        late: attendanceData.late || 0
      },
      charts: {
        enrollmentTrend: [],
        feeCollectionTrend: []
      },
      recentAdmissions: recentAdmissions || [],
      recentPayments: recentPayments || []
    };

    logger.info('Dashboard data prepared');

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
