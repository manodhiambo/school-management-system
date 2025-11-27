import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all exams
router.get('/', authenticate, async (req, res) => {
  try {
    const exams = await query(`
      SELECT * FROM exams 
      ORDER BY start_date DESC
    `);
    res.json({
      success: true,
      data: exams
    });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ success: false, message: 'Error fetching exams' });
  }
});

// Get single exam
router.get('/:id', authenticate, async (req, res) => {
  try {
    const exams = await query('SELECT * FROM exams WHERE id = $1', [req.params.id]);
    if (exams.length === 0) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    res.json({ success: true, data: exams[0] });
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({ success: false, message: 'Error fetching exam' });
  }
});

// Create exam
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, exam_type, academic_year, term, start_date, end_date } = req.body;
    
    const examId = uuidv4();
    await query(
      `INSERT INTO exams (id, name, description, exam_type, academic_year, term, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
      [examId, name, description || null, exam_type || null, academic_year || null, term || null, start_date || null, end_date || null]
    );
    
    const newExam = await query('SELECT * FROM exams WHERE id = $1', [examId]);
    
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

// Update exam
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, exam_type, academic_year, term, start_date, end_date, is_active } = req.body;
    
    await query(
      `UPDATE exams 
       SET name = $1, description = $2, exam_type = $3, academic_year = $4, 
           term = $5, start_date = $6, end_date = $7, is_active = $8, updated_at = NOW()
       WHERE id = $9`,
      [name, description, exam_type, academic_year, term, start_date, end_date, is_active !== false, req.params.id]
    );
    
    const updated = await query('SELECT * FROM exams WHERE id = $1', [req.params.id]);
    
    res.json({
      success: true,
      message: 'Exam updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({ success: false, message: 'Error updating exam' });
  }
});

// Delete exam
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM exams WHERE id = $1', [req.params.id]);
    res.json({
      success: true,
      message: 'Exam deleted successfully'
    });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ success: false, message: 'Error deleting exam' });
  }
});

export default router;
