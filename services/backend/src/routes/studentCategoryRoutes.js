import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import logger from '../utils/logger.js';
import {
  getCategoryStudentIds,
  previewCriteriaStudentIds,
  STUDENT_CATEGORY_CRITERIA_KEYS,
} from '../utils/studentCategories.js';

const router = express.Router();

router.use(authenticate);
router.use(tenantContext);
router.use(requireActiveTenant);

function sanitizeCriteria(input) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const key of STUDENT_CATEGORY_CRITERIA_KEYS) {
    if (input[key] === undefined || input[key] === null || input[key] === '') continue;
    out[key] = input[key];
  }
  return out;
}

// List categories with resolved member counts
router.get('/', requireRole(['admin', 'finance_officer']), async (req, res) => {
  try {
    const tid = req.tenantId;
    const categories = await query(
      `SELECT * FROM student_categories WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tid]
    );
    const withCounts = await Promise.all(
      categories.map(async (cat) => {
        const ids = await getCategoryStudentIds(tid, cat.id);
        return { ...cat, member_count: ids ? ids.length : 0 };
      })
    );
    res.json({ success: true, data: withCounts });
  } catch (error) {
    logger.error('List student categories error:', error);
    res.status(500).json({ success: false, message: 'Error fetching student categories' });
  }
});

// Dry-run preview for the create form - resolve criteria before saving
router.post('/preview', requireRole(['admin', 'finance_officer']), async (req, res) => {
  try {
    const tid = req.tenantId;
    const criteria = sanitizeCriteria(req.body.criteria);
    const ids = await previewCriteriaStudentIds(tid, criteria);
    const sampleRows = ids.length
      ? await query(
          `SELECT id, first_name, last_name, admission_number FROM students
           WHERE id = ANY($1::uuid[]) ORDER BY first_name LIMIT 10`,
          [ids]
        )
      : [];
    res.json({ success: true, data: { count: ids.length, sample: sampleRows } });
  } catch (error) {
    logger.error('Preview student category error:', error);
    res.status(500).json({ success: false, message: 'Error previewing category' });
  }
});

// Create category
router.post('/', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.tenantId;
    const { name, description, is_dynamic, criteria } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });

    const id = uuidv4();
    const rows = await query(
      `INSERT INTO student_categories (id, tenant_id, name, description, is_dynamic, criteria, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, tid, name, description || null, is_dynamic !== false, JSON.stringify(sanitizeCriteria(criteria)), req.user.id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error('Create student category error:', error);
    res.status(500).json({ success: false, message: 'Error creating student category' });
  }
});

// Update category
router.put('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.tenantId;
    const { name, description, is_dynamic, criteria } = req.body;
    const rows = await query(
      `UPDATE student_categories
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           is_dynamic = COALESCE($3, is_dynamic),
           criteria = COALESCE($4, criteria),
           updated_at = NOW()
       WHERE id = $5 AND tenant_id = $6
       RETURNING *`,
      [
        name || null,
        description ?? null,
        typeof is_dynamic === 'boolean' ? is_dynamic : null,
        criteria ? JSON.stringify(sanitizeCriteria(criteria)) : null,
        req.params.id,
        tid,
      ]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error('Update student category error:', error);
    res.status(500).json({ success: false, message: 'Error updating student category' });
  }
});

// Delete category
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.tenantId;
    const rows = await query(
      `DELETE FROM student_categories WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    logger.error('Delete student category error:', error);
    res.status(500).json({ success: false, message: 'Error deleting student category' });
  }
});

// Resolved member list (criteria matches + manual additions)
router.get('/:id/members', requireRole(['admin', 'finance_officer']), async (req, res) => {
  try {
    const tid = req.tenantId;
    const ids = await getCategoryStudentIds(tid, req.params.id);
    if (ids === null) return res.status(404).json({ success: false, message: 'Category not found' });
    const manualRows = await query(
      `SELECT student_id FROM student_category_members WHERE category_id = $1`,
      [req.params.id]
    );
    const manualIds = new Set(manualRows.map(r => r.student_id));
    const students = ids.length
      ? await query(
          `SELECT s.id, s.first_name, s.last_name, s.admission_number, c.name AS class_name
           FROM students s LEFT JOIN classes c ON c.id = s.class_id
           WHERE s.id = ANY($1::uuid[]) ORDER BY s.first_name`,
          [ids]
        )
      : [];
    res.json({
      success: true,
      data: students.map(s => ({ ...s, is_manual: manualIds.has(s.id) })),
    });
  } catch (error) {
    logger.error('Get student category members error:', error);
    res.status(500).json({ success: false, message: 'Error fetching category members' });
  }
});

// Add manual members
router.post('/:id/members', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.tenantId;
    const { student_ids } = req.body;
    const catRows = await query(
      'SELECT id FROM student_categories WHERE id = $1 AND tenant_id = $2',
      [req.params.id, tid]
    );
    if (!catRows.length) return res.status(404).json({ success: false, message: 'Category not found' });
    if (!Array.isArray(student_ids) || !student_ids.length) {
      return res.status(400).json({ success: false, message: 'student_ids array is required' });
    }
    for (const studentId of student_ids) {
      await query(
        `INSERT INTO student_category_members (id, category_id, student_id, tenant_id, added_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (category_id, student_id) DO NOTHING`,
        [uuidv4(), req.params.id, studentId, tid, req.user.id]
      );
    }
    res.json({ success: true, message: 'Students added to category' });
  } catch (error) {
    logger.error('Add student category members error:', error);
    res.status(500).json({ success: false, message: 'Error adding members' });
  }
});

// Remove a manually-added member
router.delete('/:id/members/:studentId', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.tenantId;
    const rows = await query(
      `DELETE FROM student_category_members
       WHERE category_id = $1 AND student_id = $2 AND tenant_id = $3
       RETURNING id`,
      [req.params.id, req.params.studentId, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Membership not found' });
    res.json({ success: true, message: 'Student removed from category' });
  } catch (error) {
    logger.error('Remove student category member error:', error);
    res.status(500).json({ success: false, message: 'Error removing member' });
  }
});

export default router;
