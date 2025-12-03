import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

// Get all assignments (with filters)
router.get('/', authenticate, async (req, res) => {
  try {
    const { classId, subjectId, teacherId, studentId } = req.query;
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
      WHERE a.is_active = true
    `;
    const params = [];
    let paramIndex = 1;

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
      // Resolve teacher_id from user_id if needed
      const teacher = await query('SELECT id FROM teachers WHERE id = $1 OR user_id = $1', [teacherId]);
      const actualTeacherId = teacher.length > 0 ? teacher[0].id : teacherId;
      sql += ` AND a.teacher_id = $${paramIndex}`;
      params.push(actualTeacherId);
      paramIndex++;
    }

    // If student, only show assignments for their class
    if (userRole === 'student') {
      const student = await query('SELECT class_id FROM students WHERE user_id = $1', [userId]);
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
      const student = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
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
router.get('/teacher/:teacherId', authenticate, async (req, res) => {
  try {
    // Resolve teacher_id from user_id if needed
    const teacher = await query('SELECT id FROM teachers WHERE id = $1 OR user_id = $1', [req.params.teacherId]);
    
    if (teacher.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    const actualTeacherId = teacher[0].id;
    
    const assignments = await query(`
      SELECT a.*, 
        c.name as class_name,
        s.name as subject_name,
        (SELECT COUNT(*) FROM assignment_submissions sub WHERE sub.assignment_id = a.id) as submission_count,
        (SELECT COUNT(*) FROM students st WHERE st.class_id = a.class_id) as total_students
      FROM assignments a
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN subjects s ON a.subject_id = s.id
      WHERE a.teacher_id = $1 AND a.is_active = true
      ORDER BY a.due_date ASC
    `, [actualTeacherId]);
    
    res.json({ success: true, data: assignments });
  } catch (error) {
    logger.error('Get teacher assignments error:', error);
    res.status(500).json({ success: false, message: 'Error fetching assignments' });
  }
});

// Get student's assignments
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    // Get student's class
    const student = await query('SELECT id, class_id FROM students WHERE id = $1 OR user_id = $1', [req.params.studentId]);
    
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
      WHERE a.class_id = $2 AND a.is_active = true
      ORDER BY a.due_date ASC
    `, [studentId, classId]);
    
    res.json({ success: true, data: assignments });
  } catch (error) {
    logger.error('Get student assignments error:', error);
    res.status(500).json({ success: false, message: 'Error fetching assignments' });
  }
});

// Get class assignments
router.get('/class/:classId', authenticate, async (req, res) => {
  try {
    const assignments = await query(`
      SELECT a.*, 
        s.name as subject_name,
        CONCAT(t.first_name, ' ', t.last_name) as teacher_name
      FROM assignments a
      LEFT JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN teachers t ON a.teacher_id = t.id
      WHERE a.class_id = $1 AND a.is_active = true
      ORDER BY a.due_date ASC
    `, [req.params.classId]);
    
    res.json({ success: true, data: assignments });
  } catch (error) {
    logger.error('Get class assignments error:', error);
    res.status(500).json({ success: false, message: 'Error fetching assignments' });
  }
});

// Get single assignment
router.get('/:id', authenticate, async (req, res) => {
  try {
    const assignments = await query(`
      SELECT a.*, 
        c.name as class_name,
        s.name as subject_name,
        CONCAT(t.first_name, ' ', t.last_name) as teacher_name
      FROM assignments a
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN teachers t ON a.teacher_id = t.id
      WHERE a.id = $1
    `, [req.params.id]);
    
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
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, classId, class_id, subjectId, subject_id, dueDate, due_date, maxScore, max_score } = req.body;
    
    // Get teacher ID from user
    const teacher = await query('SELECT id FROM teachers WHERE user_id = $1', [req.user.id]);
    const teacherId = teacher.length > 0 ? teacher[0].id : null;
    
    const assignmentId = uuidv4();
    await query(`
      INSERT INTO assignments (id, title, description, class_id, subject_id, teacher_id, due_date, max_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      assignmentId, 
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
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, description, dueDate, due_date, maxScore, max_score, isActive, is_active } = req.body;
    
    await query(`
      UPDATE assignments SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        due_date = COALESCE($3, due_date),
        max_score = COALESCE($4, max_score),
        is_active = COALESCE($5, is_active),
        updated_at = NOW()
      WHERE id = $6
    `, [title, description, dueDate || due_date, maxScore || max_score, isActive ?? is_active, req.params.id]);
    
    res.json({ success: true, message: 'Assignment updated successfully' });
  } catch (error) {
    logger.error('Update assignment error:', error);
    res.status(500).json({ success: false, message: 'Error updating assignment' });
  }
});

// Delete assignment
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await query('UPDATE assignments SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    logger.error('Delete assignment error:', error);
    res.status(500).json({ success: false, message: 'Error deleting assignment' });
  }
});

// Submit assignment (student)
router.post('/:id/submit', authenticate, async (req, res) => {
  try {
    const { submissionText, submission_text, attachmentUrl, attachment_url } = req.body;
    
    // Get student ID
    const student = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (student.length === 0) {
      return res.status(400).json({ success: false, message: 'Student not found' });
    }
    
    const studentId = student[0].id;
    
    // Check if already submitted
    const existing = await query(
      'SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2',
      [req.params.id, studentId]
    );
    
    if (existing.length > 0) {
      // Update existing submission
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
      // Create new submission
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
router.post('/:id/grade/:submissionId', authenticate, async (req, res) => {
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
router.get('/:id/submissions', authenticate, async (req, res) => {
  try {
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
