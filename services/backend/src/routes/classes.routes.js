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
      ORDER BY c.name, c.section
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

// Get single class
router.get('/:id', authenticate, async (req, res) => {
  try {
    const classes = await query('SELECT * FROM classes WHERE id = ?', [req.params.id]);
    
    if (classes.length === 0) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }
    
    res.json({
      success: true,
      data: classes[0]
    });
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ success: false, message: 'Error fetching class' });
  }
});

// Create class
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, section, max_students, room_number } = req.body;
    
    const classId = uuidv4();
    
    await query(
      'INSERT INTO classes (id, name, section, max_students, room_number) VALUES (?, ?, ?, ?, ?)',
      [classId, name, section, max_students || 40, room_number]
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
    
    await query(
      'UPDATE classes SET name = ?, section = ?, max_students = ?, room_number = ? WHERE id = ?',
      [name, section, max_students, room_number, req.params.id]
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
