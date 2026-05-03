import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

// Helper: sync fee_structure for a transport route
async function syncTransportFeeStructure(route, tid) {
  const { id, route_name, term_fee, is_active } = route;
  const existing = await query(
    'SELECT id FROM fee_structure WHERE route_id=$1 AND tenant_id=$2 AND is_transport_fee=TRUE',
    [id, tid]
  );
  const active = is_active !== false;
  if (existing.length) {
    await query(
      `UPDATE fee_structure SET name=$1, amount=$2, is_active=$3, updated_at=NOW()
       WHERE id=$4 AND tenant_id=$5`,
      [`${route_name} - Transport Fee`, Number(term_fee) || 0, active, existing[0].id, tid]
    );
  } else if (Number(term_fee) > 0) {
    await query(
      `INSERT INTO fee_structure (id, name, amount, frequency, is_transport_fee, route_id,
        tenant_id, is_mandatory, student_type, academic_year, due_day)
       VALUES ($1,$2,$3,'one_time',TRUE,$4,$5,FALSE,'all',$6,15)`,
      [uuidv4(), `${route_name} - Transport Fee`, Number(term_fee), id, tid,
       new Date().getFullYear().toString()]
    );
  }
}

const router = express.Router();

// GET /api/v1/transport/routes
router.get('/routes', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    let rows;
    try {
      // Full query — requires driver_user_id column (migration 048)
      rows = await query(
        `SELECT r.*,
                COALESCE(sc.student_count, 0) AS student_count,
                u.first_name||' '||u.last_name AS driver_user_name,
                u.phone AS driver_user_phone
         FROM transport_routes r
         LEFT JOIN (
           SELECT route_id, COUNT(id) AS student_count
           FROM student_transport WHERE is_active = TRUE GROUP BY route_id
         ) sc ON sc.route_id = r.id
         LEFT JOIN users u ON u.id = r.driver_user_id AND u.tenant_id = $1
         WHERE r.tenant_id = $1
         ORDER BY r.route_name`,
        [tid]
      );
    } catch {
      // Fallback: driver_user_id column not yet added — return routes without driver info
      rows = await query(
        `SELECT r.*,
                COALESCE(sc.student_count, 0) AS student_count,
                NULL::text AS driver_user_name,
                NULL::text AS driver_user_phone
         FROM transport_routes r
         LEFT JOIN (
           SELECT route_id, COUNT(id) AS student_count
           FROM student_transport WHERE is_active = TRUE GROUP BY route_id
         ) sc ON sc.route_id = r.id
         WHERE r.tenant_id = $1
         ORDER BY r.route_name`,
        [tid]
      );
    }
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get transport routes error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/transport/routes/:id
router.get('/routes/:id', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT r.*, u.first_name||' '||u.last_name AS driver_user_name, u.phone AS driver_user_phone
       FROM transport_routes r
       LEFT JOIN users u ON u.id = r.driver_user_id AND u.tenant_id = $2
       WHERE r.id=$1 AND r.tenant_id=$2`,
      [req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Route not found' });
    // Get students on this route
    const students = await query(
      `SELECT st.*, s.first_name||' '||s.last_name as student_name,
       s.admission_number, c.name as class_name
       FROM student_transport st
       JOIN students s ON s.id = st.student_id AND s.tenant_id=$2
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE st.route_id=$1 AND st.is_active=TRUE AND st.tenant_id=$2 ORDER BY s.first_name`,
      [req.params.id, tid]
    );
    res.json({ success: true, data: { ...rows[0], students } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/transport/routes
router.post('/routes', authenticate, async (req, res) => {
  try {
    const {
      route_name, route_code, description, vehicle_registration, vehicle_capacity,
      vehicle_type, driver_user_id,
      driver_name, driver_phone, driver_license, conductor_name, conductor_phone,
      morning_pickup_time, afternoon_dropoff_time, stops, monthly_fee, term_fee,
      fare_per_km, distance_km
    } = req.body;
    const tid = req.user.tenant_id;
    const rows = await query(
      `INSERT INTO transport_routes
       (route_name, route_code, description, vehicle_registration, vehicle_capacity,
        vehicle_type, driver_user_id,
        driver_name, driver_phone, driver_license, conductor_name, conductor_phone,
        morning_pickup_time, afternoon_dropoff_time, stops, monthly_fee, term_fee,
        fare_per_km, distance_km, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [route_name, route_code, description, vehicle_registration, vehicle_capacity || 30,
       vehicle_type || 'bus', driver_user_id || null,
       driver_name, driver_phone, driver_license, conductor_name, conductor_phone,
       morning_pickup_time, afternoon_dropoff_time,
       JSON.stringify(stops || []), monthly_fee || 0, term_fee || 0,
       fare_per_km || 0, distance_km || 0, tid]
    );
    await syncTransportFeeStructure(rows[0], tid);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create transport route error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/transport/routes/:id
router.put('/routes/:id', authenticate, async (req, res) => {
  try {
    const {
      route_name, route_code, description, vehicle_registration, vehicle_capacity,
      vehicle_type, driver_user_id,
      driver_name, driver_phone, driver_license, conductor_name, conductor_phone,
      morning_pickup_time, afternoon_dropoff_time, stops, monthly_fee, term_fee, is_active,
      fare_per_km, distance_km
    } = req.body;
    const tid = req.user.tenant_id;
    const rows = await query(
      `UPDATE transport_routes SET
       route_name=COALESCE($1,route_name), route_code=COALESCE($2,route_code),
       description=COALESCE($3,description), vehicle_registration=COALESCE($4,vehicle_registration),
       vehicle_capacity=COALESCE($5,vehicle_capacity),
       vehicle_type=COALESCE($6,vehicle_type),
       driver_user_id=$7,
       driver_name=COALESCE($8,driver_name),
       driver_phone=COALESCE($9,driver_phone), driver_license=COALESCE($10,driver_license),
       conductor_name=COALESCE($11,conductor_name), conductor_phone=COALESCE($12,conductor_phone),
       morning_pickup_time=COALESCE($13,morning_pickup_time),
       afternoon_dropoff_time=COALESCE($14,afternoon_dropoff_time),
       stops=COALESCE($15,stops), monthly_fee=COALESCE($16,monthly_fee),
       term_fee=COALESCE($17,term_fee), is_active=COALESCE($18,is_active),
       fare_per_km=COALESCE($19,fare_per_km), distance_km=COALESCE($20,distance_km),
       updated_at=NOW()
       WHERE id=$21 AND tenant_id=$22 RETURNING *`,
      [route_name, route_code, description, vehicle_registration, vehicle_capacity,
       vehicle_type || null,
       driver_user_id !== undefined ? (driver_user_id || null) : null,
       driver_name, driver_phone, driver_license, conductor_name, conductor_phone,
       morning_pickup_time, afternoon_dropoff_time,
       stops ? JSON.stringify(stops) : null,
       monthly_fee, term_fee, is_active,
       fare_per_km, distance_km, req.params.id, tid]
    );
    if (rows.length) await syncTransportFeeStructure(rows[0], tid);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/transport/routes/:id
router.delete('/routes/:id', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    // Remove linked fee_structure first (route_id FK would block delete otherwise)
    await query(
      'DELETE FROM fee_structure WHERE route_id=$1 AND tenant_id=$2 AND is_transport_fee=TRUE',
      [req.params.id, tid]
    );
    await query('DELETE FROM transport_routes WHERE id=$1 AND tenant_id=$2', [req.params.id, tid]);
    res.json({ success: true, message: 'Route deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/transport/students/report — full transport student list with payment status (PDF export)
router.get('/students/report', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { route_id } = req.query;
    let sql = `
      SELECT
        st.id,
        s.first_name || ' ' || s.last_name AS student_name,
        s.admission_number,
        c.name AS class_name,
        r.route_name,
        r.route_code,
        r.term_fee,
        r.monthly_fee,
        st.pickup_stop,
        st.dropoff_stop,
        COALESCE(fi.status, 'no_invoice') AS payment_status,
        COALESCE(fi.paid_amount::numeric, 0) AS paid_amount,
        COALESCE(fi.balance_amount::numeric, r.term_fee) AS balance_amount
      FROM student_transport st
      JOIN students s ON s.id = st.student_id AND s.tenant_id = $1
      LEFT JOIN classes c ON c.id = s.class_id AND c.tenant_id = $1
      JOIN transport_routes r ON r.id = st.route_id AND r.tenant_id = $1
      LEFT JOIN LATERAL (
        SELECT fi.status, fi.paid_amount, fi.balance_amount
        FROM fee_invoices fi
        JOIN fee_structure fs ON fs.id = fi.fee_structure_id
        WHERE fi.student_id = st.student_id
          AND fs.route_id = r.id
          AND fs.is_transport_fee = TRUE
          AND fi.tenant_id = $1
        ORDER BY fi.created_at DESC LIMIT 1
      ) fi ON TRUE
      WHERE st.tenant_id = $1 AND st.is_active = TRUE`;
    const params = [tid];
    if (route_id) { sql += ` AND st.route_id = $2`; params.push(route_id); }
    sql += ' ORDER BY r.route_name, s.first_name';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Transport report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/transport/students — all student transport assignments
router.get('/students', authenticate, async (req, res) => {
  try {
    const { route_id, class_id, student_id } = req.query;
    const tid = req.user.tenant_id;
    let sql = `SELECT st.*, s.first_name||' '||s.last_name as student_name,
               s.admission_number, c.name as class_name, r.route_name, r.term_fee
               FROM student_transport st
               JOIN students s ON s.id = st.student_id AND s.tenant_id = $1
               LEFT JOIN classes c ON c.id = s.class_id AND c.tenant_id = $1
               JOIN transport_routes r ON r.id = st.route_id AND r.tenant_id = $1
               WHERE st.tenant_id=$1 AND st.is_active=TRUE`;
    const params = [tid];
    if (route_id) { sql += ` AND st.route_id=$${params.length+1}`; params.push(route_id); }
    if (class_id) { sql += ` AND s.class_id=$${params.length+1}`; params.push(class_id); }
    if (student_id) { sql += ` AND st.student_id=$${params.length+1}`; params.push(student_id); }
    sql += ' ORDER BY s.first_name';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/transport/students — assign student to route
router.post('/students', authenticate, async (req, res) => {
  try {
    const { student_id, route_id, pickup_stop, dropoff_stop } = req.body;
    const tid = req.user.tenant_id;
    const rows = await query(
      `INSERT INTO student_transport (student_id, route_id, pickup_stop, dropoff_stop, tenant_id)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (student_id, route_id) DO UPDATE SET pickup_stop=$3, dropoff_stop=$4, is_active=TRUE
       RETURNING *`,
      [student_id, route_id, pickup_stop, dropoff_stop, tid]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Assign transport error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/transport/students/bulk — bulk assign students to a route
router.post('/students/bulk', authenticate, async (req, res) => {
  try {
    const { route_id, student_ids, pickup_stop, dropoff_stop } = req.body;
    if (!route_id || !Array.isArray(student_ids) || !student_ids.length) {
      return res.status(400).json({ success: false, message: 'route_id and student_ids[] required' });
    }
    const tid = req.user.tenant_id;
    const inserted = [];
    for (const student_id of student_ids) {
      const rows = await query(
        `INSERT INTO student_transport (student_id, route_id, pickup_stop, dropoff_stop, tenant_id)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (student_id, route_id) DO UPDATE SET pickup_stop=$3, dropoff_stop=$4, is_active=TRUE
         RETURNING *`,
        [student_id, route_id, pickup_stop || null, dropoff_stop || null, tid]
      );
      inserted.push(rows[0]);
    }
    res.status(201).json({ success: true, data: inserted, count: inserted.length });
  } catch (err) {
    logger.error('Bulk assign transport error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/transport/students/:id — unassign student
router.delete('/students/:id', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    await query('UPDATE student_transport SET is_active=FALSE WHERE id=$1 AND tenant_id=$2', [req.params.id, tid]);
    res.json({ success: true, message: 'Student removed from route' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
