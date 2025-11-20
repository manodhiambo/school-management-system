import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all subjects
router.get('/', authenticate, async (req, res) => {
  try {
    const subjects = await query('SELECT * FROM subjects ORDER BY name');
    
    res.json({
      success: true,
      data: subjects
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ success: false, message: 'Error fetching subjects' });
  }
});

// Create subject
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, code, description, category } = req.body;
    
    const subjectId = uuidv4();
    
    await query(
      'INSERT INTO subjects (id, name, code, description, category) VALUES (?, ?, ?, ?, ?)',
      [subjectId, name, code, description, category || 'core']
    );
    
    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: { id: subjectId }
    });
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ success: false, message: 'Error creating subject' });
  }
});

// Update subject
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, code, description, category, is_active } = req.body;
    
    await query(
      'UPDATE subjects SET name = ?, code = ?, description = ?, category = ?, is_active = ? WHERE id = ?',
      [name, code, description, category, is_active, req.params.id]
    );
    
    res.json({
      success: true,
      message: 'Subject updated successfully'
    });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ success: false, message: 'Error updating subject' });
  }
});

// Delete subject
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM subjects WHERE id = ?', [req.params.id]);
    
    res.json({
      success: true,
      message: 'Subject deleted successfully'
    });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ success: false, message: 'Error deleting subject' });
  }
});

export default router;
