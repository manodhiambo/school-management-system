import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all classes
router.get('/', authenticate, async (req, res) => {
  try {
    const { education_level } = req.query;
    const tid = req.user.tenant_id;
    const params = [tid];
    let extraWhere = '';

    if (education_level) {
      extraWhere = ' AND c.education_level = $2';
      params.push(education_level);
    }

    const classes = await query(`
      SELECT
        c.*,
        COUNT(DISTINCT s.id) as student_count
      FROM classes c
      LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
      WHERE c.tenant_id = $1${extraWhere}
      GROUP BY c.id
      ORDER BY c.name, c.section
    `, params);

    res.json({ success: true, data: classes });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ success: false, message: 'Error fetching classes' });
  }
});

// Get single class
router.get('/:id', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const classes = await query(
      'SELECT * FROM classes WHERE id = $1 AND tenant_id = $2',
      [req.params.id, tid]
    );
    if (classes.length === 0) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }
    res.json({ success: true, data: classes[0] });
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ success: false, message: 'Error fetching class' });
  }
});

// Create class
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, section, capacity, room_number, academic_year, description, education_level, grade_number } = req.body;
    const tid = req.user.tenant_id;

    const currentYear = new Date().getFullYear();
    const academicYear = academic_year || `${currentYear}-${currentYear + 1}`;

    const classId = uuidv4();
    await query(
      `INSERT INTO classes (id, name, section, capacity, room_number, academic_year, description, education_level, grade_number, tenant_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)`,
      [classId, name, section || null, capacity || 40, room_number || null, academicYear, description || null, education_level || 'lower_primary', grade_number || null, tid]
    );

    const newClass = await query('SELECT * FROM classes WHERE id = $1', [classId]);

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: newClass[0]
    });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ success: false, message: 'Error creating class' });
  }
});

// Update class
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, section, capacity, room_number, academic_year, description, is_active, education_level, grade_number } = req.body;
    const tid = req.user.tenant_id;

    await query(
      `UPDATE classes
       SET name=$1, section=$2, capacity=$3, room_number=$4, academic_year=$5,
           description=$6, is_active=$7, education_level=$8, grade_number=$9, updated_at=NOW()
       WHERE id=$10 AND tenant_id=$11`,
      [name, section, capacity, room_number, academic_year, description, is_active !== false, education_level || 'lower_primary', grade_number || null, req.params.id, tid]
    );

    const updated = await query('SELECT * FROM classes WHERE id = $1', [req.params.id]);

    res.json({ success: true, message: 'Class updated successfully', data: updated[0] });
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ success: false, message: 'Error updating class' });
  }
});

// Delete class
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    await query('DELETE FROM classes WHERE id = $1 AND tenant_id = $2', [req.params.id, tid]);
    res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ success: false, message: 'Error deleting class' });
  }
});

export default router;
