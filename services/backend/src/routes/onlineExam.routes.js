import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

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
  // university
  if (percentage >= 70) return 'First Class';
  if (percentage >= 60) return 'Second Upper';
  if (percentage >= 50) return 'Second Lower';
  if (percentage >= 40) return 'Pass';
  return 'Fail';
}

// POST /online-exams/:examId/start  [student]
router.post('/:examId/start', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Students only' });
    }

    // Get exam with class info
    const exams = await query(`
      SELECT e.*, c.education_level
      FROM exams e
      LEFT JOIN classes c ON c.id = e.class_id
      WHERE e.id = $1 AND e.mode = 'online'
    `, [req.params.examId]);

    if (exams.length === 0) {
      return res.status(404).json({ success: false, message: 'Online exam not found' });
    }

    const exam = exams[0];

    // Check access window
    const now = new Date();
    if (exam.start_date && now < new Date(exam.start_date)) {
      return res.status(403).json({ success: false, message: 'Exam has not started yet' });
    }
    if (exam.end_date && now > new Date(exam.end_date)) {
      return res.status(403).json({ success: false, message: 'Exam has ended' });
    }

    // Get student record
    const students = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }
    const studentId = students[0].id;

    // Get questions for max score calculation
    const questions = await query(
      'SELECT id, question_text, question_type, options, marks, order_index FROM exam_questions WHERE exam_id = $1 ORDER BY order_index',
      [req.params.examId]
    );

    const maxScore = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    // Create attempt (UNIQUE constraint prevents duplicates)
    const attemptId = uuidv4();
    try {
      await query(
        `INSERT INTO exam_attempts (id, exam_id, student_id, max_score, status)
         VALUES ($1, $2, $3, $4, 'in_progress')`,
        [attemptId, req.params.examId, studentId, maxScore]
      );
    } catch (err) {
      if (err.code === '23505') {
        // Already started — return existing attempt
        const existing = await query(
          'SELECT * FROM exam_attempts WHERE exam_id = $1 AND student_id = $2',
          [req.params.examId, studentId]
        );
        return res.json({
          success: true,
          message: 'Exam already started',
          data: { attempt: existing[0], exam, questions }
        });
      }
      throw err;
    }

    const attempt = await query('SELECT * FROM exam_attempts WHERE id = $1', [attemptId]);

    res.json({
      success: true,
      message: 'Exam started',
      data: { attempt: attempt[0], exam, questions }
    });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({ success: false, message: 'Error starting exam' });
  }
});

// GET /online-exams/:examId/attempt  [student] — crash recovery
router.get('/:examId/attempt', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Students only' });
    }

    const students = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }
    const studentId = students[0].id;

    const attempts = await query(
      'SELECT * FROM exam_attempts WHERE exam_id = $1 AND student_id = $2',
      [req.params.examId, studentId]
    );

    if (attempts.length === 0) {
      return res.status(404).json({ success: false, message: 'No attempt found' });
    }

    const attempt = attempts[0];
    const answers = await query(
      'SELECT * FROM exam_attempt_answers WHERE attempt_id = $1',
      [attempt.id]
    );

    res.json({ success: true, data: { attempt, answers } });
  } catch (error) {
    console.error('Get attempt error:', error);
    res.status(500).json({ success: false, message: 'Error fetching attempt' });
  }
});

// POST /online-exams/:examId/answer  [student] — upsert answer
router.post('/:examId/answer', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Students only' });
    }

    const { question_id, answer_text } = req.body;

    const students = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }
    const studentId = students[0].id;

    const attempts = await query(
      "SELECT * FROM exam_attempts WHERE exam_id = $1 AND student_id = $2 AND status = 'in_progress'",
      [req.params.examId, studentId]
    );

    if (attempts.length === 0) {
      return res.status(404).json({ success: false, message: 'No active attempt found' });
    }

    const attempt = attempts[0];

    await query(
      `INSERT INTO exam_attempt_answers (id, attempt_id, question_id, answer_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (attempt_id, question_id)
       DO UPDATE SET answer_text = EXCLUDED.answer_text`,
      [uuidv4(), attempt.id, question_id, answer_text]
    );

    res.json({ success: true, message: 'Answer saved' });
  } catch (error) {
    console.error('Save answer error:', error);
    res.status(500).json({ success: false, message: 'Error saving answer' });
  }
});

// POST /online-exams/:examId/submit  [student]
router.post('/:examId/submit', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Students only' });
    }

    const students = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }
    const studentId = students[0].id;

    const attempts = await query(
      "SELECT * FROM exam_attempts WHERE exam_id = $1 AND student_id = $2 AND status = 'in_progress'",
      [req.params.examId, studentId]
    );

    if (attempts.length === 0) {
      return res.status(404).json({ success: false, message: 'No active attempt found' });
    }

    const attempt = attempts[0];

    // Get exam with class/education_level
    const exams = await query(`
      SELECT e.*, c.education_level
      FROM exams e
      LEFT JOIN classes c ON c.id = e.class_id
      WHERE e.id = $1
    `, [req.params.examId]);

    const exam = exams[0];
    const educationLevel = exam.education_level || 'lower_primary';

    // Get all questions
    const questions = await query(
      'SELECT * FROM exam_questions WHERE exam_id = $1',
      [req.params.examId]
    );

    // Get all answers for this attempt
    const answers = await query(
      'SELECT * FROM exam_attempt_answers WHERE attempt_id = $1',
      [attempt.id]
    );

    const answerMap = {};
    for (const a of answers) {
      answerMap[a.question_id] = a;
    }

    let totalScore = 0;
    const maxScore = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    const breakdown = [];

    for (const q of questions) {
      const answer = answerMap[q.id];
      let marksAwarded = 0;
      let isCorrect = null;

      if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
        if (answer && q.correct_answer) {
          isCorrect = answer.answer_text?.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
          marksAwarded = isCorrect ? (q.marks || 1) : 0;
        }
      }
      // short_answer: manual grading (marksAwarded stays 0 until teacher grades)

      totalScore += marksAwarded;

      // Update answer record
      if (answer) {
        await query(
          'UPDATE exam_attempt_answers SET is_correct=$1, marks_awarded=$2 WHERE id=$3',
          [isCorrect, marksAwarded, answer.id]
        );
      }

      breakdown.push({
        question_id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        marks: q.marks,
        marks_awarded: marksAwarded,
        is_correct: isCorrect,
        your_answer: answer?.answer_text || null,
        correct_answer: q.correct_answer
      });
    }

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const cbcGrade = computeCBCGrade(percentage, educationLevel);
    const now = new Date();

    // Update attempt
    await query(
      `UPDATE exam_attempts
       SET submitted_at=$1, total_score=$2, max_score=$3, cbc_grade=$4, status='submitted',
           time_spent_seconds=EXTRACT(EPOCH FROM ($1 - started_at))::INTEGER
       WHERE id=$5`,
      [now, totalScore, maxScore, cbcGrade, attempt.id]
    );

    // Insert into exam_results
    const existingResult = await query(
      'SELECT id FROM exam_results WHERE exam_id = $1 AND student_id = $2',
      [req.params.examId, studentId]
    );

    if (existingResult.length === 0) {
      await query(
        `INSERT INTO exam_results (id, exam_id, student_id, marks_obtained, max_marks, cbc_grade)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), req.params.examId, studentId, totalScore, maxScore, cbcGrade]
      );
    } else {
      await query(
        'UPDATE exam_results SET marks_obtained=$1, max_marks=$2, cbc_grade=$3, updated_at=NOW() WHERE id=$4',
        [totalScore, maxScore, cbcGrade, existingResult[0].id]
      );
    }

    res.json({
      success: true,
      message: 'Exam submitted successfully',
      data: { total_score: totalScore, max_score: maxScore, percentage: Math.round(percentage), cbc_grade: cbcGrade, breakdown }
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({ success: false, message: 'Error submitting exam' });
  }
});

// GET /online-exams/:examId/results  [admin, teacher]
router.get('/:examId/results', authenticate, async (req, res) => {
  try {
    if (!['admin','teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const results = await query(`
      SELECT ea.*, s.first_name, s.last_name, s.admission_number
      FROM exam_attempts ea
      JOIN students s ON s.id = ea.student_id
      WHERE ea.exam_id = $1
      ORDER BY ea.total_score DESC
    `, [req.params.examId]);

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Get exam results error:', error);
    res.status(500).json({ success: false, message: 'Error fetching results' });
  }
});

// GET /online-exams/:examId/my-result  [student]
router.get('/:examId/my-result', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Students only' });
    }

    const students = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }
    const studentId = students[0].id;

    const attempts = await query(
      "SELECT * FROM exam_attempts WHERE exam_id = $1 AND student_id = $2 AND status != 'in_progress'",
      [req.params.examId, studentId]
    );

    if (attempts.length === 0) {
      return res.status(404).json({ success: false, message: 'No submitted attempt found' });
    }

    const attempt = attempts[0];

    const answers = await query(`
      SELECT eaa.*, eq.question_text, eq.question_type, eq.marks, eq.correct_answer, eq.options
      FROM exam_attempt_answers eaa
      JOIN exam_questions eq ON eq.id = eaa.question_id
      WHERE eaa.attempt_id = $1
      ORDER BY eq.order_index
    `, [attempt.id]);

    res.json({ success: true, data: { attempt, answers } });
  } catch (error) {
    console.error('Get my result error:', error);
    res.status(500).json({ success: false, message: 'Error fetching result' });
  }
});

export default router;
