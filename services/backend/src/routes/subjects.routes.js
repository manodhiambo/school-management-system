import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

// Get all subjects
router.get('/', authenticate, async (req, res) => {
  try {
    const { education_level, category } = req.query;
    const tid = req.user.tenant_id;
    const conditions = ['tenant_id = $1'];
    const params = [tid];
    let paramIdx = 2;

    if (education_level) {
      conditions.push(`education_level = $${paramIdx++}`);
      params.push(education_level);
    }
    if (category) {
      conditions.push(`category = $${paramIdx++}`);
      params.push(category);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');
    const subjects = await query(`SELECT * FROM subjects ${whereClause} ORDER BY name`, params);

    res.json({ success: true, data: subjects });
  } catch (error) {
    logger.error('Get subjects error:', error);
    res.status(500).json({ success: false, message: 'Error fetching subjects' });
  }
});

// Get single subject
router.get('/:id', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const subjects = await query(
      'SELECT * FROM subjects WHERE id = $1 AND tenant_id = $2',
      [req.params.id, tid]
    );
    if (subjects.length === 0) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    res.json({ success: true, data: subjects[0] });
  } catch (error) {
    logger.error('Get subject error:', error);
    res.status(500).json({ success: false, message: 'Error fetching subject' });
  }
});

// Create subject
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, code, description, credits, is_active, education_level, category } = req.body;
    const tid = req.user.tenant_id;

    const subjectId = uuidv4();
    await query(
      `INSERT INTO subjects (id, name, code, description, credits, is_active, education_level, category, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [subjectId, name, code || null, description || null, credits || 0, is_active !== false, education_level || null, category || 'core', tid]
    );

    const newSubject = await query('SELECT * FROM subjects WHERE id = $1', [subjectId]);

    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: newSubject[0]
    });
  } catch (error) {
    logger.error('Create subject error:', error);
    res.status(500).json({ success: false, message: 'Error creating subject' });
  }
});

// Update subject
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, code, description, credits, is_active, education_level, category } = req.body;
    const tid = req.user.tenant_id;

    await query(
      `UPDATE subjects
       SET name=$1, code=$2, description=$3, credits=$4, is_active=$5,
           education_level=$6, category=$7, updated_at=NOW()
       WHERE id=$8 AND tenant_id=$9`,
      [name, code, description, credits, is_active, education_level || null, category || 'core', req.params.id, tid]
    );

    const updated = await query('SELECT * FROM subjects WHERE id = $1', [req.params.id]);

    res.json({ success: true, message: 'Subject updated successfully', data: updated[0] });
  } catch (error) {
    logger.error('Update subject error:', error);
    res.status(500).json({ success: false, message: 'Error updating subject' });
  }
});

// Delete subject
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    await query('DELETE FROM subjects WHERE id = $1 AND tenant_id = $2', [req.params.id, tid]);
    res.json({ success: true, message: 'Subject deleted successfully' });
  } catch (error) {
    logger.error('Delete subject error:', error);
    res.status(500).json({ success: false, message: 'Error deleting subject' });
  }
});

export default router;
