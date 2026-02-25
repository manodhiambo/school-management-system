import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

router.use(authenticate);
router.use(tenantContext);
router.use(requireActiveTenant);

// Get all assignments (with filters)
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { classId, subjectId, teacherId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let sql = `
      SELECT a.*,
        c.name as class_name,
        s.name as subject_name,
        CONCAT(t.first_name, ' ', t.last_name) as teacher_name
      FROM assignments a
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN teachers t ON a.teacher_id = t.id
      WHERE a.tenant_id = $1 AND a.is_active = true
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (classId) {
      sql += ` AND a.class_id = $${paramIndex}`;
      params.push(classId);
      paramIndex++;
    }

    if (subjectId) {
      sql += ` AND a.subject_id = $${paramIndex}`;
      params.push(subjectId);
      paramIndex++;
    }

    if (teacherId) {
      const teacher = await query(
        'SELECT id FROM teachers WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
        [teacherId, tenantId]
      );
      const actualTeacherId = teacher.length > 0 ? teacher[0].id : teacherId;
      sql += ` AND a.teacher_id = $${paramIndex}`;
      params.push(actualTeacherId);
      paramIndex++;
    }

    // If student, only show assignments for their class
    if (userRole === 'student') {
      const student = await query(
        'SELECT class_id FROM students WHERE user_id = $1 AND tenant_id = $2',
        [userId, tenantId]
      );
      if (student.length > 0 && student[0].class_id) {
        sql += ` AND a.class_id = $${paramIndex}`;
        params.push(student[0].class_id);
        paramIndex++;
      }
    }

    sql += ' ORDER BY a.due_date ASC';

    const assignments = await query(sql, params);

    // If student, also get their submission status
    if (userRole === 'student') {
      const student = await query(
        'SELECT id FROM students WHERE user_id = $1 AND tenant_id = $2',
        [userId, tenantId]
      );
      if (student.length > 0) {
        const studentId = student[0].id;
        for (let assignment of assignments) {
          const submission = await query(
            'SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2',
            [assignment.id, studentId]
          );
          assignment.submission = submission.length > 0 ? submission[0] : null;
          assignment.status = submission.length > 0 ? submission[0].status : 'pending';
        }
      }
    }

    res.json({ success: true, data: assignments });
  } catch (error) {
    logger.error('Get assignments error:', error);
    res.status(500).json({ success: false, message: 'Error fetching assignments' });
  }
});

// Get teacher's assignments
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const teacher = await query(
      'SELECT id FROM teachers WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
      [req.params.teacherId, tenantId]
    );

    if (teacher.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const actualTeacherId = teacher[0].id;

    const assignments = await query(`
      SELECT a.*,
        c.name as class_name,
        s.name as subject_name,
        (SELECT COUNT(*) FROM assignment_submissions sub WHERE sub.assignment_id = a.id) as submission_count,
        (SELECT COUNT(*) FROM students st WHERE st.class_id = a.class_id AND st.tenant_id = $2) as total_students
      FROM assignments a
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN subjects s ON a.subject_id = s.id
      WHERE a.teacher_id = $1 AND a.tenant_id = $2 AND a.is_active = true
      ORDER BY a.due_date ASC
    `, [actualTeacherId, tenantId]);

    res.json({ success: true, data: assignments });
  } catch (error) {
    logger.error('Get teacher assignments error:', error);
    res.status(500).json({ success: false, message: 'Error fetching assignments' });
  }
});

// Get student's assignments
router.get('/student/:studentId', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const student = await query(
      'SELECT id, class_id FROM students WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
      [req.params.studentId, tenantId]
    );

    if (student.length === 0 || !student[0].class_id) {
      return res.json({ success: true, data: [] });
    }

    const studentId = student[0].id;
    const classId = student[0].class_id;

    const assignments = await query(`
      SELECT a.*,
        c.name as class_name,
        s.name as subject_name,
        CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
        sub.id as submission_id,
        sub.status as submission_status,
        sub.score,
        sub.submitted_at
      FROM assignments a
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN teachers t ON a.teacher_id = t.id
      LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id AND sub.student_id = $1
      WHERE a.class_id = $2 AND a.tenant_id = $3 AND a.is_active = true
      ORDER BY a.due_date ASC
    `, [studentId, classId, tenantId]);

    res.json({ success: true, data: assignments });
  } catch (error) {
    logger.error('Get student assignments error:', error);
    res.status(500).json({ success: false, message: 'Error fetching assignments' });
  }
});

// Get class assignments
router.get('/class/:classId', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const assignments = await query(`
      SELECT a.*,
        s.name as subject_name,
        CONCAT(t.first_name, ' ', t.last_name) as teacher_name
      FROM assignments a
      LEFT JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN teachers t ON a.teacher_id = t.id
      WHERE a.class_id = $1 AND a.tenant_id = $2 AND a.is_active = true
      ORDER BY a.due_date ASC
    `, [req.params.classId, tenantId]);

    res.json({ success: true, data: assignments });
  } catch (error) {
    logger.error('Get class assignments error:', error);
    res.status(500).json({ success: false, message: 'Error fetching assignments' });
  }
});

// Get single assignment
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const assignments = await query(`
      SELECT a.*,
        c.name as class_name,
        s.name as subject_name,
        CONCAT(t.first_name, ' ', t.last_name) as teacher_name
      FROM assignments a
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN teachers t ON a.teacher_id = t.id
      WHERE a.id = $1 AND a.tenant_id = $2
    `, [req.params.id, tenantId]);

    if (assignments.length === 0) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    res.json({ success: true, data: assignments[0] });
  } catch (error) {
    logger.error('Get assignment error:', error);
    res.status(500).json({ success: false, message: 'Error fetching assignment' });
  }
});

// Create assignment (teacher only)
router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { title, description, classId, class_id, subjectId, subject_id, dueDate, due_date, maxScore, max_score } = req.body;

    const teacher = await query(
      'SELECT id FROM teachers WHERE user_id = $1 AND tenant_id = $2',
      [req.user.id, tenantId]
    );
    const teacherId = teacher.length > 0 ? teacher[0].id : null;

    const assignmentId = uuidv4();
    await query(`
      INSERT INTO assignments (id, tenant_id, title, description, class_id, subject_id, teacher_id, due_date, max_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      assignmentId,
      tenantId,
      title,
      description,
      classId || class_id,
      subjectId || subject_id,
      teacherId,
      dueDate || due_date,
      maxScore || max_score || 100
    ]);

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: { id: assignmentId }
    });
  } catch (error) {
    logger.error('Create assignment error:', error);
    res.status(500).json({ success: false, message: 'Error creating assignment' });
  }
});

// Update assignment
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { title, description, dueDate, due_date, maxScore, max_score, isActive, is_active } = req.body;

    await query(`
      UPDATE assignments SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        due_date = COALESCE($3, due_date),
        max_score = COALESCE($4, max_score),
        is_active = COALESCE($5, is_active),
        updated_at = NOW()
      WHERE id = $6 AND tenant_id = $7
    `, [title, description, dueDate || due_date, maxScore || max_score, isActive ?? is_active, req.params.id, tenantId]);

    res.json({ success: true, message: 'Assignment updated successfully' });
  } catch (error) {
    logger.error('Update assignment error:', error);
    res.status(500).json({ success: false, message: 'Error updating assignment' });
  }
});

// Delete assignment
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    await query(
      'UPDATE assignments SET is_active = false WHERE id = $1 AND tenant_id = $2',
      [req.params.id, tenantId]
    );
    res.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    logger.error('Delete assignment error:', error);
    res.status(500).json({ success: false, message: 'Error deleting assignment' });
  }
});

// Submit assignment (student)
router.post('/:id/submit', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { submissionText, submission_text, attachmentUrl, attachment_url } = req.body;

    const student = await query(
      'SELECT id FROM students WHERE user_id = $1 AND tenant_id = $2',
      [req.user.id, tenantId]
    );
    if (student.length === 0) {
      return res.status(400).json({ success: false, message: 'Student not found' });
    }

    // Verify the assignment belongs to this tenant
    const assignment = await query(
      'SELECT id FROM assignments WHERE id = $1 AND tenant_id = $2',
      [req.params.id, tenantId]
    );
    if (assignment.length === 0) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const studentId = student[0].id;
    const existing = await query(
      'SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2',
      [req.params.id, studentId]
    );

    if (existing.length > 0) {
      await query(`
        UPDATE assignment_submissions SET
          submission_text = $1,
          attachment_url = $2,
          status = 'submitted',
          submitted_at = NOW(),
          updated_at = NOW()
        WHERE id = $3
      `, [submissionText || submission_text, attachmentUrl || attachment_url, existing[0].id]);
    } else {
      const submissionId = uuidv4();
      await query(`
        INSERT INTO assignment_submissions (id, assignment_id, student_id, submission_text, attachment_url, status)
        VALUES ($1, $2, $3, $4, $5, 'submitted')
      `, [submissionId, req.params.id, studentId, submissionText || submission_text, attachmentUrl || attachment_url]);
    }

    res.json({ success: true, message: 'Assignment submitted successfully' });
  } catch (error) {
    logger.error('Submit assignment error:', error);
    res.status(500).json({ success: false, message: 'Error submitting assignment' });
  }
});

// Grade assignment (teacher)
router.post('/:id/grade/:submissionId', async (req, res) => {
  try {
    const { score, feedback } = req.body;

    await query(`
      UPDATE assignment_submissions SET
        score = $1,
        feedback = $2,
        status = 'graded',
        graded_at = NOW(),
        graded_by = $3,
        updated_at = NOW()
      WHERE id = $4
    `, [score, feedback, req.user.id, req.params.submissionId]);

    res.json({ success: true, message: 'Assignment graded successfully' });
  } catch (error) {
    logger.error('Grade assignment error:', error);
    res.status(500).json({ success: false, message: 'Error grading assignment' });
  }
});

// Get assignment submissions (teacher)
router.get('/:id/submissions', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    // Verify assignment belongs to this tenant
    const assignment = await query(
      'SELECT id FROM assignments WHERE id = $1 AND tenant_id = $2',
      [req.params.id, tenantId]
    );
    if (assignment.length === 0) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const submissions = await query(`
      SELECT sub.*,
        s.first_name, s.last_name, s.admission_number
      FROM assignment_submissions sub
      JOIN students s ON sub.student_id = s.id
      WHERE sub.assignment_id = $1
      ORDER BY sub.submitted_at DESC
    `, [req.params.id]);

    res.json({ success: true, data: submissions });
  } catch (error) {
    logger.error('Get submissions error:', error);
    res.status(500).json({ success: false, message: 'Error fetching submissions' });
  }
});

export default router;
