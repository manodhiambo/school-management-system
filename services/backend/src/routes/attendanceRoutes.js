import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { sendStudentAlert } from './parentAlertsRoutes.js';
import requireRole from '../middleware/roleMiddleware.js';
import { isAssignedToClass } from '../utils/teacherAssignment.js';

const router = express.Router();

router.use(authenticate);
router.use(tenantContext);
router.use(requireActiveTenant);

// Get attendance
router.get('/', async (req, res) => {
  try {
    const { classId, date, studentId } = req.query;
    const tid = req.user.tenant_id;

    let sql = `
      SELECT a.*, s.first_name, s.last_name, s.admission_number, c.name as class_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.tenant_id = $1
    `;
    const params = [tid];
    let paramIndex = 2;

    if (classId) {
      sql += ` AND s.class_id = $${paramIndex}`;
      params.push(classId);
      paramIndex++;
    }

    if (date) {
      sql += ` AND DATE(a.date) = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    if (studentId) {
      sql += ` AND a.student_id = $${paramIndex}`;
      params.push(studentId);
      paramIndex++;
    }

    sql += ' ORDER BY a.date DESC, s.first_name';

    const attendance = await query(sql, params);
    res.json({ success: true, data: attendance });
  } catch (error) {
    logger.error('Get attendance error:', error);
    res.status(500).json({ success: false, message: 'Error fetching attendance' });
  }
});

// Get attendance statistics
router.get('/statistics', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const stats = await query(`
      SELECT
        COUNT(*)::int as total,
        COALESCE(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END), 0)::int as present,
        COALESCE(SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END), 0)::int as absent,
        COALESCE(SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END), 0)::int as late
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE DATE(a.date) = CURRENT_DATE AND s.tenant_id = $1
    `, [tid]);
    res.json({ success: true, data: stats[0] || { total: 0, present: 0, absent: 0, late: 0 } });
  } catch (error) {
    logger.error('Get attendance statistics error:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
});

// Get attendance by class
router.get('/class/:classId', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { date } = req.query;
    const attendance = await query(`
      SELECT a.*, s.first_name, s.last_name, s.admission_number
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE s.class_id = $1 AND DATE(a.date) = $2 AND s.tenant_id = $3
      ORDER BY s.first_name
    `, [req.params.classId, date || new Date().toISOString().split('T')[0], tid]);

    res.json({ success: true, data: attendance });
  } catch (error) {
    logger.error('Get class attendance error:', error);
    res.status(500).json({ success: false, message: 'Error fetching attendance' });
  }
});

// Get student attendance
router.get('/student/:studentId', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { role, id: callerId } = req.user;
    const studentId = req.params.studentId;

    const student = await query(
      'SELECT id FROM students WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
      [studentId, tid]
    );

    const actualStudentId = student.length > 0 ? student[0].id : studentId;

    // Parents may only view attendance for their own children
    if (role === 'parent') {
      const access = await query(
        `SELECT 1 FROM parent_students ps
         JOIN parents p ON p.id = ps.parent_id
         WHERE ps.student_id = $1 AND p.user_id = $2`,
        [actualStudentId, callerId]
      );
      if (!access.length) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const attendance = await query(`
      SELECT a.* FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.student_id = $1 AND s.tenant_id = $2
      ORDER BY a.date DESC
    `, [actualStudentId, tid]);

    res.json({ success: true, data: attendance });
  } catch (error) {
    logger.error('Get student attendance error:', error);
    res.status(500).json({ success: false, message: 'Error fetching attendance' });
  }
});

// Mark attendance (single)
router.post('/', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    logger.info('Mark attendance request:', JSON.stringify(req.body));
    const tid = req.user.tenant_id;

    const { studentId, student_id, date, status } = req.body;
    const actualStudentId = studentId || student_id;
    const actualDate = date || new Date().toISOString().split('T')[0];
    const actualStatus = status || 'present';

    if (!actualStudentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required' });
    }

    // Verify student belongs to this tenant
    const studentCheck = await query(
      'SELECT id, class_id FROM students WHERE id = $1 AND tenant_id = $2',
      [actualStudentId, tid]
    );
    if (studentCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'Student not found' });
    }

    if (req.user.role === 'teacher' && !(await isAssignedToClass(req.user.id, studentCheck[0].class_id, tid))) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this class' });
    }

    const existing = await query(
      'SELECT id FROM attendance WHERE student_id = $1 AND DATE(date) = $2',
      [actualStudentId, actualDate]
    );

    if (existing.length > 0) {
      await query(
        `UPDATE attendance SET status = $1 WHERE id = $2`,
        [actualStatus, existing[0].id]
      );
    } else {
      const attendanceId = uuidv4();
      await query(
        `INSERT INTO attendance (id, student_id, date, status, tenant_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [attendanceId, actualStudentId, actualDate, actualStatus, tid]
      );
    }

    res.json({ success: true, message: 'Attendance marked successfully' });
  } catch (error) {
    logger.error('Mark attendance error:', error);
    res.status(500).json({ success: false, message: 'Error marking attendance' });
  }
});

// Mark bulk attendance
router.post('/bulk', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    logger.info('Bulk attendance request:', JSON.stringify(req.body));
    const tid = req.user.tenant_id;

    const { attendances, classId, date } = req.body;
    const actualDate = date || new Date().toISOString().split('T')[0];

    if (!attendances || !Array.isArray(attendances)) {
      return res.status(400).json({ success: false, message: 'Attendances array is required' });
    }

    if (req.user.role === 'teacher' && !(await isAssignedToClass(req.user.id, classId, tid))) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this class' });
    }

    let processed = 0;
    for (const record of attendances) {
      const studentId = record.studentId || record.student_id;
      const status = record.status || 'present';

      if (!studentId) continue;

      // Only mark students who actually belong to the declared, authorized class
      const studentCheck = await query(
        'SELECT id FROM students WHERE id = $1 AND tenant_id = $2' + (classId ? ' AND class_id = $3' : ''),
        classId ? [studentId, tid, classId] : [studentId, tid]
      );
      if (studentCheck.length === 0) continue;

      const existing = await query(
        'SELECT id FROM attendance WHERE student_id = $1 AND DATE(date) = $2',
        [studentId, actualDate]
      );

      if (existing.length > 0) {
        await query(
          'UPDATE attendance SET status = $1 WHERE id = $2',
          [status, existing[0].id]
        );
      } else {
        const attendanceId = uuidv4();
        await query(
          `INSERT INTO attendance (id, student_id, date, status, tenant_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [attendanceId, studentId, actualDate, status, tid]
        );
      }
      processed++;
    }

    logger.info(`Bulk attendance: processed ${processed} records`);
    res.json({ success: true, message: `Attendance marked for ${processed} students` });
  } catch (error) {
    logger.error('Bulk attendance error:', error);
    res.status(500).json({ success: false, message: 'Error marking bulk attendance', error: error.message });
  }
});

// Legacy route for marking attendance
router.post('/mark', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { studentId, date, status } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required' });
    }

    const studentCheck = await query(
      'SELECT id, class_id FROM students WHERE id = $1 AND tenant_id = $2',
      [studentId, tid]
    );
    if (studentCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'Student not found' });
    }
    if (req.user.role === 'teacher' && !(await isAssignedToClass(req.user.id, studentCheck[0].class_id, tid))) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this class' });
    }

    const actualDate = date || new Date().toISOString().split('T')[0];

    const existing = await query(
      'SELECT id FROM attendance WHERE student_id = $1 AND DATE(date) = $2',
      [studentId, actualDate]
    );

    if (existing.length > 0) {
      await query(
        'UPDATE attendance SET status = $1 WHERE id = $2',
        [status || 'present', existing[0].id]
      );
    } else {
      const attendanceId = uuidv4();
      await query(
        `INSERT INTO attendance (id, student_id, date, status, tenant_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [attendanceId, studentId, actualDate, status || 'present', tid]
      );
    }

    res.json({ success: true, message: 'Attendance marked successfully' });
  } catch (error) {
    logger.error('Mark attendance error:', error);
    res.status(500).json({ success: false, message: 'Error marking attendance' });
  }
});

// ============================================================
// GET /attendance/report/monthly
// Returns per-student monthly summary + daily records
// Query params: month (YYYY-MM), classId (optional)
// ============================================================
router.get('/report/monthly', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { month, classId } = req.query;

    // Validate month param
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'month param required (YYYY-MM)' });
    }

    const [year, mon] = month.split('-');
    const startDate = `${year}-${mon}-01`;
    // Last day of month
    const endDate = new Date(parseInt(year), parseInt(mon), 0).toISOString().split('T')[0];

    // Get distinct school days in that month that have attendance records
    let daysSql = `
      SELECT DISTINCT DATE(a.date)::text AS day
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      WHERE s.tenant_id = $1
        AND DATE(a.date) >= $2::date
        AND DATE(a.date) <= $3::date
    `;
    const dayParams = [tid, startDate, endDate];
    if (classId) {
      daysSql += ` AND s.class_id = $4`;
      dayParams.push(classId);
    }
    daysSql += ' ORDER BY day';
    const schoolDays = (await query(daysSql, dayParams)).map(r => r.day);

    // Per-student summary
    let summSql = `
      SELECT
        s.id AS student_id,
        s.first_name, s.last_name, s.admission_number,
        c.name AS class_name,
        COUNT(*)::int AS total_days,
        COUNT(*) FILTER (WHERE a.status = 'present')::int AS present,
        COUNT(*) FILTER (WHERE a.status = 'absent')::int  AS absent,
        COUNT(*) FILTER (WHERE a.status = 'late')::int    AS late,
        COUNT(*) FILTER (WHERE a.status = 'excused')::int AS excused
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.tenant_id = $1
        AND DATE(a.date) >= $2::date
        AND DATE(a.date) <= $3::date
    `;
    const summParams = [tid, startDate, endDate];
    if (classId) {
      summSql += ` AND s.class_id = $4`;
      summParams.push(classId);
    }
    summSql += ' GROUP BY s.id, s.first_name, s.last_name, s.admission_number, c.name ORDER BY c.name, s.first_name';

    const students = await query(summSql, summParams);

    // Daily records (for grid)
    let dailySql = `
      SELECT a.student_id, DATE(a.date)::text AS day, a.status
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      WHERE s.tenant_id = $1
        AND DATE(a.date) >= $2::date
        AND DATE(a.date) <= $3::date
    `;
    const dailyParams = [tid, startDate, endDate];
    if (classId) {
      dailySql += ` AND s.class_id = $4`;
      dailyParams.push(classId);
    }
    const dailyRows = await query(dailySql, dailyParams);

    // Map daily rows: { student_id -> { day -> status } }
    const dailyMap = {};
    for (const row of dailyRows) {
      if (!dailyMap[row.student_id]) dailyMap[row.student_id] = {};
      dailyMap[row.student_id][row.day] = row.status;
    }

    res.json({
      success: true,
      data: {
        month,
        school_days: schoolDays,
        students: students.map(s => ({
          ...s,
          attendance_rate: s.total_days > 0 ? ((s.present / s.total_days) * 100).toFixed(1) : '0.0',
          daily: dailyMap[s.student_id] || {},
        })),
      },
    });
  } catch (error) {
    logger.error('Monthly report error:', error);
    res.status(500).json({ success: false, message: 'Error generating monthly report' });
  }
});

// ============================================================
// POST /attendance/notify-absent
// Sends absence notifications to parents for a given date
// Body: { date (YYYY-MM-DD), classId (optional) }
// ============================================================
router.post('/notify-absent', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { date, classId } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get absent students for the date
    let sql = `
      SELECT a.student_id, s.first_name, s.last_name, s.admission_number, c.name AS class_name
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.tenant_id = $1
        AND DATE(a.date) = $2::date
        AND a.status = 'absent'
    `;
    const params = [tid, targetDate];
    if (classId) {
      sql += ` AND s.class_id = $3`;
      params.push(classId);
    }
    sql += ' ORDER BY c.name, s.first_name';
    const absentStudents = await query(sql, params);

    if (absentStudents.length === 0) {
      return res.json({ success: true, message: 'No absent students found for this date', data: { sent: 0, students: [] } });
    }

    // Format date nicely for the message
    const dateObj = new Date(targetDate + 'T12:00:00');
    const prettyDate = dateObj.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let totalSent = 0;
    const results = [];
    for (const student of absentStudents) {
      const fullName = `${student.first_name} ${student.last_name}`;
      const className = student.class_name || 'school';
      const title = `Absence Alert — ${fullName}`;
      const message = `Dear Parent/Guardian, this is to inform you that ${fullName} (${student.admission_number}) was marked absent from ${className} on ${prettyDate}. Please contact the school if you have any concerns.`;

      const sentCount = await sendStudentAlert(
        student.student_id,
        'attendance_absent',
        title,
        message,
        'attendance',
        null,
        tid
      );
      totalSent += sentCount;
      results.push({ student_id: student.student_id, name: fullName, admission_number: student.admission_number, class_name: student.class_name, parents_notified: sentCount });
    }

    res.json({
      success: true,
      message: `Absence notifications sent for ${absentStudents.length} student(s) — ${totalSent} parent alert(s) created`,
      data: { sent: totalSent, students: results },
    });
  } catch (error) {
    logger.error('Notify absent error:', error);
    res.status(500).json({ success: false, message: 'Error sending absence notifications' });
  }
});

// ============================================================
// GET /attendance/absent-today — preview absent students for a date
// Query params: date (YYYY-MM-DD), classId (optional)
// ============================================================
router.get('/absent-preview', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { date, classId } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    let sql = `
      SELECT a.student_id, s.first_name, s.last_name, s.admission_number, c.name AS class_name,
             a.status
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.tenant_id = $1
        AND DATE(a.date) = $2::date
        AND a.status = 'absent'
    `;
    const params = [tid, targetDate];
    if (classId) {
      sql += ` AND s.class_id = $3`;
      params.push(classId);
    }
    sql += ' ORDER BY c.name, s.first_name';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Absent preview error:', error);
    res.status(500).json({ success: false, message: 'Error fetching absent students' });
  }
});

export default router;
