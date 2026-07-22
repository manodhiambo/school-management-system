import express from 'express';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

router.use(authenticate);
router.use(requireModule('exams'));
router.use(tenantContext);
router.use(requireActiveTenant);

// Matches the canonical CBE scale used across cbcRoutes.js / offlineResults.routes.js /
// onlineExam.routes.js — junior_secondary uses the 8-level KJSEA scale, not plain A-F.
function computeCBEGrade(percentage, educationLevel) {
  if (['playgroup', 'pre_primary'].includes(educationLevel)) {
    if (percentage >= 75) return 'WD';
    if (percentage >= 40) return 'D';
    return 'B';
  }
  if (educationLevel === 'junior_secondary') {
    if (percentage >= 90) return 'EE1';
    if (percentage >= 75) return 'EE2';
    if (percentage >= 58) return 'ME1';
    if (percentage >= 41) return 'ME2';
    if (percentage >= 31) return 'AE1';
    if (percentage >= 21) return 'AE2';
    if (percentage >= 11) return 'BE1';
    return 'BE2';
  }
  if (percentage >= 80) return 'EE';
  if (percentage >= 60) return 'ME';
  if (percentage >= 40) return 'AE';
  return 'BE';
}

async function getClassEducationLevel(classId, tenantId) {
  if (!classId) return 'lower_primary';
  const rows = await query('SELECT education_level FROM classes WHERE id=$1 AND tenant_id=$2', [classId, tenantId]);
  return rows[0]?.education_level || 'lower_primary';
}

// Get gradebook entries
router.get('/', async (req, res) => {
  try {
    const { classId, studentId, subjectId, teacherId } = req.query;
    const tid = req.user.tenant_id;

    let sql = `
      SELECT g.*,
        s.first_name as student_first_name, s.last_name as student_last_name, s.admission_number,
        sub.name as subject_name,
        c.name as class_name
      FROM gradebook g
      LEFT JOIN students s ON g.student_id = s.id
      LEFT JOIN subjects sub ON g.subject_id = sub.id
      LEFT JOIN classes c ON g.class_id = c.id
      WHERE g.tenant_id = $1
    `;
    const params = [tid];
    let paramIndex = 2;

    if (classId) {
      sql += ` AND g.class_id = $${paramIndex}`;
      params.push(classId);
      paramIndex++;
    }

    if (studentId) {
      sql += ` AND g.student_id = $${paramIndex}`;
      params.push(studentId);
      paramIndex++;
    }

    if (subjectId) {
      sql += ` AND g.subject_id = $${paramIndex}`;
      params.push(subjectId);
      paramIndex++;
    }

    if (teacherId) {
      sql += ` AND g.teacher_id = $${paramIndex}`;
      params.push(teacherId);
      paramIndex++;
    }

    sql += ' ORDER BY g.date DESC, g.created_at DESC';

    const entries = await query(sql, params);
    res.json({ success: true, data: entries });
  } catch (error) {
    logger.error('Get gradebook entries error:', error);
    res.status(500).json({ success: false, message: 'Error fetching gradebook entries' });
  }
});

// Create gradebook entry
router.post('/', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const {
      classId, class_id,
      studentId, student_id,
      subjectId, subject_id,
      assessmentType, assessment_type,
      title, marks, maxMarks, max_marks,
      grade, date, notes
    } = req.body;

    const actualClassId = classId || class_id;
    const actualStudentId = studentId || student_id;
    const actualSubjectId = subjectId || subject_id;
    const actualAssessmentType = assessmentType || assessment_type || 'quiz';
    const actualMaxMarks = maxMarks || max_marks || 100;

    if (!actualStudentId || !actualSubjectId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Subject ID are required'
      });
    }

    const entryId = uuidv4();

    let calculatedGrade = grade;
    if (!calculatedGrade && marks !== undefined && actualMaxMarks) {
      const percentage = (marks / actualMaxMarks) * 100;
      const educationLevel = await getClassEducationLevel(actualClassId, tid);
      calculatedGrade = computeCBEGrade(percentage, educationLevel);
    }

    await query(
      `INSERT INTO gradebook (
        id, class_id, student_id, subject_id, teacher_id,
        assessment_type, title, marks, max_marks, grade, date, notes, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        entryId, actualClassId, actualStudentId, actualSubjectId, req.user.id,
        actualAssessmentType, title || 'Assessment', marks, actualMaxMarks,
        calculatedGrade, date || new Date(), notes, tid
      ]
    );

    logger.info(`Gradebook entry created: ${entryId}`);

    res.status(201).json({
      success: true,
      message: 'Grade saved successfully',
      data: { id: entryId, grade: calculatedGrade }
    });
  } catch (error) {
    logger.error('Create gradebook entry error:', error);
    res.status(500).json({ success: false, message: 'Error saving grade' });
  }
});

// Bulk create gradebook entries
router.post('/bulk', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { classId, subjectId, assessmentType, title, maxMarks, date, grades } = req.body;

    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ success: false, message: 'Grades array is required' });
    }

    const created = [];
    const errors = [];
    const educationLevel = await getClassEducationLevel(classId, tid);

    for (const gradeEntry of grades) {
      try {
        const entryId = uuidv4();
        const marks = parseFloat(gradeEntry.score || gradeEntry.marks || 0);
        const max = maxMarks || gradeEntry.maxMarks || 100;

        const percentage = (marks / max) * 100;
        const grade = computeCBEGrade(percentage, educationLevel);

        await query(
          `INSERT INTO gradebook (
            id, class_id, student_id, subject_id, teacher_id,
            assessment_type, title, marks, max_marks, grade, date, tenant_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            entryId, classId, gradeEntry.studentId, subjectId, req.user.id,
            assessmentType || 'quiz', title || 'Assessment', marks, max,
            grade, date || new Date(), tid
          ]
        );

        created.push({ studentId: gradeEntry.studentId, entryId, grade });
      } catch (err) {
        errors.push({ studentId: gradeEntry.studentId, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `${created.length} grades saved`,
      data: { created, errors }
    });
  } catch (error) {
    logger.error('Bulk create gradebook error:', error);
    res.status(500).json({ success: false, message: 'Error saving grades' });
  }
});

// Update gradebook entry
router.put('/:id', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { marks, maxMarks, grade, notes } = req.body;

    let calculatedGrade = grade;
    if (!calculatedGrade && marks !== undefined && maxMarks) {
      const percentage = (marks / maxMarks) * 100;
      const existing = await query('SELECT class_id FROM gradebook WHERE id=$1 AND tenant_id=$2', [req.params.id, tid]);
      const educationLevel = await getClassEducationLevel(existing[0]?.class_id, tid);
      calculatedGrade = computeCBEGrade(percentage, educationLevel);
    }

    await query(
      `UPDATE gradebook SET
        marks = COALESCE($1, marks),
        max_marks = COALESCE($2, max_marks),
        grade = COALESCE($3, grade),
        notes = COALESCE($4, notes),
        updated_at = NOW()
       WHERE id = $5 AND tenant_id = $6`,
      [marks, maxMarks, calculatedGrade, notes, req.params.id, tid]
    );

    res.json({ success: true, message: 'Grade updated successfully' });
  } catch (error) {
    logger.error('Update gradebook entry error:', error);
    res.status(500).json({ success: false, message: 'Error updating grade' });
  }
});

// Delete gradebook entry
router.delete('/:id', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    await query('DELETE FROM gradebook WHERE id = $1 AND tenant_id = $2', [req.params.id, tid]);
    res.json({ success: true, message: 'Grade deleted successfully' });
  } catch (error) {
    logger.error('Delete gradebook entry error:', error);
    res.status(500).json({ success: false, message: 'Error deleting grade' });
  }
});

// Get student grades summary
router.get('/student/:studentId', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const entries = await query(
      `SELECT g.*, sub.name as subject_name
       FROM gradebook g
       LEFT JOIN subjects sub ON g.subject_id = sub.id
       WHERE g.student_id = $1 AND g.tenant_id = $2
       ORDER BY g.date DESC`,
      [req.params.studentId, tid]
    );

    const totalMarks = entries.reduce((sum, e) => sum + parseFloat(e.marks || 0), 0);
    const totalMaxMarks = entries.reduce((sum, e) => sum + parseFloat(e.max_marks || 0), 0);
    const average = totalMaxMarks > 0 ? ((totalMarks / totalMaxMarks) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        entries,
        summary: {
          totalEntries: entries.length,
          averagePercentage: average
        }
      }
    });
  } catch (error) {
    logger.error('Get student grades error:', error);
    res.status(500).json({ success: false, message: 'Error fetching student grades' });
  }
});

export default router;
