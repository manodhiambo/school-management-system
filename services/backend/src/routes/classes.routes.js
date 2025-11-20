import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all classes
router.get('/', authenticate, async (req, res) => {
  try {
    const classes = await query(`
      SELECT 
        c.*,
        COUNT(DISTINCT s.id) as student_count
      FROM classes c
      LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
      GROUP BY c.id
      ORDER BY c.numeric_value, c.section
    `);
    
    res.json({
      success: true,
      data: classes
    });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ success: false, message: 'Error fetching classes' });
  }
});

// Create class
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, section, max_students, room_number } = req.body;
    
    // Extract numeric value from class name (e.g., "Grade 10" -> 10)
    const numericMatch = name.match(/\d+/);
    const numeric_value = numericMatch ? parseInt(numericMatch[0]) : 0;
    
    // Get current academic year
    const currentYear = new Date().getFullYear();
    const academic_year = `${currentYear}-${currentYear + 1}`;
    
    const classId = uuidv4();
    
    await query(
      `INSERT INTO classes (id, name, numeric_value, section, max_students, room_number, academic_year) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [classId, name, numeric_value, section, max_students || 40, room_number || null, academic_year]
    );
    
    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: { id: classId }
    });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ success: false, message: 'Error creating class' });
  }
});

// Update class
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, section, max_students, room_number } = req.body;
    
    const numericMatch = name.match(/\d+/);
    const numeric_value = numericMatch ? parseInt(numericMatch[0]) : 0;
    
    await query(
      `UPDATE classes SET name = ?, numeric_value = ?, section = ?, max_students = ?, room_number = ? 
       WHERE id = ?`,
      [name, numeric_value, section, max_students, room_number, req.params.id]
    );
    
    res.json({
      success: true,
      message: 'Class updated successfully'
    });
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ success: false, message: 'Error updating class' });
  }
});

// Delete class
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM classes WHERE id = ?', [req.params.id]);
    
    res.json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ success: false, message: 'Error deleting class' });
  }
});

export default router;
