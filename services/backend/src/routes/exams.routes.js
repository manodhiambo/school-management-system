import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET /exams — role-aware filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const { class_id, mode } = req.query;
    const role = req.user.role;

    let sql = '';
    let params = [];
    let paramIdx = 1;
    const conditions = [];

    if (role === 'student') {
      // Auto-filter to student's class
      sql = `
        SELECT e.*, c.name AS class_name, c.education_level
        FROM exams e
        LEFT JOIN classes c ON c.id = e.class_id
        JOIN students s ON s.class_id = e.class_id
        WHERE s.user_id = $${paramIdx++}
      `;
      params.push(req.user.id);
    } else if (role === 'parent') {
      // Filter to all children's classes
      sql = `
        SELECT DISTINCT e.*, c.name AS class_name, c.education_level
        FROM exams e
        LEFT JOIN classes c ON c.id = e.class_id
        JOIN students s ON s.class_id = e.class_id
        JOIN parent_students ps ON ps.student_id = s.id
        JOIN parents p ON p.id = ps.parent_id
        WHERE p.user_id = $${paramIdx++}
      `;
      params.push(req.user.id);
    } else {
      // admin / teacher: all exams
      sql = `
        SELECT e.*, c.name AS class_name, c.education_level
        FROM exams e
        LEFT JOIN classes c ON c.id = e.class_id
        WHERE 1=1
      `;
      if (class_id) {
        conditions.push(`e.class_id = $${paramIdx++}`);
        params.push(class_id);
      }
      if (mode) {
        conditions.push(`e.mode = $${paramIdx++}`);
        params.push(mode);
      }
      if (conditions.length > 0) {
        sql += ' AND ' + conditions.join(' AND ');
      }
    }

    sql += ' ORDER BY e.start_date DESC';

    const exams = await query(sql, params);
    res.json({ success: true, data: exams });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ success: false, message: 'Error fetching exams' });
  }
});

// GET /exams/:id — include questions for online exams; enforce student access window
router.get('/:id', authenticate, async (req, res) => {
  try {
    const exams = await query(`
      SELECT e.*, c.name AS class_name, c.education_level
      FROM exams e
      LEFT JOIN classes c ON c.id = e.class_id
      WHERE e.id = $1
    `, [req.params.id]);

    if (exams.length === 0) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const exam = exams[0];

    // Student access window check for online exams
    if (req.user.role === 'student' && exam.mode === 'online') {
      const now = new Date();
      const start = exam.start_date ? new Date(exam.start_date) : null;
      const end = exam.end_date ? new Date(exam.end_date) : null;
      if ((start && now < start) || (end && now > end)) {
        return res.status(403).json({ success: false, message: 'Exam is not available at this time' });
      }
    }

    let questions = [];
    if (exam.mode === 'online') {
      const rawQuestions = await query(
        'SELECT * FROM exam_questions WHERE exam_id = $1 ORDER BY order_index',
        [req.params.id]
      );
      // Strip correct_answer for students
      if (req.user.role === 'student') {
        questions = rawQuestions.map(({ correct_answer, ...q }) => q);
      } else {
        questions = rawQuestions;
      }
    }

    res.json({ success: true, data: { ...exam, questions } });
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({ success: false, message: 'Error fetching exam' });
  }
});

// POST /exams — create exam with optional online questions
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      name, description, exam_type, academic_year, term,
      start_date, end_date, class_id, mode, duration_minutes,
      instructions, questions
    } = req.body;

    const examId = uuidv4();
    await query(
      `INSERT INTO exams (id, name, description, exam_type, academic_year, term, start_date, end_date,
        class_id, mode, duration_minutes, instructions, created_by, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true)`,
      [
        examId, name, description || null, exam_type || null, academic_year || null,
        term || null, start_date || null, end_date || null,
        class_id || null, mode || 'offline', duration_minutes || null,
        instructions || null, req.user.id
      ]
    );

    // Bulk-insert questions if online exam with questions provided
    if (mode === 'online' && Array.isArray(questions) && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await query(
          `INSERT INTO exam_questions (id, exam_id, question_text, question_type, options, correct_answer, marks, order_index)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            uuidv4(), examId, q.question_text, q.question_type,
            q.options ? JSON.stringify(q.options) : null,
            q.correct_answer || null, q.marks || 1, i
          ]
        );
      }
    }

    const newExam = await query(`
      SELECT e.*, c.name AS class_name, c.education_level
      FROM exams e LEFT JOIN classes c ON c.id = e.class_id
      WHERE e.id = $1
    `, [examId]);

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: newExam[0]
    });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ success: false, message: 'Error creating exam' });
  }
});

// PUT /exams/:id — update exam
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      name, description, exam_type, academic_year, term,
      start_date, end_date, is_active, class_id, mode,
      duration_minutes, instructions
    } = req.body;

    await query(
      `UPDATE exams
       SET name=$1, description=$2, exam_type=$3, academic_year=$4, term=$5,
           start_date=$6, end_date=$7, is_active=$8, class_id=$9, mode=$10,
           duration_minutes=$11, instructions=$12, updated_at=NOW()
       WHERE id=$13`,
      [
        name, description, exam_type, academic_year, term, start_date, end_date,
        is_active !== false, class_id || null, mode || 'offline',
        duration_minutes || null, instructions || null, req.params.id
      ]
    );

    const updated = await query(`
      SELECT e.*, c.name AS class_name, c.education_level
      FROM exams e LEFT JOIN classes c ON c.id = e.class_id
      WHERE e.id = $1
    `, [req.params.id]);

    res.json({ success: true, message: 'Exam updated successfully', data: updated[0] });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({ success: false, message: 'Error updating exam' });
  }
});

// DELETE /exams/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM exams WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ success: false, message: 'Error deleting exam' });
  }
});

export default router;
