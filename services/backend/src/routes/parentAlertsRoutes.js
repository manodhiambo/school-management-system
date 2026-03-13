import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Helper: send alert to all parents of a student
async function sendStudentAlert(studentId, alertType, title, message, referenceType, referenceId, tenantId) {
  try {
    // Get all parents linked to this student
    const parents = await query(
      `SELECT p.id as parent_id, p.sms_alerts, p.email_alerts,
       p.whatsapp_alerts, p.alert_attendance, p.alert_grades,
       p.alert_fees, p.alert_discipline, p.alert_general
       FROM parents p
       JOIN parent_students ps ON ps.parent_id = p.id
       WHERE ps.student_id = $1 AND p.tenant_id = $2`,
      [studentId, tenantId]
    );

    const alertTypePref = {
      attendance_absent: 'alert_attendance', attendance_late: 'alert_attendance',
      attendance_early_exit: 'alert_attendance',
      grade_published: 'alert_grades', grade_low: 'alert_grades', report_card: 'alert_grades',
      fee_due: 'alert_fees', fee_overdue: 'alert_fees', fee_payment_received: 'alert_fees',
      fee_reminder: 'alert_fees',
      discipline_incident: 'alert_discipline', discipline_action: 'alert_discipline',
      exam_schedule: 'alert_general', exam_result: 'alert_grades',
      assignment_due: 'alert_general', assignment_graded: 'alert_grades',
      health_incident: 'alert_general', transport_delay: 'alert_general',
      general_announcement: 'alert_general', system: 'alert_general'
    };

    const insertPromises = parents.map(parent => {
      const prefKey = alertTypePref[alertType] || 'alert_general';
      if (!parent[prefKey]) return Promise.resolve(); // Parent opted out
      return query(
        `INSERT INTO parent_alerts
         (parent_id, student_id, alert_type, title, message, in_app_sent,
          reference_type, reference_id, tenant_id)
         VALUES ($1,$2,$3,$4,$5,TRUE,$6,$7,$8)`,
        [parent.parent_id, studentId, alertType, title, message,
         referenceType || null, referenceId || null, tenantId]
      );
    });
    await Promise.all(insertPromises);
    return parents.length;
  } catch (err) {
    logger.error('sendStudentAlert error:', err);
    return 0;
  }
}

// Export helper for use in other routes
export { sendStudentAlert };

// ============================================================
// ALERT ENDPOINTS
// ============================================================

// GET /api/v1/parent-alerts — parent sees their alerts
router.get('/', authenticate, async (req, res) => {
  try {
    const { student_id, alert_type, is_read, limit = 50, offset = 0 } = req.query;
    const tid = req.user.tenant_id;

    // Find parent record for logged-in user
    let parentId = null;
    if (req.user.role === 'parent') {
      const pRows = await query('SELECT id FROM parents WHERE user_id=$1', [req.user.id]);
      if (pRows.length) parentId = pRows[0].id;
    }

    let sql = `SELECT pa.*, s.first_name||' '||s.last_name as student_name
               FROM parent_alerts pa
               JOIN students s ON s.id = pa.student_id
               WHERE pa.tenant_id = $1`;
    const params = [tid];

    if (parentId && req.user.role === 'parent') {
      sql += ` AND pa.parent_id = $${params.length+1}`; params.push(parentId);
    }
    if (student_id) { sql += ` AND pa.student_id = $${params.length+1}`; params.push(student_id); }
    if (alert_type) { sql += ` AND pa.alert_type = $${params.length+1}`; params.push(alert_type); }
    if (is_read !== undefined) { sql += ` AND pa.is_read = $${params.length+1}`; params.push(is_read === 'true'); }

    sql += ` ORDER BY pa.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(parseInt(limit), parseInt(offset));

    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get parent alerts error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET unread count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    let sql = `SELECT COUNT(*) as count FROM parent_alerts WHERE tenant_id=$1 AND is_read=FALSE`;
    const params = [tid];
    if (req.user.role === 'parent') {
      const pRows = await query('SELECT id FROM parents WHERE user_id=$1', [req.user.id]);
      if (pRows.length) { sql += ` AND parent_id=$${params.length+1}`; params.push(pRows[0].id); }
    }
    const rows = await query(sql, params);
    res.json({ success: true, data: { count: parseInt(rows[0].count) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /:id/read — mark single alert as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await query('UPDATE parent_alerts SET is_read=TRUE, read_at=NOW() WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /mark-all-read
router.put('/mark-all-read', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    let sql = `UPDATE parent_alerts SET is_read=TRUE, read_at=NOW() WHERE tenant_id=$1 AND is_read=FALSE`;
    const params = [tid];
    if (req.user.role === 'parent') {
      const pRows = await query('SELECT id FROM parents WHERE user_id=$1', [req.user.id]);
      if (pRows.length) { sql += ` AND parent_id=$${params.length+1}`; params.push(pRows[0].id); }
    }
    await query(sql, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /send — admin/teacher manually sends an alert
router.post('/send', authenticate, async (req, res) => {
  try {
    const { student_id, alert_type, title, message, reference_type, reference_id } = req.body;
    const tid = req.user.tenant_id;
    const count = await sendStudentAlert(student_id, alert_type, title, message, reference_type, reference_id, tid);
    res.json({ success: true, message: `Alert sent to ${count} parent(s)` });
  } catch (err) {
    logger.error('Send alert error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /broadcast — send alert to all parents in a class or all
router.post('/broadcast', authenticate, async (req, res) => {
  try {
    const { class_id, alert_type, title, message } = req.body;
    const tid = req.user.tenant_id;

    let studentRows;
    if (class_id) {
      studentRows = await query('SELECT id FROM students WHERE class_id=$1 AND tenant_id=$2', [class_id, tid]);
    } else {
      studentRows = await query('SELECT id FROM students WHERE tenant_id=$1 AND is_active=TRUE', [tid]);
    }

    let totalSent = 0;
    for (const s of studentRows) {
      const count = await sendStudentAlert(s.id, alert_type, title, message, null, null, tid);
      totalSent += count;
    }
    res.json({ success: true, message: `Broadcast sent to ${totalSent} parent(s) across ${studentRows.length} students` });
  } catch (err) {
    logger.error('Broadcast error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /student/:studentId — all alerts for a student (admin/teacher view)
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const rows = await query(
      `SELECT pa.*, p.first_name||' '||p.last_name as parent_name
       FROM parent_alerts pa
       JOIN parents p ON p.id = pa.parent_id
       WHERE pa.student_id=$1 ORDER BY pa.created_at DESC LIMIT 100`,
      [req.params.studentId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
