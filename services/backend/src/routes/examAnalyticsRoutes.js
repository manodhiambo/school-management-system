import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// ─── Grade helpers ────────────────────────────────────────────────────────────
function letterGrade(percentage) {
  if (percentage >= 80) return 'A';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'E';
}

function isAdminOrTeacher(role) {
  return role === 'admin' || role === 'superadmin' || role === 'teacher';
}

// ─── GET /exam/:examId/summary ─────────────────────────────────────────────
// Overall stats: total students, average, highest, lowest, pass rate, grade distribution
router.get('/exam/:examId/summary', async (req, res) => {
  try {
    const role = req.user.role;
    if (!isAdminOrTeacher(role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const tid = req.user.tenant_id;
    const { examId } = req.params;

    // Verify exam belongs to tenant
    const examRows = await query(
      `SELECT e.*, c.name AS class_name, c.education_level
       FROM exams e
       LEFT JOIN classes c ON c.id = e.class_id
       WHERE e.id = $1 AND e.tenant_id = $2`,
      [examId, tid]
    );
    if (examRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    const exam = examRows[0];

    // Aggregate results per student (average across subjects for this exam)
    const resultsRows = await query(
      `SELECT
         er.student_id,
         AVG(CASE WHEN er.is_absent THEN NULL
                  ELSE (er.marks_obtained::numeric / NULLIF(er.max_marks, 0)) * 100
             END) AS percentage
       FROM exam_results er
       WHERE er.exam_id = $1 AND er.tenant_id = $2
         AND er.is_absent = FALSE
       GROUP BY er.student_id`,
      [examId, tid]
    );

    if (resultsRows.length === 0) {
      return res.json({
        success: true,
        data: {
          exam,
          total_students: 0,
          average: null,
          highest: null,
          lowest: null,
          pass_rate: null,
          grade_distribution: { A: 0, B: 0, C: 0, D: 0, E: 0 },
        },
      });
    }

    const percentages = resultsRows
      .map(r => parseFloat(r.percentage))
      .filter(p => !isNaN(p));

    const average = percentages.reduce((s, p) => s + p, 0) / percentages.length;
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    const passCount = percentages.filter(p => p >= 50).length;
    const passRate = (passCount / percentages.length) * 100;

    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    for (const p of percentages) {
      const g = letterGrade(p);
      gradeDistribution[g]++;
    }

    res.json({
      success: true,
      data: {
        exam,
        total_students: percentages.length,
        average: parseFloat(average.toFixed(2)),
        highest: parseFloat(highest.toFixed(2)),
        lowest: parseFloat(lowest.toFixed(2)),
        pass_rate: parseFloat(passRate.toFixed(2)),
        grade_distribution: gradeDistribution,
      },
    });
  } catch (err) {
    logger.error('Exam summary error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /exam/:examId/class-comparison ───────────────────────────────────────
// Compare average per class (useful for exams shared across multiple classes)
router.get('/exam/:examId/class-comparison', async (req, res) => {
  try {
    const role = req.user.role;
    if (!isAdminOrTeacher(role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const tid = req.user.tenant_id;
    const { examId } = req.params;

    const examRows = await query(
      'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
      [examId, tid]
    );
    if (examRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const rows = await query(
      `SELECT
         c.id AS class_id,
         c.name AS class_name,
         COUNT(DISTINCT er.student_id)::int AS student_count,
         ROUND(
           AVG(
             CASE WHEN er.is_absent THEN NULL
                  ELSE (er.marks_obtained::numeric / NULLIF(er.max_marks, 0)) * 100
             END
           )::numeric, 2
         ) AS average_percentage
       FROM exam_results er
       JOIN students s ON s.id = er.student_id
       JOIN classes c ON c.id = s.class_id
       WHERE er.exam_id = $1 AND er.tenant_id = $2
         AND er.is_absent = FALSE
       GROUP BY c.id, c.name
       ORDER BY average_percentage DESC NULLS LAST`,
      [examId, tid]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Class comparison error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /student/:studentId/performance ──────────────────────────────────────
// Student's results across all exams: subject averages, trend, weakest/strongest
router.get('/student/:studentId/performance', async (req, res) => {
  try {
    const role = req.user.role;
    const tid = req.user.tenant_id;
    const { studentId } = req.params;

    // Students can only see their own data
    if (role === 'student') {
      const ownRows = await query(
        'SELECT id FROM students WHERE id = $1 AND user_id = $2 AND tenant_id = $3',
        [studentId, req.user.id, tid]
      );
      if (ownRows.length === 0) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (!isAdminOrTeacher(role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Verify student belongs to tenant
    const studentRows = await query(
      `SELECT s.*, c.name AS class_name
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE s.id = $1 AND s.tenant_id = $2`,
      [studentId, tid]
    );
    if (studentRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const student = studentRows[0];

    // All results for this student
    const results = await query(
      `SELECT
         er.*,
         e.title AS exam_title,
         e.created_at AS exam_date,
         sub.name AS subject_name,
         ROUND(
           (er.marks_obtained::numeric / NULLIF(er.max_marks, 0)) * 100, 2
         ) AS percentage
       FROM exam_results er
       JOIN exams e ON e.id = er.exam_id
       LEFT JOIN subjects sub ON sub.id = er.subject_id
       WHERE er.student_id = $1 AND er.tenant_id = $2
         AND er.is_absent = FALSE
       ORDER BY e.created_at ASC`,
      [studentId, tid]
    );

    // Subject-level averages
    const subjectMap = {};
    for (const r of results) {
      const key = r.subject_name || 'General';
      if (!subjectMap[key]) subjectMap[key] = [];
      subjectMap[key].push(parseFloat(r.percentage));
    }

    const subjectAverages = Object.entries(subjectMap).map(([subject, scores]) => ({
      subject,
      average: parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)),
      exams_count: scores.length,
    }));

    subjectAverages.sort((a, b) => b.average - a.average);

    const weakest = subjectAverages[subjectAverages.length - 1] || null;
    const strongest = subjectAverages[0] || null;

    // Overall trend (one data point per exam ordered by date)
    const trend = results.map(r => ({
      exam_title: r.exam_title,
      exam_date: r.exam_date,
      subject: r.subject_name,
      percentage: parseFloat(r.percentage),
    }));

    res.json({
      success: true,
      data: {
        student,
        subject_averages: subjectAverages,
        strongest_subject: strongest,
        weakest_subject: weakest,
        trend,
        total_exams: results.length,
      },
    });
  } catch (err) {
    logger.error('Student performance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /class/:classId/report ───────────────────────────────────────────────
// Class performance matrix: each student's average across subjects, ranked
router.get('/class/:classId/report', async (req, res) => {
  try {
    const role = req.user.role;
    if (!isAdminOrTeacher(role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const tid = req.user.tenant_id;
    const { classId } = req.params;

    const classRows = await query(
      'SELECT id, name FROM classes WHERE id = $1 AND tenant_id = $2',
      [classId, tid]
    );
    if (classRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }
    const cls = classRows[0];

    // Per-student average across all exams and subjects in this class
    const rows = await query(
      `SELECT
         s.id AS student_id,
         s.first_name || ' ' || s.last_name AS student_name,
         s.admission_number,
         COUNT(DISTINCT er.exam_id)::int AS exams_taken,
         ROUND(
           AVG(
             (er.marks_obtained::numeric / NULLIF(er.max_marks, 0)) * 100
           )::numeric, 2
         ) AS average_percentage
       FROM students s
       JOIN exam_results er ON er.student_id = s.id AND er.tenant_id = $1
       JOIN exams e ON e.id = er.exam_id AND e.class_id = $2
       WHERE s.class_id = $2 AND s.tenant_id = $1
         AND er.is_absent = FALSE
       GROUP BY s.id, s.first_name, s.last_name, s.admission_number
       ORDER BY average_percentage DESC NULLS LAST`,
      [tid, classId]
    );

    // Add rank
    const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }));

    res.json({ success: true, data: { class: cls, students: ranked } });
  } catch (err) {
    logger.error('Class report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /subject/:subjectId/trends ───────────────────────────────────────────
// Average score per exam/term for this subject
router.get('/subject/:subjectId/trends', async (req, res) => {
  try {
    const role = req.user.role;
    if (!isAdminOrTeacher(role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const tid = req.user.tenant_id;
    const { subjectId } = req.params;
    const { class_id } = req.query;

    const subjectRows = await query(
      'SELECT id, name FROM subjects WHERE id = $1 AND tenant_id = $2',
      [subjectId, tid]
    );
    if (subjectRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    const subject = subjectRows[0];

    const conditions = ['er.subject_id = $1', 'er.tenant_id = $2', 'er.is_absent = FALSE'];
    const params = [subjectId, tid];

    if (class_id) {
      params.push(class_id);
      conditions.push(`e.class_id = $${params.length}`);
    }

    const where = conditions.join(' AND ');

    const rows = await query(
      `SELECT
         e.id AS exam_id,
         e.title AS exam_title,
         e.created_at AS exam_date,
         c.name AS class_name,
         COUNT(DISTINCT er.student_id)::int AS student_count,
         ROUND(
           AVG(
             (er.marks_obtained::numeric / NULLIF(er.max_marks, 0)) * 100
           )::numeric, 2
         ) AS average_percentage,
         ROUND(MAX((er.marks_obtained::numeric / NULLIF(er.max_marks, 0)) * 100)::numeric, 2) AS highest,
         ROUND(MIN((er.marks_obtained::numeric / NULLIF(er.max_marks, 0)) * 100)::numeric, 2) AS lowest
       FROM exam_results er
       JOIN exams e ON e.id = er.exam_id
       LEFT JOIN classes c ON c.id = e.class_id
       WHERE ${where}
       GROUP BY e.id, e.title, e.created_at, c.name
       ORDER BY e.created_at ASC`,
      params
    );

    res.json({ success: true, data: { subject, trends: rows } });
  } catch (err) {
    logger.error('Subject trends error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
