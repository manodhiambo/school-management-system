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

// ─── Driver: get own assigned route + full student list ───────────────────────
router.get('/my-route', async (req, res) => {
  try {
    if (!['driver', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const tid = req.tenantId;
    const driverId = req.user.role === 'driver' ? req.user.id : req.query.driver_id;

    let routes = [];
    try {
      routes = await query(
        `SELECT r.*, u.first_name||' '||u.last_name AS driver_name
         FROM transport_routes r
         LEFT JOIN users u ON u.id = r.driver_user_id AND u.tenant_id = $2
         WHERE r.driver_user_id = $1 AND r.tenant_id = $2 AND r.is_active = TRUE`,
        [driverId, tid]
      );
    } catch (colErr) {
      logger.warn('my-route query error (driver_user_id may not exist yet):', colErr.message);
    }
    if (!routes.length) {
      return res.status(404).json({ success: false, message: 'No route assigned to this driver' });
    }
    const route = routes[0];

    // Students on this route — try with parent subqueries first, fall back to basic list
    let students = [];
    try {
      students = await query(
        `SELECT
           st.id AS assignment_id, st.student_id, st.pickup_stop, st.dropoff_stop,
           s.first_name, s.last_name, s.admission_number,
           c.name AS class_name,
           (SELECT p.phone FROM parents p
            JOIN parent_students ps ON ps.parent_id = p.id
            WHERE ps.student_id = s.id AND p.tenant_id = $2
            ORDER BY p.created_at LIMIT 1) AS parent_phone,
           (SELECT p.first_name||' '||p.last_name FROM parents p
            JOIN parent_students ps ON ps.parent_id = p.id
            WHERE ps.student_id = s.id AND p.tenant_id = $2
            ORDER BY p.created_at LIMIT 1) AS parent_name
         FROM student_transport st
         JOIN students s ON s.id = st.student_id AND s.tenant_id = $2
         LEFT JOIN classes c ON c.id = s.class_id
         WHERE st.route_id = $1 AND st.is_active = TRUE AND st.tenant_id = $2
         ORDER BY st.pickup_stop, s.first_name`,
        [route.id, tid]
      );
    } catch {
      // Fallback: basic student list without parent info
      try {
        students = await query(
          `SELECT st.id AS assignment_id, st.student_id, st.pickup_stop, st.dropoff_stop,
                  s.first_name, s.last_name, s.admission_number,
                  c.name AS class_name,
                  NULL AS parent_phone, NULL AS parent_name
           FROM student_transport st
           JOIN students s ON s.id = st.student_id AND s.tenant_id = $2
           LEFT JOIN classes c ON c.id = s.class_id
           WHERE st.route_id = $1 AND st.is_active = TRUE AND st.tenant_id = $2
           ORDER BY s.first_name`,
          [route.id, tid]
        );
      } catch { students = []; }
    }

    res.json({ success: true, data: { route, students } });
  } catch (err) {
    logger.error('Driver my-route error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Driver: get today's pickup session (with statuses) ───────────────────────
router.get('/session', async (req, res) => {
  try {
    if (!['driver', 'admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const tid = req.tenantId;
    const { route_id, date, trip_type = 'morning' } = req.query;
    const sessionDate = date || new Date().toISOString().split('T')[0];

    let routeId = route_id;
    if (!routeId && req.user.role === 'driver') {
      try {
        const r = await query(
          'SELECT id FROM transport_routes WHERE driver_user_id=$1 AND tenant_id=$2 AND is_active=TRUE LIMIT 1',
          [req.user.id, tid]
        );
        if (r.length) routeId = r[0].id;
      } catch { /* driver_user_id column may not exist yet */ }
    }

    if (!routeId) return res.status(400).json({ success: false, message: 'route_id required' });

    // All students on route + pickup status — fallback to no-pickups if transport_pickups missing
    let students = [];
    try {
      students = await query(
        `SELECT
           st.student_id, st.pickup_stop, st.dropoff_stop,
           s.first_name, s.last_name, s.admission_number, s.profile_photo_url,
           c.name AS class_name,
           COALESCE(tp.status, 'pending') AS pickup_status,
           tp.id AS pickup_id,
           tp.pickup_time, tp.latitude, tp.longitude, tp.notes
         FROM student_transport st
         JOIN students s ON s.id = st.student_id AND s.tenant_id = $3
         LEFT JOIN classes c ON c.id = s.class_id
         LEFT JOIN transport_pickups tp
           ON tp.student_id = st.student_id
           AND tp.route_id = st.route_id
           AND tp.trip_date = $1
           AND tp.trip_type = $2
           AND tp.tenant_id = $3
         WHERE st.route_id = $4 AND st.is_active = TRUE AND st.tenant_id = $3
         ORDER BY st.pickup_stop, s.first_name`,
        [sessionDate, trip_type, tid, routeId]
      );
    } catch {
      // transport_pickups not yet created — return students with pending status
      try {
        students = await query(
          `SELECT st.student_id, st.pickup_stop, st.dropoff_stop,
                  s.first_name, s.last_name, s.admission_number, s.profile_photo_url,
                  c.name AS class_name,
                  'pending' AS pickup_status,
                  NULL AS pickup_id, NULL AS pickup_time,
                  NULL AS latitude, NULL AS longitude, NULL AS notes
           FROM student_transport st
           JOIN students s ON s.id = st.student_id AND s.tenant_id = $2
           LEFT JOIN classes c ON c.id = s.class_id
           WHERE st.route_id = $1 AND st.is_active = TRUE AND st.tenant_id = $2
           ORDER BY st.pickup_stop, s.first_name`,
          [routeId, tid]
        );
      } catch { students = []; }
    }

    const picked  = students.filter(s => s.pickup_status === 'picked').length;
    const missed  = students.filter(s => s.pickup_status === 'missed').length;
    const pending = students.filter(s => s.pickup_status === 'pending').length;

    res.json({ success: true, data: { students, session: { route_id: routeId, date: sessionDate, trip_type, picked, missed, pending, total: students.length } } });
  } catch (err) {
    logger.error('Driver session error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Driver: mark pickup (picked / dropped / missed / absent) ─────────────────
router.post('/pickup', async (req, res) => {
  try {
    if (!['driver', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const tid = req.tenantId;
    const { student_id, route_id, trip_type = 'morning', status, latitude, longitude, notes } = req.body;

    if (!student_id || !route_id || !['picked', 'dropped', 'missed', 'absent'].includes(status)) {
      return res.status(400).json({ success: false, message: 'student_id, route_id and status (picked/dropped/missed/absent) required' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Upsert pickup record
    const existing = await query(
      'SELECT id FROM transport_pickups WHERE student_id=$1 AND route_id=$2 AND trip_date=$3 AND trip_type=$4 AND tenant_id=$5',
      [student_id, route_id, today, trip_type, tid]
    );

    let record;
    if (existing.length) {
      const rows = await query(
        `UPDATE transport_pickups SET
           status=$1, pickup_time=NOW(), latitude=$2, longitude=$3, notes=$4,
           driver_id=$5, updated_at=NOW()
         WHERE id=$6 RETURNING *`,
        [status, latitude || null, longitude || null, notes || null, req.user.id, existing[0].id]
      );
      record = rows[0];
    } else {
      const rows = await query(
        `INSERT INTO transport_pickups
           (id, tenant_id, route_id, student_id, driver_id, trip_date, trip_type,
            status, pickup_time, latitude, longitude, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9,$10,$11) RETURNING *`,
        [uuidv4(), tid, route_id, student_id, req.user.id, today, trip_type,
         status, latitude || null, longitude || null, notes || null]
      );
      record = rows[0];
    }

    // Send notifications based on status
    try {
      // Get student + parent info
      const studentInfo = await query(
        `SELECT s.first_name||' '||s.last_name AS student_name,
                p.user_id AS parent_user_id,
                p.phone AS parent_phone,
                r.route_name
         FROM students s
         LEFT JOIN parent_students ps ON ps.student_id = s.id AND ps.tenant_id = $3
         LEFT JOIN parents p ON p.id = ps.parent_id AND p.tenant_id = $3
         JOIN transport_routes r ON r.id = $2 AND r.tenant_id = $3
         WHERE s.id = $1 AND s.tenant_id = $3
         LIMIT 1`,
        [student_id, route_id, tid]
      );

      // Get all admin IDs
      const admins = await query(
        `SELECT id FROM users WHERE role='admin' AND tenant_id=$1`,
        [tid]
      );

      const info = studentInfo.length ? studentInfo[0] : null;
      const studentName = info?.student_name || 'Student';
      const routeName   = info?.route_name   || 'route';
      const pickupTime  = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
      const gpsLink     = latitude && longitude ? ` https://www.google.com/maps?q=${latitude},${longitude}` : '';

      // Admin notification message
      const adminMsg = `Transport Update: ${studentName} on route "${routeName}" — status: ${status} at ${pickupTime} (${trip_type}).${gpsLink}`;

      // Notify all admins
      for (const admin of admins) {
        try {
          await query(
            `INSERT INTO notifications (id, tenant_id, user_id, title, message, type, is_read)
             VALUES ($1,$2,$3,$4,$5,'transport',FALSE)`,
            [uuidv4(), tid, admin.id, 'Transport Update', adminMsg]
          );
        } catch (e) { /* non-fatal */ }
      }

      if (info?.parent_user_id) {
        let parentMsg = '';
        let parentAlertMsg = '';

        if (status === 'picked') {
          parentMsg = `✅ ${studentName} has been picked up at ${pickupTime}.${gpsLink}`;
          parentAlertMsg = parentMsg;
        } else if (status === 'dropped') {
          parentMsg = `🏠 ${studentName} has been safely dropped off at ${pickupTime}.${gpsLink}`;
          parentAlertMsg = parentMsg;
        } else if (status === 'missed') {
          parentMsg = `⚠️ URGENT: ${studentName} was not found for ${trip_type} transport on ${routeName}. Please contact the school immediately.`;
          parentAlertMsg = parentMsg;
        } else if (status === 'absent') {
          parentMsg = `${studentName} is marked absent for ${trip_type} transport today.`;
          parentAlertMsg = parentMsg;
        }

        // parent_alerts insert
        try {
          await query(
            `INSERT INTO parent_alerts (id, tenant_id, parent_user_id, student_id, alert_type, message, is_read)
             VALUES ($1,$2,$3,$4,'transport',$5,FALSE)
             ON CONFLICT DO NOTHING`,
            [uuidv4(), tid, info.parent_user_id, student_id, parentAlertMsg]
          );
        } catch (e) { /* non-fatal */ }

        // notifications insert for parent
        try {
          await query(
            `INSERT INTO notifications (id, tenant_id, user_id, title, message, type, is_read)
             VALUES ($1,$2,$3,$4,$5,'transport',FALSE)`,
            [uuidv4(), tid, info.parent_user_id, 'Transport Update', parentMsg]
          );
        } catch (e) { /* non-fatal */ }
      }

      // For missed: also notify all teachers
      if (status === 'missed') {
        try {
          const teachers = await query(
            `SELECT id FROM users WHERE role='teacher' AND tenant_id=$1 AND is_active=TRUE`,
            [tid]
          );
          for (const teacher of teachers) {
            try {
              await query(
                `INSERT INTO notifications (id, tenant_id, user_id, title, message, type, is_read)
                 VALUES ($1,$2,$3,$4,$5,'transport',FALSE)`,
                [uuidv4(), tid, teacher.id, 'Transport Alert',
                 `${studentName} was NOT FOUND for ${trip_type} transport on route ${routeName}. Parent may need to be contacted.`]
              );
            } catch (e) { /* non-fatal */ }
          }
        } catch (e) { /* non-fatal */ }
      }
    } catch (notifyErr) {
      logger.warn('Failed to send transport notifications:', notifyErr.message);
    }

    res.json({ success: true, data: record });
  } catch (err) {
    logger.error('Driver pickup error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Admin: list all drivers ──────────────────────────────────────────────────
router.get('/drivers', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  const tid = req.tenantId;
  try {
    const drivers = await query(
      `SELECT id, first_name, last_name, email
       FROM users
       WHERE role = 'driver' AND tenant_id = $1
       ORDER BY first_name`,
      [tid]
    );
    res.json({ success: true, data: drivers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Admin: assign driver to route ───────────────────────────────────────────
router.put('/routes/:id/driver', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const tid = req.tenantId;
    const { driver_user_id } = req.body;
    const rows = await query(
      `UPDATE transport_routes SET driver_user_id=$1, updated_at=NOW()
       WHERE id=$2 AND tenant_id=$3 RETURNING *`,
      [driver_user_id || null, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Route not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Admin: today's transport overview ───────────────────────────────────────
router.get('/tracking-overview', async (req, res) => {
  try {
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const tid = req.tenantId;
    const { date, trip_type = 'morning' } = req.query;
    const d = date || new Date().toISOString().split('T')[0];

    let rows;
    try {
      rows = await query(
        `SELECT
           r.id AS route_id, r.route_name, r.vehicle_registration,
           u.first_name||' '||u.last_name AS driver_name,
           COUNT(st.id) AS total_students,
           COUNT(tp.id) FILTER (WHERE tp.status='picked')  AS picked,
           COUNT(tp.id) FILTER (WHERE tp.status='dropped') AS dropped,
           COUNT(tp.id) FILTER (WHERE tp.status='missed')  AS missed,
           COUNT(tp.id) FILTER (WHERE tp.status='absent')  AS absent
         FROM transport_routes r
         LEFT JOIN users u ON u.id = r.driver_user_id AND u.tenant_id = $3
         LEFT JOIN student_transport st ON st.route_id = r.id AND st.is_active = TRUE AND st.tenant_id = $3
         LEFT JOIN transport_pickups tp
           ON tp.route_id = r.id AND tp.trip_date = $1 AND tp.trip_type = $2 AND tp.tenant_id = $3
         WHERE r.tenant_id = $3 AND r.is_active = TRUE
         GROUP BY r.id, r.route_name, r.vehicle_registration, u.first_name, u.last_name
         ORDER BY r.route_name`,
        [d, trip_type, tid]
      );
    } catch (e) {
      // Fallback when driver_user_id or transport_pickups don't exist yet
      rows = await query(
        `SELECT r.id AS route_id, r.route_name, r.vehicle_registration,
                NULL AS driver_name, NULL AS driver_phone,
                COUNT(st.id) AS total_students, 0 AS picked, 0 AS dropped, 0 AS missed, 0 AS absent
         FROM transport_routes r
         LEFT JOIN student_transport st ON st.route_id = r.id AND st.is_active = TRUE AND st.tenant_id = $1
         WHERE r.tenant_id = $1 AND r.is_active = TRUE
         GROUP BY r.id, r.route_name, r.vehicle_registration
         ORDER BY r.route_name`,
        [tid]
      );
    }
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Parent: see own child's pickup status ─────────────────────────────────
router.get('/my-child-status', async (req, res) => {
  try {
    if (!['parent', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const tid = req.tenantId;
    const { date } = req.query;
    const d = date || new Date().toISOString().split('T')[0];

    // For parents: get their children's pickup status
    let studentIds = [];
    if (req.user.role === 'parent') {
      const children = await query(
        `SELECT s.id FROM students s
         JOIN parent_students ps ON ps.student_id = s.id AND ps.tenant_id = $2
         JOIN parents p ON p.id = ps.parent_id AND p.tenant_id = $2
         WHERE p.user_id = $1 AND s.tenant_id = $2`,
        [req.user.id, tid]
      );
      studentIds = children.map(c => c.id);
    } else if (req.query.student_id) {
      studentIds = [req.query.student_id];
    }

    if (!studentIds.length) return res.json({ success: true, data: [] });

    const rows = await query(
      `SELECT
         s.id AS student_id, s.first_name, s.last_name, s.admission_number,
         r.route_name, r.vehicle_registration,
         u.first_name||' '||u.last_name AS driver_name,
         st.pickup_stop, st.dropoff_stop,
         COALESCE(tp_m.status,'pending') AS morning_status,
         tp_m.pickup_time AS morning_pickup_time,
         tp_m.latitude AS morning_lat, tp_m.longitude AS morning_lng,
         COALESCE(tp_a.status,'pending') AS afternoon_status,
         tp_a.pickup_time AS afternoon_time,
         tp_a.latitude AS afternoon_lat, tp_a.longitude AS afternoon_lng
       FROM students s
       JOIN student_transport st ON st.student_id = s.id AND st.is_active = TRUE AND st.tenant_id = $2
       JOIN transport_routes r ON r.id = st.route_id AND r.tenant_id = $2
       LEFT JOIN users u ON u.id = r.driver_user_id AND u.tenant_id = $2
       LEFT JOIN transport_pickups tp_m
         ON tp_m.student_id = s.id AND tp_m.route_id = r.id
         AND tp_m.trip_date = $3 AND tp_m.trip_type = 'morning' AND tp_m.tenant_id = $2
       LEFT JOIN transport_pickups tp_a
         ON tp_a.student_id = s.id AND tp_a.route_id = r.id
         AND tp_a.trip_date = $3 AND tp_a.trip_type = 'afternoon' AND tp_a.tenant_id = $2
       WHERE s.id = ANY($1::uuid[]) AND s.tenant_id = $2`,
      [studentIds, tid, d]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
