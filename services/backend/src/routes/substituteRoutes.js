import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

function requireAdminOrTeacher(req, res, next) {
  const role = req.user.role;
  if (role !== 'admin' && role !== 'teacher' && role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Admin or teacher access required' });
  }
  next();
}

// GET /api/v1/substitutes
// Admin: all. Teacher: records where they are absent_teacher OR substitute.
// Query params: date, class_id
router.get('/', requireAdminOrTeacher, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    const { date, class_id } = req.query;

    let sql = `SELECT sa.*,
                      ua.first_name || ' ' || ua.last_name AS absent_teacher_name,
                      ua.email AS absent_teacher_email,
                      us.first_name || ' ' || us.last_name AS substitute_name,
                      us.email AS substitute_email,
                      c.name AS class_name,
                      sub.name AS subject_name
               FROM substitute_assignments sa
               JOIN users ua ON ua.id = sa.absent_teacher
               JOIN users us ON us.id = sa.substitute
               LEFT JOIN classes c ON c.id = sa.class_id
               LEFT JOIN subjects sub ON sub.id = sa.subject_id
               WHERE sa.tenant_id = $1`;
    const params = [tid];

    if (role === 'teacher') {
      sql += ` AND (sa.absent_teacher = $${params.length + 1} OR sa.substitute = $${params.length + 1})`;
      params.push(req.user.id);
    }
    if (date) {
      sql += ` AND sa.assignment_date = $${params.length + 1}`;
      params.push(date);
    }
    if (class_id) {
      sql += ` AND sa.class_id = $${params.length + 1}`;
      params.push(class_id);
    }

    sql += ` ORDER BY sa.assignment_date DESC, sa.period`;
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get substitutions error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/substitutes — admin creates substitution
// Body: {absent_teacher, substitute, class_id, subject_id?, assignment_date, period?, reason?}
router.post('/', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { absent_teacher, substitute, class_id, subject_id, assignment_date, period, reason } = req.body;
    if (!absent_teacher || !substitute || !assignment_date) {
      return res.status(400).json({
        success: false,
        message: 'absent_teacher, substitute and assignment_date are required'
      });
    }
    if (absent_teacher === substitute) {
      return res.status(400).json({ success: false, message: 'absent_teacher and substitute cannot be the same person' });
    }

    // verify substitute is a teacher in this tenant
    const subCheck = await query(
      `SELECT id, role FROM users WHERE id = $1 AND tenant_id = $2`,
      [substitute, tid]
    );
    if (subCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'Substitute user not found' });
    }
    if (subCheck[0].role !== 'teacher') {
      return res.status(400).json({ success: false, message: 'Substitute must be a teacher' });
    }

    const rows = await query(
      `INSERT INTO substitute_assignments
         (tenant_id, absent_teacher, substitute, class_id, subject_id, assignment_date, period, reason, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9)
       RETURNING *`,
      [tid, absent_teacher, substitute, class_id, subject_id || null, assignment_date, period || null, reason || null, req.user.id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create substitution error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/substitutes/:id/status — update status
// Body: {status}
router.put('/:id/status', requireAdminOrTeacher, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status } = req.body;
    const allowed = ['active', 'completed', 'cancelled'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(', ')}` });
    }

    const rows = await query(
      `UPDATE substitute_assignments SET status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [status, req.params.id, tid]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Substitution not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update substitution status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/substitutes/:id — admin cancels/deletes
router.delete('/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const rows = await query(
      `DELETE FROM substitute_assignments WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [req.params.id, tid]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Substitution not found' });
    res.json({ success: true, message: 'Substitution deleted' });
  } catch (err) {
    logger.error('Delete substitution error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/substitutes/available-teachers?date=YYYY-MM-DD
// List teachers who are NOT absent (no approved leave) on the given date.
router.get('/available-teachers', requireAdminOrTeacher, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'date query param is required' });

    const rows = await query(
      `SELECT u.id, u.first_name || ' ' || u.last_name AS full_name, u.email
       FROM users u
       WHERE u.tenant_id = $1
         AND u.role = 'teacher'
         AND u.id NOT IN (
           SELECT slr.user_id
           FROM staff_leave_requests slr
           WHERE slr.tenant_id = $1
             AND slr.status = 'approved'
             AND $2::date BETWEEN slr.start_date AND slr.end_date
         )
       ORDER BY u.first_name`,
      [tid, date]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get available teachers error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
