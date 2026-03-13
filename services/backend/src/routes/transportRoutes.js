import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/v1/transport/routes
router.get('/routes', authenticate, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT r.*, COUNT(st.id) as student_count
       FROM transport_routes r
       LEFT JOIN student_transport st ON st.route_id = r.id AND st.is_active=TRUE
       WHERE r.tenant_id=$1 GROUP BY r.id ORDER BY r.route_name`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get transport routes error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/transport/routes/:id
router.get('/routes/:id', authenticate, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM transport_routes WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Route not found' });
    // Get students on this route
    const students = await query(
      `SELECT st.*, s.first_name||' '||s.last_name as student_name,
       s.admission_number, c.name as class_name
       FROM student_transport st
       JOIN students s ON s.id = st.student_id
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE st.route_id=$1 AND st.is_active=TRUE ORDER BY s.first_name`,
      [req.params.id]
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
      driver_name, driver_phone, driver_license, conductor_name, conductor_phone,
      morning_pickup_time, afternoon_dropoff_time, stops, monthly_fee, term_fee
    } = req.body;
    const tid = req.user.tenant_id;
    const rows = await query(
      `INSERT INTO transport_routes
       (route_name, route_code, description, vehicle_registration, vehicle_capacity,
        driver_name, driver_phone, driver_license, conductor_name, conductor_phone,
        morning_pickup_time, afternoon_dropoff_time, stops, monthly_fee, term_fee, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [route_name, route_code, description, vehicle_registration, vehicle_capacity || 30,
       driver_name, driver_phone, driver_license, conductor_name, conductor_phone,
       morning_pickup_time, afternoon_dropoff_time,
       JSON.stringify(stops || []), monthly_fee || 0, term_fee || 0, tid]
    );
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
      driver_name, driver_phone, driver_license, conductor_name, conductor_phone,
      morning_pickup_time, afternoon_dropoff_time, stops, monthly_fee, term_fee, is_active
    } = req.body;
    const rows = await query(
      `UPDATE transport_routes SET
       route_name=COALESCE($1,route_name), route_code=COALESCE($2,route_code),
       description=COALESCE($3,description), vehicle_registration=COALESCE($4,vehicle_registration),
       vehicle_capacity=COALESCE($5,vehicle_capacity), driver_name=COALESCE($6,driver_name),
       driver_phone=COALESCE($7,driver_phone), driver_license=COALESCE($8,driver_license),
       conductor_name=COALESCE($9,conductor_name), conductor_phone=COALESCE($10,conductor_phone),
       morning_pickup_time=COALESCE($11,morning_pickup_time),
       afternoon_dropoff_time=COALESCE($12,afternoon_dropoff_time),
       stops=COALESCE($13,stops), monthly_fee=COALESCE($14,monthly_fee),
       term_fee=COALESCE($15,term_fee), is_active=COALESCE($16,is_active), updated_at=NOW()
       WHERE id=$17 RETURNING *`,
      [route_name, route_code, description, vehicle_registration, vehicle_capacity,
       driver_name, driver_phone, driver_license, conductor_name, conductor_phone,
       morning_pickup_time, afternoon_dropoff_time,
       stops ? JSON.stringify(stops) : null,
       monthly_fee, term_fee, is_active, req.params.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/transport/routes/:id
router.delete('/routes/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM transport_routes WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Route deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/transport/students — all student transport assignments
router.get('/students', authenticate, async (req, res) => {
  try {
    const { route_id, class_id } = req.query;
    const tid = req.user.tenant_id;
    let sql = `SELECT st.*, s.first_name||' '||s.last_name as student_name,
               s.admission_number, c.name as class_name, r.route_name
               FROM student_transport st
               JOIN students s ON s.id = st.student_id
               LEFT JOIN classes c ON c.id = s.class_id
               JOIN transport_routes r ON r.id = st.route_id
               WHERE st.tenant_id=$1 AND st.is_active=TRUE`;
    const params = [tid];
    if (route_id) { sql += ` AND st.route_id=$${params.length+1}`; params.push(route_id); }
    if (class_id) { sql += ` AND s.class_id=$${params.length+1}`; params.push(class_id); }
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

// DELETE /api/v1/transport/students/:id — unassign student
router.delete('/students/:id', authenticate, async (req, res) => {
  try {
    await query('UPDATE student_transport SET is_active=FALSE WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Student removed from route' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
