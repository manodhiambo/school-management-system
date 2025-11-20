import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all exams
router.get('/', authenticate, async (req, res) => {
  try {
    const exams = await query(`
      SELECT 
        e.*,
        c.name as class_name,
        c.section as class_section
      FROM exams e
      LEFT JOIN classes c ON e.class_id = c.id
      ORDER BY e.start_date DESC
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

// Create exam
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, type, session, class_id, start_date, end_date, max_marks, passing_marks } = req.body;
    
    const examId = uuidv4();
    
    await query(
      `INSERT INTO exams (id, name, type, session, class_id, start_date, end_date, max_marks, passing_marks) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [examId, name, type, session, class_id, start_date, end_date, max_marks, passing_marks]
    );
    
    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: { id: examId }
    });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ success: false, message: 'Error creating exam' });
  }
});

export default router;
