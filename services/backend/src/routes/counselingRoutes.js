import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

function isAdminOrTeacher(role) {
  return role === 'admin' || role === 'teacher' || role === 'superadmin';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COUNSELING SESSIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// GET /api/v1/counseling/sessions
// Admin: all sessions. Teacher: sessions they created (counselor_id = user.id).
// Confidential sessions only visible to the counselor or admin.
// Query: student_id, status
router.get('/sessions', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    if (!isAdminOrTeacher(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { student_id, status } = req.query;

    let sql = `SELECT cs.*,
                      s.first_name || ' ' || s.last_name AS student_name,
                      s.admission_number,
                      u.first_name || ' ' || u.last_name AS counselor_name,
                      u.email AS counselor_email
               FROM counseling_sessions cs
               LEFT JOIN students s ON s.id = cs.student_id
               JOIN users u ON u.id = cs.counselor_id
               WHERE cs.tenant_id = $1
                 AND (
                   cs.is_confidential = false
                   OR cs.counselor_id = $2
                   OR $3 = true
                 )`;
    const params = [tid, req.user.id, (role === 'admin' || role === 'superadmin')];

    if (role === 'teacher') {
      sql += ` AND cs.counselor_id = $${params.length + 1}`;
      params.push(req.user.id);
    }
    if (student_id) {
      sql += ` AND cs.student_id = $${params.length + 1}`;
      params.push(student_id);
    }
    if (status) {
      sql += ` AND cs.status = $${params.length + 1}`;
      params.push(status);
    }

    sql += ` ORDER BY cs.session_date DESC`;
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get counseling sessions error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/counseling/sessions
// Body: {student_id, session_date, session_type, notes, follow_up_date?, is_confidential, referred_to?}
router.post('/sessions', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    if (!isAdminOrTeacher(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { student_id, session_date, session_type, notes, follow_up_date, is_confidential, referred_to } = req.body;
    if (!student_id || !session_date || !session_type) {
      return res.status(400).json({ success: false, message: 'student_id, session_date and session_type are required' });
    }

    const rows = await query(
      `INSERT INTO counseling_sessions
         (tenant_id, student_id, counselor_id, session_date, session_type, notes,
          follow_up_date, is_confidential, status, referred_to)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open',$9)
       RETURNING *`,
      [tid, student_id, req.user.id, session_date, session_type,
       notes || null, follow_up_date || null,
       is_confidential === true || is_confidential === 'true',
       referred_to || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create counseling session error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/counseling/sessions/:id — update session (counselor or admin)
router.put('/sessions/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    if (!isAdminOrTeacher(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const existing = await query(
      `SELECT * FROM counseling_sessions WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Session not found' });

    if (role === 'teacher' && existing[0].counselor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorised to edit this session' });
    }

    const { session_date, session_type, notes, follow_up_date, is_confidential, referred_to } = req.body;

    const rows = await query(
      `UPDATE counseling_sessions
       SET session_date    = COALESCE($1, session_date),
           session_type    = COALESCE($2, session_type),
           notes           = COALESCE($3, notes),
           follow_up_date  = COALESCE($4, follow_up_date),
           is_confidential = COALESCE($5, is_confidential),
           referred_to     = COALESCE($6, referred_to)
       WHERE id = $7 AND tenant_id = $8
       RETURNING *`,
      [session_date || null, session_type || null, notes || null,
       follow_up_date || null,
       is_confidential != null ? (is_confidential === true || is_confidential === 'true') : null,
       referred_to || null,
       req.params.id, tid]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update counseling session error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/counseling/sessions/:id/resolve
// Body: {status, referred_to?}
router.put('/sessions/:id/resolve', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    if (!isAdminOrTeacher(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { status, referred_to } = req.body;
    const allowed = ['resolved', 'referred', 'follow-up'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(', ')}` });
    }

    const existing = await query(
      `SELECT * FROM counseling_sessions WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Session not found' });
    if (role === 'teacher' && existing[0].counselor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    const rows = await query(
      `UPDATE counseling_sessions
       SET status      = $1,
           referred_to = COALESCE($2, referred_to)
       WHERE id = $3 AND tenant_id = $4
       RETURNING *`,
      [status, referred_to || null, req.params.id, tid]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Resolve counseling session error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STUDENT INTERVENTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// GET /api/v1/counseling/interventions
// Query: student_id, is_resolved, priority
router.get('/interventions', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    if (!isAdminOrTeacher(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { student_id, is_resolved, priority } = req.query;

    let sql = `SELECT si.*,
                      s.first_name || ' ' || s.last_name AS student_name,
                      s.admission_number,
                      u.first_name || ' ' || u.last_name AS flagged_by_name,
                      u.email AS flagged_by_email
               FROM student_interventions si
               LEFT JOIN students s ON s.id = si.student_id
               LEFT JOIN users u ON u.id = si.flagged_by
               WHERE si.tenant_id = $1`;
    const params = [tid];

    if (student_id) {
      sql += ` AND si.student_id = $${params.length + 1}`;
      params.push(student_id);
    }
    if (is_resolved !== undefined) {
      sql += ` AND si.is_resolved = $${params.length + 1}`;
      params.push(is_resolved === 'true');
    }
    if (priority) {
      sql += ` AND si.priority = $${params.length + 1}`;
      params.push(priority);
    }

    sql += ` ORDER BY si.is_resolved ASC, si.created_at DESC`;
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get interventions error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/counseling/interventions — flag a student
// Body: {student_id, flag_type, description, priority}
router.post('/interventions', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    if (!isAdminOrTeacher(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { student_id, flag_type, description, priority } = req.body;
    if (!student_id || !flag_type || !description) {
      return res.status(400).json({ success: false, message: 'student_id, flag_type and description are required' });
    }

    const rows = await query(
      `INSERT INTO student_interventions
         (tenant_id, student_id, flagged_by, flag_type, description, priority, is_resolved)
       VALUES ($1,$2,$3,$4,$5,$6, false)
       RETURNING *`,
      [tid, student_id, req.user.id, flag_type, description, priority || 'medium']
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create intervention error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/counseling/interventions/:id — update action_taken
router.put('/interventions/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    if (!isAdminOrTeacher(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { action_taken, priority, flag_type, description } = req.body;

    const rows = await query(
      `UPDATE student_interventions
       SET action_taken = COALESCE($1, action_taken),
           priority     = COALESCE($2, priority),
           flag_type    = COALESCE($3, flag_type),
           description  = COALESCE($4, description)
       WHERE id = $5 AND tenant_id = $6
       RETURNING *`,
      [action_taken || null, priority || null, flag_type || null, description || null, req.params.id, tid]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Intervention not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update intervention error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/counseling/interventions/:id/resolve
router.put('/interventions/:id/resolve', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    if (!isAdminOrTeacher(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const rows = await query(
      `UPDATE student_interventions
       SET is_resolved = true, resolved_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [req.params.id, tid]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Intervention not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Resolve intervention error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/counseling/student/:studentId — combined sessions + interventions (admin/counselor only)
router.get('/student/:studentId', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    if (role !== 'admin' && role !== 'superadmin' && role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const isAdmin = role === 'admin' || role === 'superadmin';

    const [sessions, interventions] = await Promise.all([
      query(
        `SELECT cs.*,
                u.first_name || ' ' || u.last_name AS counselor_name
         FROM counseling_sessions cs
         JOIN users u ON u.id = cs.counselor_id
         WHERE cs.student_id = $1
           AND cs.tenant_id = $2
           AND (cs.is_confidential = false OR cs.counselor_id = $3 OR $4 = true)
         ORDER BY cs.session_date DESC`,
        [req.params.studentId, tid, req.user.id, isAdmin]
      ),
      query(
        `SELECT si.*,
                u.first_name || ' ' || u.last_name AS flagged_by_name
         FROM student_interventions si
         LEFT JOIN users u ON u.id = si.flagged_by
         WHERE si.student_id = $1 AND si.tenant_id = $2
         ORDER BY si.created_at DESC`,
        [req.params.studentId, tid]
      )
    ]);

    const studentRows = await query(
      `SELECT id, first_name || ' ' || last_name AS full_name, admission_number
       FROM students WHERE id = $1 AND tenant_id = $2`,
      [req.params.studentId, tid]
    );

    res.json({
      success: true,
      data: {
        student: studentRows[0] || null,
        sessions,
        interventions
      }
    });
  } catch (err) {
    logger.error('Get student counseling data error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/counseling/dashboard — summary stats
router.get('/dashboard', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    if (!isAdminOrTeacher(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const [
      sessionStats,
      interventionStats,
      priorityStats,
      typeStats
    ] = await Promise.all([
      query(
        `SELECT status, COUNT(*) AS count
         FROM counseling_sessions
         WHERE tenant_id = $1
         GROUP BY status`,
        [tid]
      ),
      query(
        `SELECT COUNT(*) FILTER (WHERE is_resolved = false) AS active_count,
                COUNT(*) FILTER (WHERE is_resolved = true) AS resolved_count,
                COUNT(*) AS total_count
         FROM student_interventions
         WHERE tenant_id = $1`,
        [tid]
      ),
      query(
        `SELECT priority, COUNT(*) AS count
         FROM student_interventions
         WHERE tenant_id = $1 AND is_resolved = false
         GROUP BY priority
         ORDER BY count DESC`,
        [tid]
      ),
      query(
        `SELECT session_type, COUNT(*) AS count
         FROM counseling_sessions
         WHERE tenant_id = $1
         GROUP BY session_type
         ORDER BY count DESC`,
        [tid]
      )
    ]);

    const openSessions = sessionStats.find(r => r.status === 'open');
    const interventionRow = interventionStats[0] || {};

    res.json({
      success: true,
      data: {
        open_sessions: parseInt(openSessions?.count || 0),
        sessions_by_status: sessionStats,
        active_interventions: parseInt(interventionRow.active_count || 0),
        resolved_interventions: parseInt(interventionRow.resolved_count || 0),
        total_interventions: parseInt(interventionRow.total_count || 0),
        interventions_by_priority: priorityStats,
        sessions_by_type: typeStats
      }
    });
  } catch (err) {
    logger.error('Counseling dashboard error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
