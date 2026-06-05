import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// ─── Access control helper ─────────────────────────────────────────────────────
/**
 * Check whether the current user can access a student's portfolio.
 * - student: only own portfolio
 * - parent: only their linked children
 * - teacher/admin/superadmin: any student in their tenant
 */
async function canAccessStudent(req, studentId) {
  const { role, id: userId, tenant_id: tid } = req.user;
  if (role === 'admin' || role === 'superadmin' || role === 'teacher') return true;
  if (role === 'student') {
    const rows = await query(
      `SELECT id FROM students WHERE user_id = $1 AND id = $2 AND tenant_id = $3`,
      [userId, studentId, tid]
    );
    return rows.length > 0;
  }
  if (role === 'parent') {
    const rows = await query(
      `SELECT s.id FROM students s
       WHERE s.parent_id = (SELECT id FROM users WHERE id = $1 LIMIT 1)
         AND s.id = $2 AND s.tenant_id = $3`,
      [userId, studentId, tid]
    );
    return rows.length > 0;
  }
  return false;
}

// ─── GET /student/:studentId — all portfolio items ────────────────────────────
router.get('/student/:studentId', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { studentId } = req.params;
    const { item_type, term, academic_year } = req.query;

    const allowed = await canAccessStudent(req, studentId);
    if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });

    let sql = `SELECT pi.*,
                      s.name AS subject_name
               FROM student_portfolio_items pi
               LEFT JOIN subjects s ON s.id = pi.subject_id
               WHERE pi.student_id = $1 AND pi.tenant_id = $2`;
    const params = [studentId, tid];
    if (item_type) { sql += ` AND pi.item_type = $${params.length + 1}`; params.push(item_type); }
    if (term) { sql += ` AND pi.term = $${params.length + 1}`; params.push(term); }
    if (academic_year) { sql += ` AND pi.academic_year = $${params.length + 1}`; params.push(academic_year); }
    sql += ' ORDER BY pi.is_featured DESC, pi.created_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get portfolio items error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /student/:studentId — add portfolio item ───────────────────────────
router.post('/student/:studentId', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { studentId } = req.params;

    const allowed = await canAccessStudent(req, studentId);
    if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });

    const {
      title, description, item_type, file_url, subject_id,
      term, academic_year, is_featured
    } = req.body;

    if (!title || !item_type) {
      return res.status(400).json({ success: false, message: 'title and item_type are required' });
    }

    const validTypes = ['work_sample', 'achievement', 'reflection', 'project', 'certificate', 'photo', 'other'];
    if (!validTypes.includes(item_type)) {
      return res.status(400).json({ success: false, message: `item_type must be one of: ${validTypes.join(', ')}` });
    }

    const rows = await query(
      `INSERT INTO student_portfolio_items
         (tenant_id, student_id, title, description, item_type, file_url,
          subject_id, term, academic_year, is_featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [tid, studentId, title, description || null, item_type, file_url || null,
       subject_id || null, term || null, academic_year || null, is_featured || false]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create portfolio item error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /:id — update item ───────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { role } = req.user;

    // Fetch the item first
    const existing = await query(
      `SELECT * FROM student_portfolio_items WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Portfolio item not found' });
    const item = existing[0];

    // Access: admin/superadmin can edit any; student can edit own; teacher can edit in tenant
    if (role !== 'admin' && role !== 'superadmin' && role !== 'teacher') {
      const allowed = await canAccessStudent(req, item.student_id);
      if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { title, description, item_type, file_url, subject_id, term, academic_year, is_featured } = req.body;
    const rows = await query(
      `UPDATE student_portfolio_items SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         item_type = COALESCE($3, item_type),
         file_url = COALESCE($4, file_url),
         subject_id = COALESCE($5, subject_id),
         term = COALESCE($6, term),
         academic_year = COALESCE($7, academic_year),
         is_featured = COALESCE($8, is_featured)
       WHERE id = $9 AND tenant_id = $10 RETURNING *`,
      [title, description, item_type, file_url, subject_id, term, academic_year, is_featured, req.params.id, tid]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update portfolio item error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /:id — delete item ────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { role } = req.user;

    const existing = await query(
      `SELECT * FROM student_portfolio_items WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Portfolio item not found' });
    const item = existing[0];

    if (role !== 'admin' && role !== 'superadmin' && role !== 'teacher') {
      const allowed = await canAccessStudent(req, item.student_id);
      if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await query(
      `DELETE FROM student_portfolio_items WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    res.json({ success: true, message: 'Portfolio item deleted' });
  } catch (err) {
    logger.error('Delete portfolio item error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /:id/feature — toggle is_featured ────────────────────────────────────
router.put('/:id/feature', async (req, res) => {
  try {
    const tid = req.user.tenant_id;

    const existing = await query(
      `SELECT * FROM student_portfolio_items WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Portfolio item not found' });
    const item = existing[0];

    const allowed = await canAccessStudent(req, item.student_id);
    if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });

    const rows = await query(
      `UPDATE student_portfolio_items SET is_featured = NOT is_featured
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [req.params.id, tid]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Toggle portfolio feature error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /student/:studentId/summary ─────────────────────────────────────────
router.get('/student/:studentId/summary', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { studentId } = req.params;

    const allowed = await canAccessStudent(req, studentId);
    if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });

    // Counts by type
    const countRows = await query(
      `SELECT item_type, COUNT(*) AS count
       FROM student_portfolio_items
       WHERE student_id = $1 AND tenant_id = $2
       GROUP BY item_type`,
      [studentId, tid]
    );

    // Featured items
    const featuredRows = await query(
      `SELECT pi.*, s.name AS subject_name
       FROM student_portfolio_items pi
       LEFT JOIN subjects s ON s.id = pi.subject_id
       WHERE pi.student_id = $1 AND pi.tenant_id = $2 AND pi.is_featured = TRUE
       ORDER BY pi.created_at DESC`,
      [studentId, tid]
    );

    // Recent items (last 5)
    const recentRows = await query(
      `SELECT pi.*, s.name AS subject_name
       FROM student_portfolio_items pi
       LEFT JOIN subjects s ON s.id = pi.subject_id
       WHERE pi.student_id = $1 AND pi.tenant_id = $2
       ORDER BY pi.created_at DESC
       LIMIT 5`,
      [studentId, tid]
    );

    const byType = {};
    for (const r of countRows) byType[r.item_type] = parseInt(r.count);

    res.json({
      success: true,
      data: {
        counts_by_type: byType,
        total: countRows.reduce((sum, r) => sum + parseInt(r.count), 0),
        featured: featuredRows,
        recent: recentRows
      }
    });
  } catch (err) {
    logger.error('Get portfolio summary error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
