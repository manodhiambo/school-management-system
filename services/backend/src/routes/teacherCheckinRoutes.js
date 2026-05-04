import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);
router.use(tenantContext);
router.use(requireActiveTenant);

// ─── Helper: parse "HH:MM" into a Date for today ────────────────────────────
function timeToday(hhmm) {
  const [h, m] = (hhmm || '08:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

// ─── GET school check-in hours (public to auth users) ────────────────────────
router.get('/school-hours', async (req, res) => {
  try {
    const tid = req.tenantId;
    let s = {};
    try {
      const rows = await query(
        `SELECT teacher_checkin_start, teacher_checkin_late_after, teacher_checkin_end
         FROM settings WHERE tenant_id = $1 LIMIT 1`,
        [tid]
      );
      s = rows[0] || {};
    } catch { /* columns not yet migrated — return defaults */ }
    res.json({
      success: true,
      data: {
        start:      s.teacher_checkin_start      || '08:00',
        late_after: s.teacher_checkin_late_after  || '08:15',
        end:        s.teacher_checkin_end         || '17:00',
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Teacher: check in (mark present + GPS) ───────────────────────────────────
router.post('/checkin', async (req, res) => {
  try {
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Teachers and admin only' });
    }
    const tid = req.tenantId;
    const { latitude, longitude, notes } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Read configurable late-after and end time from settings (fallback to defaults if columns missing)
    let sch = {};
    try {
      const settingsRows = await query(
        `SELECT teacher_checkin_late_after, teacher_checkin_end
         FROM settings WHERE tenant_id = $1 LIMIT 1`,
        [tid]
      );
      sch = settingsRows[0] || {};
    } catch { /* columns not yet migrated — use defaults */ }
    const lateAfter = sch.teacher_checkin_late_after || '08:15';
    const checkinEnd = sch.teacher_checkin_end || '17:00';

    const now = new Date();
    if (now > timeToday(checkinEnd)) {
      return res.status(400).json({ success: false, message: `Check-in is closed for today (closes at ${checkinEnd})` });
    }
    const status = now > timeToday(lateAfter) ? 'late' : 'present';

    // If teacher_checkins table doesn't exist yet (migration pending), tell user clearly
    let existing;
    try {
      existing = await query(
        'SELECT id FROM teacher_checkins WHERE teacher_id=$1 AND checkin_date=$2 AND tenant_id=$3',
        [req.user.id, today, tid]
      );
    } catch (e) {
      return res.status(503).json({
        success: false,
        message: 'Check-in service is initialising — please try again in 30 seconds.'
      });
    }

    let record;
    if (existing.length) {
      // Already checked in — update notes/location only if not already done
      const rows = await query(
        `UPDATE teacher_checkins SET
           checkin_time=COALESCE(checkin_time, NOW()),
           checkin_lat=COALESCE(checkin_lat,$1), checkin_lng=COALESCE(checkin_lng,$2),
           notes=COALESCE($3, notes), updated_at=NOW()
         WHERE id=$4 RETURNING *`,
        [latitude || null, longitude || null, notes || null, existing[0].id]
      );
      record = rows[0];
    } else {
      const rows = await query(
        `INSERT INTO teacher_checkins
           (id, tenant_id, teacher_id, checkin_date, checkin_time,
            checkin_lat, checkin_lng, status, notes)
         VALUES ($1,$2,$3,$4,NOW(),$5,$6,$7,$8) RETURNING *`,
        [uuidv4(), tid, req.user.id, today,
         latitude || null, longitude || null, status, notes || null]
      );
      record = rows[0];
    }

    // Send admin notification
    try {
      const teacherInfo = await query(
        'SELECT first_name, last_name FROM users WHERE id=$1',
        [req.user.id]
      );
      const name = teacherInfo.length
        ? `${teacherInfo[0].first_name} ${teacherInfo[0].last_name}`
        : 'A teacher';
      const timeStr = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
      const locationPart = latitude
        ? ` GPS: https://www.google.com/maps?q=${latitude},${longitude}`
        : ' (no GPS)';
      const msgText = status === 'late'
        ? `${name} checked in LATE at ${timeStr}.${locationPart}`
        : `${name} checked in at ${timeStr}.${locationPart}`;

      // Insert notification for all admins
      const admins = await query(
        'SELECT id FROM users WHERE role=\'admin\' AND tenant_id=$1',
        [tid]
      );
      for (const admin of admins) {
        await query(
          `INSERT INTO notifications (id, tenant_id, user_id, title, message, type, is_read)
           VALUES ($1,$2,$3,$4,$5,'teacher_checkin',FALSE)`,
          [uuidv4(), tid, admin.id,
           status === 'late' ? 'Late Check-in' : 'Teacher Check-in', msgText]
        ).catch(() => {});
      }
    } catch (notifErr) {
      logger.warn('Check-in notification error:', notifErr.message);
    }

    res.json({ success: true, data: record, status });
  } catch (err) {
    logger.error('Teacher check-in error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Teacher: check out ────────────────────────────────────────────────────────
router.post('/checkout', async (req, res) => {
  try {
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const tid = req.tenantId;
    const { latitude, longitude, notes } = req.body;
    const today = new Date().toISOString().split('T')[0];

    const rows = await query(
      `UPDATE teacher_checkins SET
         checkout_time=NOW(), checkout_lat=$1, checkout_lng=$2,
         notes=COALESCE($3, notes), updated_at=NOW()
       WHERE teacher_id=$4 AND checkin_date=$5 AND tenant_id=$6 RETURNING *`,
      [latitude || null, longitude || null, notes || null, req.user.id, today, tid]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'No check-in record found for today' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Teacher check-out error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Teacher: get own check-in status for today ───────────────────────────────
router.get('/my-status', async (req, res) => {
  try {
    const tid = req.tenantId;
    const { date } = req.query;
    const d = date || new Date().toISOString().split('T')[0];

    const rows = await query(
      'SELECT * FROM teacher_checkins WHERE teacher_id=$1 AND checkin_date=$2 AND tenant_id=$3',
      [req.user.id, d, tid]
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Admin: get all teacher check-ins for a date ─────────────────────────────
router.get('/today', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  const tid = req.tenantId;
  const { date } = req.query;
  const d = date || new Date().toISOString().split('T')[0];

  // Each query is independently wrapped — a missing column or table never 500s
  let allTeachers = [];
  try {
    allTeachers = await query(
      `SELECT id, first_name, last_name, email
       FROM users
       WHERE role = 'teacher' AND tenant_id = $1 AND is_active = TRUE
       ORDER BY first_name`,
      [tid]
    );
  } catch (e) {
    logger.warn('allTeachers query failed:', e.message);
  }

  let rows = [];
  try {
    rows = await query(
      `SELECT tc.*, u.first_name, u.last_name, u.email
       FROM teacher_checkins tc
       JOIN users u ON u.id = tc.teacher_id AND u.tenant_id = $2
       WHERE tc.checkin_date = $1 AND tc.tenant_id = $2
       ORDER BY tc.checkin_time ASC`,
      [d, tid]
    );
  } catch (e) {
    logger.warn('teacher_checkins not ready:', e.message);
  }

  const checkedInIds = new Set(rows.map(r => r.teacher_id));
  const notCheckedIn = allTeachers.filter(t => !checkedInIds.has(t.id)).map(t => ({
    ...t,
    checkin_date: d, status: 'absent',
    checkin_time: null, checkout_time: null, checkin_lat: null, checkin_lng: null,
  }));

  return res.json({
    success: true,
    data: {
      checkins: rows,
      not_checked_in: notCheckedIn,
      summary: {
        present: rows.filter(r => r.status === 'present').length,
        late:    rows.filter(r => r.status === 'late').length,
        absent:  notCheckedIn.length,
        total:   allTeachers.length,
      }
    }
  });
});

// ─── Admin: get check-in history / report ─────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const tid = req.tenantId;
    const { from_date, to_date, teacher_id } = req.query;
    const from = from_date || new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const to   = to_date   || new Date().toISOString().split('T')[0];

    let sql = `
      SELECT tc.*, u.first_name, u.last_name
      FROM teacher_checkins tc
      JOIN users u ON u.id = tc.teacher_id
      WHERE tc.tenant_id = $1 AND tc.checkin_date BETWEEN $2 AND $3`;
    const params = [tid, from, to];

    if (teacher_id) {
      sql += ` AND tc.teacher_id = $4`;
      params.push(teacher_id);
    }
    sql += ' ORDER BY tc.checkin_date DESC, tc.checkin_time ASC';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
