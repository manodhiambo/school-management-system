import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.use(authenticate);
router.use(tenantContext);
router.use(requireActiveTenant);

function computeCBCGrade(percentage, educationLevel) {
  if (['playgroup','pre_primary','lower_primary','upper_primary'].includes(educationLevel)) {
    if (percentage >= 75) return 'EE';
    if (percentage >= 50) return 'ME';
    if (percentage >= 25) return 'AE';
    return 'BE';
  }
  if (['junior_secondary','senior_secondary'].includes(educationLevel)) {
    if (percentage >= 75) return 'A';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 35) return 'D';
    return 'E';
  }
  if (percentage >= 70) return 'First Class';
  if (percentage >= 60) return 'Second Upper';
  if (percentage >= 50) return 'Second Lower';
  if (percentage >= 40) return 'Pass';
  return 'Fail';
}

// POST /offline-results/bulk  [admin, teacher]
router.post('/bulk', async (req, res) => {
  try {
    if (!['admin','teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const tenantId = req.tenantId;
    const { exam_id, results } = req.body;

    if (!exam_id || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ success: false, message: 'exam_id and results[] are required' });
    }

    // Verify exam belongs to this tenant
    const exams = await query(`
      SELECT e.*, c.education_level
      FROM exams e
      LEFT JOIN classes c ON c.id = e.class_id
      WHERE e.id = $1 AND e.tenant_id = $2
    `, [exam_id, tenantId]);

    if (exams.length === 0) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const educationLevel = exams[0].education_level || 'lower_primary';

    let successCount = 0;
    const errors = [];

    for (const result of results) {
      try {
        const { student_id, subject_id, marks_obtained, max_marks, remarks, is_absent } = result;

        if (!student_id) {
          errors.push({ student_id, error: 'student_id is required' });
          continue;
        }

        // Verify student belongs to this tenant
        const studentCheck = await query(
          'SELECT id FROM students WHERE id = $1 AND tenant_id = $2',
          [student_id, tenantId]
        );
        if (studentCheck.length === 0) {
          errors.push({ student_id, error: 'Student not found in this school' });
          continue;
        }

        const percentage = max_marks > 0 ? (marks_obtained / max_marks) * 100 : 0;
        const cbcGrade = is_absent ? null : computeCBCGrade(percentage, educationLevel);

        const existing = await query(
          'SELECT id FROM exam_results WHERE exam_id = $1 AND student_id = $2 AND tenant_id = $3 AND (subject_id = $4 OR ($4::uuid IS NULL AND subject_id IS NULL))',
          [exam_id, student_id, tenantId, subject_id || null]
        );

        if (existing.length > 0) {
          await query(
            `UPDATE exam_results
             SET marks_obtained=$1, max_marks=$2, remarks=$3, cbc_grade=$4, is_absent=$5, updated_at=NOW()
             WHERE id=$6`,
            [marks_obtained || 0, max_marks || 100, remarks || null, cbcGrade, is_absent || false, existing[0].id]
          );
        } else {
          await query(
            `INSERT INTO exam_results (id, tenant_id, exam_id, student_id, subject_id, marks_obtained, max_marks, remarks, cbc_grade, is_absent)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [uuidv4(), tenantId, exam_id, student_id, subject_id || null, marks_obtained || 0, max_marks || 100, remarks || null, cbcGrade, is_absent || false]
          );
        }

        successCount++;
      } catch (err) {
        errors.push({ student_id: result.student_id, error: err.message });
      }
    }

    res.json({ success: true, data: { success_count: successCount, errors } });
  } catch (error) {
    console.error('Bulk results error:', error);
    res.status(500).json({ success: false, message: 'Error saving results' });
  }
});

// GET /offline-results/:examId  [admin, teacher]
router.get('/:examId', async (req, res) => {
  try {
    if (!['admin','teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const tenantId = req.tenantId;

    // Verify exam belongs to this tenant
    const examCheck = await query('SELECT id FROM exams WHERE id = $1 AND tenant_id = $2', [req.params.examId, tenantId]);
    if (examCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const results = await query(`
      SELECT er.*,
        s.first_name, s.last_name, s.admission_number,
        sub.name AS subject_name
      FROM exam_results er
      JOIN students s ON s.id = er.student_id
      LEFT JOIN subjects sub ON sub.id = er.subject_id
      WHERE er.exam_id = $1 AND er.tenant_id = $2
      ORDER BY s.last_name, s.first_name
    `, [req.params.examId, tenantId]);

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Get offline results error:', error);
    res.status(500).json({ success: false, message: 'Error fetching results' });
  }
});

// PUT /offline-results/:examId/:studentId/:subjectId  [admin, teacher]
router.put('/:examId/:studentId/:subjectId', async (req, res) => {
  try {
    if (!['admin','teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const tenantId = req.tenantId;
    const { marks_obtained, max_marks, remarks, is_absent } = req.body;

    // Verify exam belongs to this tenant
    const exams = await query(`
      SELECT e.*, c.education_level
      FROM exams e
      LEFT JOIN classes c ON c.id = e.class_id
      WHERE e.id = $1 AND e.tenant_id = $2
    `, [req.params.examId, tenantId]);

    if (exams.length === 0) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const educationLevel = exams[0].education_level || 'lower_primary';
    const percentage = max_marks > 0 ? (marks_obtained / max_marks) * 100 : 0;
    const cbcGrade = is_absent ? null : computeCBCGrade(percentage, educationLevel);

    await query(
      `UPDATE exam_results
       SET marks_obtained=$1, max_marks=$2, remarks=$3, cbc_grade=$4, is_absent=$5, updated_at=NOW()
       WHERE exam_id=$6 AND student_id=$7 AND tenant_id=$8
         AND (subject_id=$9 OR ($9::uuid IS NULL AND subject_id IS NULL))`,
      [marks_obtained, max_marks, remarks || null, cbcGrade, is_absent || false,
       req.params.examId, req.params.studentId, tenantId,
       req.params.subjectId === 'null' ? null : req.params.subjectId]
    );

    res.json({ success: true, message: 'Result updated successfully' });
  } catch (error) {
    console.error('Update result error:', error);
    res.status(500).json({ success: false, message: 'Error updating result' });
  }
});

// POST /offline-results/:examId/publish  [admin]
router.post('/:examId/publish', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const tenantId = req.tenantId;

    const result = await query(
      'UPDATE exams SET is_results_published = true, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [req.params.examId, tenantId]
    );

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    res.json({ success: true, message: 'Results published successfully' });
  } catch (error) {
    console.error('Publish results error:', error);
    res.status(500).json({ success: false, message: 'Error publishing results' });
  }
});

export default router;
