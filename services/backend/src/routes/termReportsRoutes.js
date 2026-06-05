import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// ─── Ensure term_report_snapshots table exists ────────────────────────────────
(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS term_report_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        class_id UUID,
        term VARCHAR(30),
        academic_year VARCHAR(20),
        report_data JSONB,
        generated_by UUID,
        generated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `, []);
    logger.info('term_report_snapshots table ensured');
  } catch (err) {
    logger.warn('Could not create term_report_snapshots table:', err.message);
  }
})();

// ─── Helper: admin/teacher/finance only ──────────────────────────────────────
function adminOrStaff(req, res, next) {
  const allowed = ['admin', 'superadmin', 'teacher', 'finance_officer'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Admin/Staff only' });
  }
  next();
}

// ─── GET /class/:classId — class term report data ────────────────────────────
router.get('/class/:classId', adminOrStaff, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { classId } = req.params;
    const { term, academic_year } = req.query;

    // Class info
    const classRows = await query(
      `SELECT c.*, u.first_name || ' ' || u.last_name AS teacher_name
       FROM classes c
       LEFT JOIN users u ON u.id = c.teacher_id
       WHERE c.id = $1 AND c.tenant_id = $2`,
      [classId, tid]
    );
    if (!classRows.length) return res.status(404).json({ success: false, message: 'Class not found' });
    const classInfo = classRows[0];

    // Students with their stats
    const studentRows = await query(
      `SELECT s.id, s.first_name || ' ' || s.last_name AS name, s.admission_number,
              COALESCE(att_stats.attendance_days, 0) AS days_present,
              COALESCE(att_stats.total_days, 0) AS total_days,
              CASE WHEN COALESCE(att_stats.total_days, 0) > 0
                   THEN ROUND(COALESCE(att_stats.attendance_days, 0) * 100.0 / att_stats.total_days, 1)
                   ELSE 0
              END AS attendance_pct,
              COALESCE(exam_stats.avg_marks, 0) AS avg_marks,
              COALESCE(exam_stats.exam_count, 0) AS exam_count,
              COALESCE(fee_stats.balance, 0) AS fee_balance
       FROM students s
       LEFT JOIN LATERAL (
         SELECT COUNT(*) FILTER (WHERE a.status = 'present') AS attendance_days,
                COUNT(*) AS total_days
         FROM attendance a
         WHERE a.student_id = s.id AND a.tenant_id = s.tenant_id
           AND ($1::text IS NULL OR a.term = $1)
           AND ($2::text IS NULL OR a.academic_year = $2)
       ) att_stats ON TRUE
       LEFT JOIN LATERAL (
         SELECT ROUND(AVG(r.marks), 1) AS avg_marks,
                COUNT(DISTINCT r.exam_id) AS exam_count
         FROM offline_results r
         JOIN exams e ON e.id = r.exam_id
         WHERE r.student_id = s.id AND r.tenant_id = s.tenant_id
           AND e.is_results_published = TRUE
           AND ($1::text IS NULL OR e.term = $1)
           AND ($2::text IS NULL OR e.academic_year = $2)
       ) exam_stats ON TRUE
       LEFT JOIN LATERAL (
         SELECT COALESCE(fa.balance, 0) AS balance
         FROM fee_accounts fa
         WHERE fa.student_id = s.id AND fa.tenant_id = s.tenant_id
         LIMIT 1
       ) fee_stats ON TRUE
       WHERE s.class_id = $3 AND s.tenant_id = $4 AND s.status = 'active'
       ORDER BY s.first_name, s.last_name`,
      [term || null, academic_year || null, classId, tid]
    );

    res.json({
      success: true,
      data: {
        class_info: classInfo,
        term: term || null,
        academic_year: academic_year || null,
        student_count: studentRows.length,
        students: studentRows
      }
    });
  } catch (err) {
    logger.error('Get class term report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /student/:studentId — individual student report ─────────────────────
router.get('/student/:studentId', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { studentId } = req.params;
    const { term, academic_year } = req.query;

    // Verify access for non-admin roles
    const { role, id: userId } = req.user;
    if (role === 'student') {
      const check = await query(
        `SELECT id FROM students WHERE user_id = $1 AND id = $2 AND tenant_id = $3`,
        [userId, studentId, tid]
      );
      if (!check.length) return res.status(403).json({ success: false, message: 'Access denied' });
    } else if (role === 'parent') {
      const check = await query(
        `SELECT s.id FROM students s WHERE s.parent_id = $1 AND s.id = $2 AND s.tenant_id = $3`,
        [userId, studentId, tid]
      );
      if (!check.length) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Student info
    const studentRows = await query(
      `SELECT s.*,
              s.first_name || ' ' || s.last_name AS full_name,
              c.name AS class_name,
              c.grade_level
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE s.id = $1 AND s.tenant_id = $2`,
      [studentId, tid]
    );
    if (!studentRows.length) return res.status(404).json({ success: false, message: 'Student not found' });
    const student = studentRows[0];

    // Attendance
    const attRows = await query(
      `SELECT COUNT(*) FILTER (WHERE status = 'present') AS present,
              COUNT(*) FILTER (WHERE status = 'absent') AS absent,
              COUNT(*) FILTER (WHERE status = 'late') AS late,
              COUNT(*) AS total
       FROM attendance
       WHERE student_id = $1 AND tenant_id = $2
         AND ($3::text IS NULL OR term = $3)
         AND ($4::text IS NULL OR academic_year = $4)`,
      [studentId, tid, term || null, academic_year || null]
    );
    const att = attRows[0];
    const attendance = {
      present: parseInt(att.present),
      absent: parseInt(att.absent),
      late: parseInt(att.late),
      total: parseInt(att.total),
      percentage: att.total > 0 ? Math.round((parseInt(att.present) / parseInt(att.total)) * 100) : 0
    };

    // Subject performance (latest marks per subject from published exams)
    const subjectRows = await query(
      `SELECT DISTINCT ON (r.subject_id)
              sub.name AS subject, r.marks, r.grade, e.name AS exam_name, e.term
       FROM offline_results r
       JOIN subjects sub ON sub.id = r.subject_id
       JOIN exams e ON e.id = r.exam_id
       WHERE r.student_id = $1 AND r.tenant_id = $2
         AND e.is_results_published = TRUE
         AND ($3::text IS NULL OR e.term = $3)
         AND ($4::text IS NULL OR e.academic_year = $4)
       ORDER BY r.subject_id, e.created_at DESC`,
      [studentId, tid, term || null, academic_year || null]
    );

    const subjects_performance = subjectRows.map(r => ({
      subject: r.subject,
      marks: parseFloat(r.marks) || 0,
      grade: r.grade,
      exam_name: r.exam_name
    }));
    const avg_marks = subjects_performance.length
      ? Math.round(subjects_performance.reduce((s, r) => s + r.marks, 0) / subjects_performance.length * 10) / 10
      : 0;

    // Fee summary
    let fee_summary = { total: 0, paid: 0, balance: 0 };
    try {
      const faRows = await query(
        `SELECT COALESCE(balance, 0) AS balance FROM fee_accounts
         WHERE student_id = $1 AND tenant_id = $2 LIMIT 1`,
        [studentId, tid]
      );
      if (faRows.length) fee_summary.balance = parseFloat(faRows[0].balance) || 0;

      const paidRows = await query(
        `SELECT COALESCE(SUM(amount), 0) AS paid FROM fee_payments
         WHERE student_id = $1 AND tenant_id = $2 AND status = 'confirmed'
           AND ($3::text IS NULL OR term = $3)
           AND ($4::text IS NULL OR academic_year = $4)`,
        [studentId, tid, term || null, academic_year || null]
      );
      fee_summary.paid = parseFloat(paidRows[0].paid) || 0;
    } catch (feeErr) {
      logger.warn('Fee summary query failed for student:', feeErr.message);
    }

    // General remarks
    let general_remarks = 'Good performance. Keep it up.';
    if (avg_marks >= 80) general_remarks = 'Excellent performance! Outstanding results this term.';
    else if (avg_marks >= 60) general_remarks = 'Good performance. Continue to work hard.';
    else if (avg_marks >= 40) general_remarks = 'Fair performance. More effort is needed.';
    else if (avg_marks > 0) general_remarks = 'Below average performance. Significant improvement required.';
    if (attendance.percentage < 70) general_remarks += ' Attendance needs improvement.';

    res.json({
      success: true,
      data: {
        student_info: student,
        term: term || null,
        academic_year: academic_year || null,
        attendance,
        subjects_performance,
        avg_marks,
        fee_summary,
        general_remarks
      }
    });
  } catch (err) {
    logger.error('Get student term report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /school-summary — school-wide stats ──────────────────────────────────
router.get('/school-summary', adminOrStaff, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { term, academic_year } = req.query;

    // Total students enrolled
    const enrolledRows = await query(
      `SELECT COUNT(*) AS total_students FROM students WHERE tenant_id = $1 AND status = 'active'`,
      [tid]
    );

    // Average attendance
    const attRows = await query(
      `SELECT ROUND(
         COUNT(*) FILTER (WHERE a.status = 'present') * 100.0 / NULLIF(COUNT(*), 0), 1
       ) AS avg_attendance_pct
       FROM attendance a
       WHERE a.tenant_id = $1
         AND ($2::text IS NULL OR a.term = $2)
         AND ($3::text IS NULL OR a.academic_year = $3)`,
      [tid, term || null, academic_year || null]
    );

    // Fee collected vs outstanding
    let fee_collected = 0;
    let fee_outstanding = 0;
    try {
      const feeRows = await query(
        `SELECT COALESCE(SUM(fp.amount), 0) AS collected
         FROM fee_payments fp
         WHERE fp.tenant_id = $1 AND fp.status = 'confirmed'
           AND ($2::text IS NULL OR fp.term = $2)
           AND ($3::text IS NULL OR fp.academic_year = $3)`,
        [tid, term || null, academic_year || null]
      );
      fee_collected = parseFloat(feeRows[0].collected) || 0;

      const faRows = await query(
        `SELECT COALESCE(SUM(GREATEST(balance, 0)), 0) AS outstanding
         FROM fee_accounts WHERE tenant_id = $1`,
        [tid]
      );
      fee_outstanding = parseFloat(faRows[0].outstanding) || 0;
    } catch (feeErr) {
      logger.warn('Fee summary failed in school-summary:', feeErr.message);
    }

    // Top performing classes
    const classRows = await query(
      `SELECT c.name AS class_name, c.grade_level,
              ROUND(AVG(r.marks), 1) AS avg_marks,
              COUNT(DISTINCT r.student_id) AS student_count
       FROM offline_results r
       JOIN students s ON s.id = r.student_id
       JOIN classes c ON c.id = s.class_id
       JOIN exams e ON e.id = r.exam_id
       WHERE r.tenant_id = $1 AND e.is_results_published = TRUE
         AND ($2::text IS NULL OR e.term = $2)
         AND ($3::text IS NULL OR e.academic_year = $3)
       GROUP BY c.id, c.name, c.grade_level
       ORDER BY avg_marks DESC
       LIMIT 10`,
      [tid, term || null, academic_year || null]
    );

    res.json({
      success: true,
      data: {
        term: term || null,
        academic_year: academic_year || null,
        total_students: parseInt(enrolledRows[0].total_students),
        avg_attendance_pct: parseFloat(attRows[0].avg_attendance_pct) || 0,
        fee_collected,
        fee_outstanding,
        top_performing_classes: classRows
      }
    });
  } catch (err) {
    logger.error('Get school summary error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /generate-all — generate and save snapshots for all classes ─────────
router.post('/generate-all', adminOrStaff, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { term, academic_year } = req.body;
    if (!term || !academic_year) {
      return res.status(400).json({ success: false, message: 'term and academic_year are required' });
    }

    // Get all active classes
    const classes = await query(
      `SELECT id, name, grade_level FROM classes WHERE tenant_id = $1 ORDER BY name`,
      [tid]
    );

    const snapshots = [];
    const errors = [];

    for (const cls of classes) {
      try {
        const studentRows = await query(
          `SELECT s.id, s.first_name || ' ' || s.last_name AS name, s.admission_number,
                  COALESCE(att_stats.attendance_days, 0) AS days_present,
                  COALESCE(att_stats.total_days, 0) AS total_days,
                  CASE WHEN COALESCE(att_stats.total_days, 0) > 0
                       THEN ROUND(COALESCE(att_stats.attendance_days, 0) * 100.0 / att_stats.total_days, 1)
                       ELSE 0
                  END AS attendance_pct,
                  COALESCE(exam_stats.avg_marks, 0) AS avg_marks,
                  COALESCE(exam_stats.exam_count, 0) AS exam_count
           FROM students s
           LEFT JOIN LATERAL (
             SELECT COUNT(*) FILTER (WHERE a.status = 'present') AS attendance_days,
                    COUNT(*) AS total_days
             FROM attendance a
             WHERE a.student_id = s.id AND a.tenant_id = s.tenant_id
               AND a.term = $1 AND a.academic_year = $2
           ) att_stats ON TRUE
           LEFT JOIN LATERAL (
             SELECT ROUND(AVG(r.marks), 1) AS avg_marks,
                    COUNT(DISTINCT r.exam_id) AS exam_count
             FROM offline_results r
             JOIN exams e ON e.id = r.exam_id
             WHERE r.student_id = s.id AND r.tenant_id = s.tenant_id
               AND e.is_results_published = TRUE
               AND e.term = $1 AND e.academic_year = $2
           ) exam_stats ON TRUE
           WHERE s.class_id = $3 AND s.tenant_id = $4 AND s.status = 'active'
           ORDER BY s.first_name, s.last_name`,
          [term, academic_year, cls.id, tid]
        );

        const reportData = {
          class_id: cls.id,
          class_name: cls.name,
          grade_level: cls.grade_level,
          term,
          academic_year,
          student_count: studentRows.length,
          generated_at: new Date().toISOString(),
          students: studentRows
        };

        // Save snapshot — attempt upsert, fall back to plain insert if no unique constraint
        let snapshotRows;
        try {
          snapshotRows = await query(
            `INSERT INTO term_report_snapshots
               (tenant_id, class_id, term, academic_year, report_data, generated_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (tenant_id, class_id, term, academic_year) DO UPDATE SET
               report_data = EXCLUDED.report_data,
               generated_by = EXCLUDED.generated_by,
               generated_at = NOW()
             RETURNING id`,
            [tid, cls.id, term, academic_year, JSON.stringify(reportData), req.user.id]
          );
        } catch {
          snapshotRows = await query(
            `INSERT INTO term_report_snapshots
               (tenant_id, class_id, term, academic_year, report_data, generated_by)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [tid, cls.id, term, academic_year, JSON.stringify(reportData), req.user.id]
          );
        }

        snapshots.push({
          class_id: cls.id,
          class_name: cls.name,
          snapshot_id: snapshotRows[0]?.id,
          student_count: studentRows.length
        });
      } catch (classErr) {
        logger.error(`Snapshot generation failed for class ${cls.id}:`, classErr.message);
        errors.push({ class_id: cls.id, class_name: cls.name, error: classErr.message });
      }
    }

    res.json({
      success: true,
      data: {
        term,
        academic_year,
        classes_processed: snapshots.length,
        errors_count: errors.length,
        snapshots,
        errors
      }
    });
  } catch (err) {
    logger.error('Generate all reports error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
