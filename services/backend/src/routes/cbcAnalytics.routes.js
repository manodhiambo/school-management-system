import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';

const router = express.Router();

// GET /cbc-analytics/overview  [admin]
router.get('/overview', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    // Students by education_level
    const studentsByLevel = await query(`
      SELECT c.education_level, COUNT(s.id) AS student_count
      FROM students s
      JOIN classes c ON c.id = s.class_id
      WHERE s.status = 'active'
      GROUP BY c.education_level
      ORDER BY c.education_level
    `);

    // Avg performance by level (from exam_results)
    const avgByLevel = await query(`
      SELECT c.education_level,
        ROUND(AVG(CASE WHEN er.max_marks > 0 THEN (er.marks_obtained / er.max_marks) * 100 ELSE 0 END), 2) AS avg_percentage
      FROM exam_results er
      JOIN students s ON s.id = er.student_id
      JOIN classes c ON c.id = s.class_id
      WHERE er.is_absent = false OR er.is_absent IS NULL
      GROUP BY c.education_level
    `);

    // Active exams count
    const activeExams = await query(`
      SELECT COUNT(*) AS count FROM exams
      WHERE is_active = true
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
    `);

    // Overall pass rate
    const passRate = await query(`
      SELECT
        COUNT(*) FILTER (WHERE (marks_obtained / NULLIF(max_marks, 0)) * 100 >= 50) AS passed,
        COUNT(*) AS total
      FROM exam_results
      WHERE (is_absent = false OR is_absent IS NULL) AND max_marks > 0
    `);

    res.json({
      success: true,
      data: {
        students_by_level: studentsByLevel,
        avg_by_level: avgByLevel,
        active_exams: parseInt(activeExams[0]?.count || 0),
        pass_rate: passRate[0] || { passed: 0, total: 0 }
      }
    });
  } catch (error) {
    console.error('CBC overview error:', error);
    res.status(500).json({ success: false, message: 'Error fetching overview' });
  }
});

// GET /cbc-analytics/class/:classId  [admin, teacher]
router.get('/class/:classId', authenticate, async (req, res) => {
  try {
    if (!['admin','teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Student rankings
    const rankings = await query(`
      SELECT
        s.id, s.first_name, s.last_name, s.admission_number,
        ROUND(AVG(CASE WHEN er.max_marks > 0 THEN (er.marks_obtained / er.max_marks) * 100 ELSE 0 END), 2) AS avg_percentage,
        COUNT(er.id) AS exam_count
      FROM students s
      LEFT JOIN exam_results er ON er.student_id = s.id
      WHERE s.class_id = $1 AND s.status = 'active'
      GROUP BY s.id, s.first_name, s.last_name, s.admission_number
      ORDER BY avg_percentage DESC NULLS LAST
    `, [req.params.classId]);

    // Subject performance
    const subjectPerformance = await query(`
      SELECT
        sub.id, sub.name AS subject_name,
        ROUND(AVG(CASE WHEN er.max_marks > 0 THEN (er.marks_obtained / er.max_marks) * 100 ELSE 0 END), 2) AS avg_percentage,
        COUNT(er.id) AS result_count
      FROM exam_results er
      JOIN students s ON s.id = er.student_id
      LEFT JOIN subjects sub ON sub.id = er.subject_id
      WHERE s.class_id = $1 AND (er.is_absent = false OR er.is_absent IS NULL)
      GROUP BY sub.id, sub.name
      ORDER BY avg_percentage DESC NULLS LAST
    `, [req.params.classId]);

    // CBC grade distribution
    const gradeDistribution = await query(`
      SELECT er.cbc_grade, COUNT(*) AS count
      FROM exam_results er
      JOIN students s ON s.id = er.student_id
      WHERE s.class_id = $1 AND er.cbc_grade IS NOT NULL
      GROUP BY er.cbc_grade
      ORDER BY er.cbc_grade
    `, [req.params.classId]);

    res.json({
      success: true,
      data: { rankings, subject_performance: subjectPerformance, grade_distribution: gradeDistribution }
    });
  } catch (error) {
    console.error('CBC class analytics error:', error);
    res.status(500).json({ success: false, message: 'Error fetching class analytics' });
  }
});

// GET /cbc-analytics/student/:studentId  [admin, teacher, student(own), parent(children)]
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const role = req.user.role;

    // Authorization check
    if (role === 'student') {
      const myRecord = await query('SELECT id FROM students WHERE id = $1 AND user_id = $2', [req.params.studentId, req.user.id]);
      if (myRecord.length === 0) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (role === 'parent') {
      const childRecord = await query(`
        SELECT s.id FROM students s
        JOIN parent_students ps ON ps.student_id = s.id
        JOIN parents p ON p.id = ps.parent_id
        WHERE s.id = $1 AND p.user_id = $2
      `, [req.params.studentId, req.user.id]);
      if (childRecord.length === 0) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (!['admin','teacher'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Per-subject CBC grade history (last 5 exams per subject)
    const gradeHistory = await query(`
      SELECT
        sub.name AS subject_name,
        e.name AS exam_name,
        e.start_date,
        er.marks_obtained,
        er.max_marks,
        er.cbc_grade,
        CASE WHEN er.max_marks > 0 THEN ROUND((er.marks_obtained / er.max_marks) * 100, 2) ELSE 0 END AS percentage
      FROM exam_results er
      JOIN exams e ON e.id = er.exam_id
      LEFT JOIN subjects sub ON sub.id = er.subject_id
      WHERE er.student_id = $1
      ORDER BY sub.name, e.start_date DESC
    `, [req.params.studentId]);

    // Attendance correlation
    const attendance = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'present') AS present,
        COUNT(*) FILTER (WHERE status = 'absent') AS absent,
        COUNT(*) FILTER (WHERE status = 'late') AS late,
        COUNT(*) AS total
      FROM attendance
      WHERE student_id = $1
    `, [req.params.studentId]);

    // Class rank
    const studentClass = await query('SELECT class_id FROM students WHERE id = $1', [req.params.studentId]);
    let classRank = null;
    if (studentClass.length > 0) {
      const rankings = await query(`
        SELECT student_id,
          RANK() OVER (ORDER BY AVG(CASE WHEN max_marks > 0 THEN (marks_obtained / max_marks) * 100 ELSE 0 END) DESC) AS rank
        FROM exam_results
        WHERE student_id IN (SELECT id FROM students WHERE class_id = $1 AND status = 'active')
        GROUP BY student_id
      `, [studentClass[0].class_id]);

      const myRank = rankings.find(r => r.student_id === req.params.studentId);
      classRank = myRank ? parseInt(myRank.rank) : null;
    }

    res.json({
      success: true,
      data: {
        grade_history: gradeHistory,
        attendance: attendance[0] || {},
        class_rank: classRank
      }
    });
  } catch (error) {
    console.error('CBC student analytics error:', error);
    res.status(500).json({ success: false, message: 'Error fetching student analytics' });
  }
});

// GET /cbc-analytics/parent-overview  [parent]
router.get('/parent-overview', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ success: false, message: 'Parents only' });
    }

    // Resolve parent_id from user_id
    const parents = await query('SELECT id FROM parents WHERE user_id = $1', [req.user.id]);
    if (parents.length === 0) {
      return res.status(404).json({ success: false, message: 'Parent record not found' });
    }
    const parentId = parents[0].id;

    // All children with latest grades
    const children = await query(`
      SELECT
        s.id, s.first_name, s.last_name, s.admission_number,
        c.name AS class_name, c.education_level,
        (
          SELECT er.cbc_grade
          FROM exam_results er
          JOIN exams e ON e.id = er.exam_id
          WHERE er.student_id = s.id AND er.cbc_grade IS NOT NULL
          ORDER BY e.start_date DESC
          LIMIT 1
        ) AS latest_cbc_grade,
        (
          SELECT ROUND((er.marks_obtained / NULLIF(er.max_marks, 0)) * 100, 1)
          FROM exam_results er
          JOIN exams e ON e.id = er.exam_id
          WHERE er.student_id = s.id AND er.max_marks > 0
          ORDER BY e.start_date DESC
          LIMIT 1
        ) AS latest_percentage
      FROM students s
      JOIN parent_students ps ON ps.student_id = s.id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE ps.parent_id = $1 AND s.status = 'active'
    `, [parentId]);

    // Upcoming exams for children's classes
    const childClassIds = children.map(c => c.id);
    let upcomingExams = [];
    if (childClassIds.length > 0) {
      upcomingExams = await query(`
        SELECT e.*, c.name AS class_name
        FROM exams e
        JOIN classes c ON c.id = e.class_id
        WHERE e.class_id IN (
          SELECT class_id FROM students WHERE id = ANY($1::uuid[]) AND class_id IS NOT NULL
        )
        AND (e.start_date IS NULL OR e.start_date >= NOW())
        AND e.is_active = true
        ORDER BY e.start_date ASC
        LIMIT 10
      `, [childClassIds]);
    }

    res.json({
      success: true,
      data: { children, upcoming_exams: upcomingExams }
    });
  } catch (error) {
    console.error('Parent overview error:', error);
    res.status(500).json({ success: false, message: 'Error fetching parent overview' });
  }
});

// GET /cbc-analytics/subject/:subjectId  [admin, teacher]
router.get('/subject/:subjectId', authenticate, async (req, res) => {
  try {
    if (!['admin','teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Performance by class
    const byClass = await query(`
      SELECT
        c.id AS class_id, c.name AS class_name, c.education_level,
        COUNT(er.id) AS result_count,
        ROUND(AVG(CASE WHEN er.max_marks > 0 THEN (er.marks_obtained / er.max_marks) * 100 ELSE 0 END), 2) AS avg_percentage
      FROM exam_results er
      JOIN students s ON s.id = er.student_id
      JOIN classes c ON c.id = s.class_id
      WHERE er.subject_id = $1 AND (er.is_absent = false OR er.is_absent IS NULL)
      GROUP BY c.id, c.name, c.education_level
      ORDER BY avg_percentage DESC
    `, [req.params.subjectId]);

    // Grade distribution
    const gradeDistribution = await query(`
      SELECT cbc_grade, COUNT(*) AS count
      FROM exam_results
      WHERE subject_id = $1 AND cbc_grade IS NOT NULL
      GROUP BY cbc_grade
      ORDER BY cbc_grade
    `, [req.params.subjectId]);

    // Top 5 students
    const topStudents = await query(`
      SELECT
        s.id, s.first_name, s.last_name,
        ROUND(AVG(CASE WHEN er.max_marks > 0 THEN (er.marks_obtained / er.max_marks) * 100 ELSE 0 END), 2) AS avg_percentage
      FROM exam_results er
      JOIN students s ON s.id = er.student_id
      WHERE er.subject_id = $1 AND (er.is_absent = false OR er.is_absent IS NULL)
      GROUP BY s.id, s.first_name, s.last_name
      ORDER BY avg_percentage DESC
      LIMIT 5
    `, [req.params.subjectId]);

    // Bottom 5 students
    const bottomStudents = await query(`
      SELECT
        s.id, s.first_name, s.last_name,
        ROUND(AVG(CASE WHEN er.max_marks > 0 THEN (er.marks_obtained / er.max_marks) * 100 ELSE 0 END), 2) AS avg_percentage
      FROM exam_results er
      JOIN students s ON s.id = er.student_id
      WHERE er.subject_id = $1 AND (er.is_absent = false OR er.is_absent IS NULL)
      GROUP BY s.id, s.first_name, s.last_name
      ORDER BY avg_percentage ASC
      LIMIT 5
    `, [req.params.subjectId]);

    res.json({
      success: true,
      data: {
        by_class: byClass,
        grade_distribution: gradeDistribution,
        top_students: topStudents,
        bottom_students: bottomStudents
      }
    });
  } catch (error) {
    console.error('CBC subject analytics error:', error);
    res.status(500).json({ success: false, message: 'Error fetching subject analytics' });
  }
});

export default router;
