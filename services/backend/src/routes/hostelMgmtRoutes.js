import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// Ensure hostel tables exist
(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS hostels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        hostel_type VARCHAR(10) CHECK (hostel_type IN ('boys','girls','mixed')),
        capacity INTEGER DEFAULT 50,
        warden_id UUID REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`, []);
    await query(`
      CREATE TABLE IF NOT EXISTS hostel_rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
        room_number VARCHAR(20) NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 4,
        room_type VARCHAR(20) DEFAULT 'dormitory',
        floor INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`, []);
    await query(`
      CREATE TABLE IF NOT EXISTS hostel_allocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        room_id UUID REFERENCES hostel_rooms(id) ON DELETE CASCADE,
        student_id UUID REFERENCES students(id) ON DELETE CASCADE,
        bed_number VARCHAR(10),
        check_in TIMESTAMPTZ DEFAULT NOW(),
        check_out TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`, []);
    await query(`
      CREATE TABLE IF NOT EXISTS hostel_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        student_id UUID REFERENCES students(id) ON DELETE CASCADE,
        movement_type VARCHAR(30),
        departure_at TIMESTAMPTZ,
        return_at TIMESTAMPTZ,
        reason TEXT,
        guardian_name VARCHAR(100),
        guardian_phone VARCHAR(20),
        status VARCHAR(20) DEFAULT 'pending',
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`, []);
  } catch (err) {
    logger.warn('Hostel tables setup warning:', err.message);
  }
})();

// ─── HOSTELS ──────────────────────────────────────────────────────────────────

// GET /hostels — list hostels with room/occupancy counts
router.get('/hostels', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT h.*,
              u.first_name || ' ' || u.last_name AS warden_name,
              COUNT(DISTINCT r.id) AS room_count,
              COUNT(DISTINCT r.id) FILTER (WHERE r.is_active = TRUE) AS active_rooms,
              COALESCE(SUM(r.capacity) FILTER (WHERE r.is_active = TRUE), 0) AS total_room_capacity,
              COUNT(DISTINCT a.id) FILTER (WHERE a.is_active = TRUE) AS current_occupancy
       FROM hostels h
       LEFT JOIN users u ON u.id = h.warden_id
       LEFT JOIN hostel_rooms r ON r.hostel_id = h.id AND r.tenant_id = h.tenant_id
       LEFT JOIN hostel_allocations a ON a.room_id = r.id AND a.tenant_id = h.tenant_id AND a.is_active = TRUE
       WHERE h.tenant_id = $1
       GROUP BY h.id, u.first_name, u.last_name
       ORDER BY h.name`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get hostels error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /hostels — create hostel
router.post('/hostels', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { name, gender, hostel_type, capacity, warden_id } = req.body;
    const type = hostel_type || gender;
    if (!name || !type || !capacity) {
      return res.status(400).json({ success: false, message: 'name, hostel_type and capacity are required' });
    }
    const rows = await query(
      `INSERT INTO hostels (tenant_id, name, hostel_type, capacity, warden_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tid, name, type, capacity, warden_id || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create hostel error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /hostels/:id — update hostel
router.put('/hostels/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { name, gender, hostel_type, capacity, warden_id } = req.body;
    const type = hostel_type || gender || null;
    const rows = await query(
      `UPDATE hostels SET
         name = COALESCE($1, name),
         hostel_type = COALESCE($2, hostel_type),
         capacity = COALESCE($3, capacity),
         warden_id = COALESCE($4, warden_id)
       WHERE id = $5 AND tenant_id = $6 RETURNING *`,
      [name, type, capacity, warden_id, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Hostel not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update hostel error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ROOMS ────────────────────────────────────────────────────────────────────

// GET /hostels/:hostelId/rooms — list rooms with occupancy count
router.get('/hostels/:hostelId/rooms', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT r.*,
              COUNT(a.id) FILTER (WHERE a.is_active = TRUE) AS current_occupancy
       FROM hostel_rooms r
       LEFT JOIN hostel_allocations a ON a.room_id = r.id AND a.tenant_id = r.tenant_id AND a.is_active = TRUE
       WHERE r.hostel_id = $1 AND r.tenant_id = $2
       GROUP BY r.id
       ORDER BY r.floor, r.room_number`,
      [req.params.hostelId, tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get hostel rooms error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /hostels/:hostelId/rooms — add room
router.post('/hostels/:hostelId/rooms', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { room_number, capacity, room_type, floor } = req.body;
    if (!room_number || !capacity || !room_type) {
      return res.status(400).json({ success: false, message: 'room_number, capacity and room_type are required' });
    }
    const rows = await query(
      `INSERT INTO hostel_rooms (tenant_id, hostel_id, room_number, capacity, room_type, floor, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING *`,
      [tid, req.params.hostelId, room_number, capacity, room_type, floor || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create hostel room error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /rooms/:id — update room
router.put('/rooms/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { room_number, capacity, room_type, floor, is_active } = req.body;
    const rows = await query(
      `UPDATE hostel_rooms SET
         room_number = COALESCE($1, room_number),
         capacity = COALESCE($2, capacity),
         room_type = COALESCE($3, room_type),
         floor = COALESCE($4, floor),
         is_active = COALESCE($5, is_active)
       WHERE id = $6 AND tenant_id = $7 RETURNING *`,
      [room_number, capacity, room_type, floor, is_active, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update hostel room error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ALLOCATIONS ──────────────────────────────────────────────────────────────

// GET /allocations — list current active allocations
router.get('/allocations', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { hostel_id, room_id } = req.query;
    let sql = `SELECT a.*,
                      s.first_name || ' ' || s.last_name AS student_name,
                      s.admission_number,
                      r.room_number, r.room_type, r.floor,
                      h.name AS hostel_name
               FROM hostel_allocations a
               JOIN students s ON s.id = a.student_id
               JOIN hostel_rooms r ON r.id = a.room_id
               JOIN hostels h ON h.id = r.hostel_id
               WHERE a.tenant_id = $1 AND a.is_active = TRUE`;
    const params = [tid];
    if (hostel_id) { sql += ` AND h.id = $${params.length + 1}`; params.push(hostel_id); }
    if (room_id) { sql += ` AND a.room_id = $${params.length + 1}`; params.push(room_id); }
    sql += ' ORDER BY h.name, r.room_number, a.bed_number';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get allocations error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /allocations — allocate student to room
router.post('/allocations', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { room_id, student_id, bed_number, check_in, notes } = req.body;
    if (!room_id || !student_id) {
      return res.status(400).json({ success: false, message: 'room_id and student_id are required' });
    }

    // Check room capacity
    const roomRows = await query(
      `SELECT r.capacity, COUNT(a.id) AS current_occupancy
       FROM hostel_rooms r
       LEFT JOIN hostel_allocations a ON a.room_id = r.id AND a.is_active = TRUE AND a.tenant_id = r.tenant_id
       WHERE r.id = $1 AND r.tenant_id = $2
       GROUP BY r.id`,
      [room_id, tid]
    );
    if (!roomRows.length) return res.status(404).json({ success: false, message: 'Room not found' });
    const room = roomRows[0];
    if (parseInt(room.current_occupancy) >= parseInt(room.capacity)) {
      return res.status(400).json({ success: false, message: 'Room is at full capacity' });
    }

    // Deactivate any existing active allocation for this student
    await query(
      `UPDATE hostel_allocations SET is_active = FALSE, check_out = NOW()
       WHERE student_id = $1 AND tenant_id = $2 AND is_active = TRUE`,
      [student_id, tid]
    );

    const rows = await query(
      `INSERT INTO hostel_allocations (tenant_id, room_id, student_id, bed_number, check_in, is_active, notes)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6) RETURNING *`,
      [tid, room_id, student_id, bed_number || null, check_in || new Date(), notes || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create allocation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /allocations/:id/checkout — check out student
router.put('/allocations/:id/checkout', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { check_out } = req.body;
    const rows = await query(
      `UPDATE hostel_allocations SET is_active = FALSE, check_out = $1
       WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [check_out || new Date(), req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Allocation not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Checkout allocation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── MOVEMENTS ────────────────────────────────────────────────────────────────

// GET /movements
router.get('/movements', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { student_id, status, from_date } = req.query;
    let sql = `SELECT m.*,
                      s.first_name || ' ' || s.last_name AS student_name,
                      s.admission_number,
                      u.first_name || ' ' || u.last_name AS approved_by_name
               FROM hostel_movements m
               JOIN students s ON s.id = m.student_id
               LEFT JOIN users u ON u.id = m.approved_by
               WHERE m.tenant_id = $1`;
    const params = [tid];
    if (student_id) { sql += ` AND m.student_id = $${params.length + 1}`; params.push(student_id); }
    if (status) { sql += ` AND m.status = $${params.length + 1}`; params.push(status); }
    if (from_date) { sql += ` AND m.departure_at >= $${params.length + 1}`; params.push(from_date); }
    sql += ' ORDER BY m.departure_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get movements error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /movements — log departure/exeat
router.post('/movements', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { student_id, movement_type, departure_at, reason, guardian_name, guardian_phone } = req.body;
    if (!student_id || !movement_type || !departure_at) {
      return res.status(400).json({ success: false, message: 'student_id, movement_type and departure_at are required' });
    }
    const rows = await query(
      `INSERT INTO hostel_movements
         (tenant_id, student_id, movement_type, departure_at, reason, guardian_name, guardian_phone, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
      [tid, student_id, movement_type, departure_at, reason || null, guardian_name || null, guardian_phone || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create movement error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /movements/:id/approve — admin approves
router.put('/movements/:id/approve', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const rows = await query(
      `UPDATE hostel_movements SET status = 'approved', approved_by = $1
       WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [req.user.id, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Movement not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Approve movement error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /movements/:id/return — mark student returned
router.put('/movements/:id/return', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `UPDATE hostel_movements SET return_at = NOW(), status = 'returned'
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Movement not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Return movement error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── OCCUPANCY SUMMARY ────────────────────────────────────────────────────────

// GET /occupancy — per-hostel summary
router.get('/occupancy', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT h.id, h.name,
              h.hostel_type AS gender,
              h.capacity AS hostel_capacity,
              COALESCE(SUM(r.capacity) FILTER (WHERE r.is_active = TRUE), 0) AS room_capacity,
              COUNT(DISTINCT a.id) FILTER (WHERE a.is_active = TRUE) AS current_occupancy,
              GREATEST(
                COALESCE(SUM(r.capacity) FILTER (WHERE r.is_active = TRUE), 0)::int -
                COUNT(DISTINCT a.id) FILTER (WHERE a.is_active = TRUE)::int,
                0
              ) AS available_beds
       FROM hostels h
       LEFT JOIN hostel_rooms r ON r.hostel_id = h.id AND r.tenant_id = h.tenant_id
       LEFT JOIN hostel_allocations a ON a.room_id = r.id AND a.tenant_id = h.tenant_id AND a.is_active = TRUE
       WHERE h.tenant_id = $1
       GROUP BY h.id, h.name, h.hostel_type, h.capacity
       ORDER BY h.name`,
      [tid]
    );
    const totals = rows.reduce(
      (acc, r) => {
        acc.total_capacity += parseInt(r.room_capacity) || 0;
        acc.total_occupancy += parseInt(r.current_occupancy) || 0;
        acc.total_available += parseInt(r.available_beds) || 0;
        return acc;
      },
      { total_capacity: 0, total_occupancy: 0, total_available: 0 }
    );
    res.json({ success: true, data: { hostels: rows, totals } });
  } catch (err) {
    logger.error('Get occupancy error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /overdue — overdue movements
router.get('/overdue', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT m.*,
              s.first_name || ' ' || s.last_name AS student_name,
              s.admission_number
       FROM hostel_movements m
       JOIN students s ON s.id = m.student_id
       WHERE m.tenant_id = $1
         AND (
           m.status = 'overdue'
           OR (
             m.departure_at < NOW() - INTERVAL '24 hours'
             AND m.return_at IS NULL
             AND m.status = 'approved'
           )
         )
       ORDER BY m.departure_at ASC`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get overdue movements error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
