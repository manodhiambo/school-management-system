import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/v1/discipline?student_id=&class_id=&from=&to=&severity=&is_resolved=
router.get('/', authenticate, async (req, res) => {
  try {
    const { student_id, class_id, from, to, severity, is_resolved, limit = 50, offset = 0 } = req.query;
    const tid = req.user.tenant_id;
    let sql = `SELECT di.*,
               s.first_name||' '||s.last_name as student_name,
               s.admission_number,
               c.name as class_name,
               u.email as reported_by_email
               FROM discipline_incidents di
               JOIN students s ON s.id = di.student_id
               LEFT JOIN classes c ON c.id = di.class_id
               LEFT JOIN users u ON u.id = di.reported_by
               WHERE di.tenant_id = $1`;
    const params = [tid];
    if (student_id) { sql += ` AND di.student_id=$${params.length+1}`; params.push(student_id); }
    if (class_id) { sql += ` AND di.class_id=$${params.length+1}`; params.push(class_id); }
    if (from) { sql += ` AND di.incident_date >= $${params.length+1}`; params.push(from); }
    if (to) { sql += ` AND di.incident_date <= $${params.length+1}`; params.push(to); }
    if (severity) { sql += ` AND di.severity=$${params.length+1}`; params.push(severity); }
    if (is_resolved !== undefined) { sql += ` AND di.is_resolved=$${params.length+1}`; params.push(is_resolved === 'true'); }
    sql += ` ORDER BY di.incident_date DESC, di.created_at DESC
             LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(parseInt(limit), parseInt(offset));
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get discipline incidents error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/discipline/stats — summary stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { academic_year } = req.query;
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT incident_type, severity, COUNT(*) as count
       FROM discipline_incidents
       WHERE tenant_id=$1 ${academic_year ? 'AND EXTRACT(YEAR FROM incident_date)=$2' : ''}
       GROUP BY incident_type, severity ORDER BY count DESC`,
      academic_year ? [tid, academic_year] : [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/discipline/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const rows = await query(
      `SELECT di.*, s.first_name||' '||s.last_name as student_name,
       s.admission_number, c.name as class_name
       FROM discipline_incidents di
       JOIN students s ON s.id = di.student_id
       LEFT JOIN classes c ON c.id = di.class_id
       WHERE di.id=$1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/discipline
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      student_id, class_id, incident_date, incident_type, severity,
      description, location, witnesses, action_taken, action_details,
      suspension_days, suspension_start, suspension_end, follow_up_date
    } = req.body;
    const tid = req.user.tenant_id;
    const rows = await query(
      `INSERT INTO discipline_incidents
       (student_id, class_id, incident_date, incident_type, severity,
        description, location, witnesses, action_taken, action_details,
        suspension_days, suspension_start, suspension_end, follow_up_date,
        reported_by, handled_by, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15,$16) RETURNING *`,
      [student_id, class_id || null, incident_date || new Date(),
       incident_type, severity, description, location || null,
       witnesses || null, action_taken || null, action_details || null,
       suspension_days || null, suspension_start || null, suspension_end || null,
       follow_up_date || null, req.user.id, tid]
    );
    const incident = rows[0];

    // Auto-notify parents
    try {
      const { sendStudentAlert } = await import('./parentAlertsRoutes.js');
      const alertMsg = `A discipline incident has been recorded for your child on ${incident_date || new Date().toLocaleDateString()}. Type: ${incident_type}. Severity: ${severity}. ${action_taken ? 'Action taken: ' + action_taken : ''}`;
      await sendStudentAlert(student_id, 'discipline_incident',
        'Discipline Incident Reported', alertMsg, 'discipline_incident', incident.id, tid);
      await query('UPDATE discipline_incidents SET parent_notified=TRUE, parent_notified_at=NOW() WHERE id=$1', [incident.id]);
    } catch (notifyErr) {
      logger.warn('Parent notification failed:', notifyErr.message);
    }

    res.status(201).json({ success: true, data: incident });
  } catch (err) {
    logger.error('Create discipline incident error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/discipline/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      action_taken, action_details, suspension_days, suspension_start,
      suspension_end, follow_up_notes, is_resolved, parent_response
    } = req.body;
    const rows = await query(
      `UPDATE discipline_incidents SET
       action_taken=COALESCE($1,action_taken), action_details=COALESCE($2,action_details),
       suspension_days=COALESCE($3,suspension_days), suspension_start=COALESCE($4,suspension_start),
       suspension_end=COALESCE($5,suspension_end), follow_up_notes=COALESCE($6,follow_up_notes),
       is_resolved=COALESCE($7,is_resolved),
       resolved_at=CASE WHEN $7=TRUE THEN NOW() ELSE resolved_at END,
       parent_response=COALESCE($8,parent_response), updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [action_taken, action_details, suspension_days, suspension_start,
       suspension_end, follow_up_notes, is_resolved, parent_response, req.params.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/discipline/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM discipline_incidents WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Incident deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
