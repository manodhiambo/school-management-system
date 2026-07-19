import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);
router.use(requireModule('hostel'));

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
    const { name, gender, hostel_type, capacity, warden_id, deputy_warden_id, prefect_student_id } = req.body;
    const type = hostel_type || gender;
    if (!name || !type || !capacity) {
      return res.status(400).json({ success: false, message: 'name, hostel_type and capacity are required' });
    }
    const rows = await query(
      `INSERT INTO hostels (tenant_id, name, hostel_type, capacity, warden_id, deputy_warden_id, prefect_student_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [tid, name, type, capacity, warden_id || null, deputy_warden_id || null, prefect_student_id || null]
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
    const { name, gender, hostel_type, capacity, warden_id, deputy_warden_id, prefect_student_id } = req.body;
    const type = hostel_type || gender || null;
    const rows = await query(
      `UPDATE hostels SET
         name = COALESCE($1, name),
         hostel_type = COALESCE($2, hostel_type),
         capacity = COALESCE($3, capacity),
         warden_id = COALESCE($4, warden_id),
         deputy_warden_id = COALESCE($5, deputy_warden_id),
         prefect_student_id = COALESCE($6, prefect_student_id)
       WHERE id = $7 AND tenant_id = $8 RETURNING *`,
      [name, type, capacity, warden_id, deputy_warden_id, prefect_student_id, req.params.id, tid]
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

// POST /allocations/:id/transfer — move a student to a different room/bed,
// closing the old allocation and opening a new one so history is preserved
router.post('/allocations/:id/transfer', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { room_id, bed_number, notes } = req.body;
    if (!room_id) return res.status(400).json({ success: false, message: 'room_id is required' });

    const current = await query(
      `SELECT * FROM hostel_allocations WHERE id = $1 AND tenant_id = $2 AND is_active = TRUE`,
      [req.params.id, tid]
    );
    if (!current.length) return res.status(404).json({ success: false, message: 'Active allocation not found' });

    const roomRows = await query(
      `SELECT r.capacity, COUNT(a.id) AS current_occupancy
       FROM hostel_rooms r
       LEFT JOIN hostel_allocations a ON a.room_id = r.id AND a.is_active = TRUE AND a.tenant_id = r.tenant_id
       WHERE r.id = $1 AND r.tenant_id = $2
       GROUP BY r.id`,
      [room_id, tid]
    );
    if (!roomRows.length) return res.status(404).json({ success: false, message: 'Destination room not found' });
    if (parseInt(roomRows[0].current_occupancy) >= parseInt(roomRows[0].capacity)) {
      return res.status(400).json({ success: false, message: 'Destination room is at full capacity' });
    }

    await query(
      `UPDATE hostel_allocations SET is_active = FALSE, check_out = NOW() WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    const rows = await query(
      `INSERT INTO hostel_allocations (tenant_id, room_id, student_id, bed_number, check_in, is_active, notes)
       VALUES ($1, $2, $3, $4, NOW(), TRUE, $5) RETURNING *`,
      [tid, room_id, current[0].student_id, bed_number || null, notes || `Transferred from room ${current[0].room_id}`]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Transfer allocation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── WAITING LIST ─────────────────────────────────────────────────────────────

// GET /waiting-list
router.get('/waiting-list', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status } = req.query;
    let sql = `SELECT w.*, s.first_name || ' ' || s.last_name AS student_name, s.admission_number,
                      h.name AS hostel_name
               FROM hostel_waiting_list w
               JOIN students s ON s.id = w.student_id
               LEFT JOIN hostels h ON h.id = w.hostel_id
               WHERE w.tenant_id = $1`;
    const params = [tid];
    if (status) { sql += ` AND w.status = $${params.length + 1}`; params.push(status); }
    else { sql += ` AND w.status = 'pending'`; }
    sql += ' ORDER BY w.priority DESC, w.requested_at ASC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get waiting list error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /waiting-list
router.post('/waiting-list', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { student_id, hostel_id, priority, notes } = req.body;
    if (!student_id) return res.status(400).json({ success: false, message: 'student_id is required' });
    const rows = await query(
      `INSERT INTO hostel_waiting_list (tenant_id, student_id, hostel_id, priority, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tid, student_id, hostel_id || null, priority || 0, notes || null, req.user.id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create waiting list entry error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /waiting-list/:id — update status (e.g. cancel, or mark allocated once housed)
router.put('/waiting-list/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { status } = req.body;
    const rows = await query(
      `UPDATE hostel_waiting_list SET status = COALESCE($1, status) WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [status, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Waiting list entry not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update waiting list entry error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── VACANT BEDS ──────────────────────────────────────────────────────────────

// GET /vacant-beds — per-room list of remaining bed capacity
router.get('/vacant-beds', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { hostel_id } = req.query;
    let sql = `SELECT r.id AS room_id, r.room_number, r.room_type, r.floor,
                      h.id AS hostel_id, h.name AS hostel_name, h.hostel_type,
                      r.capacity,
                      COUNT(a.id) FILTER (WHERE a.is_active = TRUE) AS occupied,
                      GREATEST(r.capacity - COUNT(a.id) FILTER (WHERE a.is_active = TRUE), 0) AS vacant
               FROM hostel_rooms r
               JOIN hostels h ON h.id = r.hostel_id
               LEFT JOIN hostel_allocations a ON a.room_id = r.id AND a.tenant_id = r.tenant_id
               WHERE r.tenant_id = $1 AND r.is_active = TRUE`;
    const params = [tid];
    if (hostel_id) { sql += ` AND h.id = $${params.length + 1}`; params.push(hostel_id); }
    sql += ` GROUP BY r.id, h.id HAVING r.capacity - COUNT(a.id) FILTER (WHERE a.is_active = TRUE) > 0
             ORDER BY h.name, r.room_number`;
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get vacant beds error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ROLL CALL & ATTENDANCE ───────────────────────────────────────────────────

// GET /roll-calls — list roll call sessions
router.get('/roll-calls', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { hostel_id, date } = req.query;
    let sql = `SELECT rc.*, h.name AS hostel_name,
                      u.first_name || ' ' || u.last_name AS taken_by_name,
                      COUNT(e.id) AS entries_count,
                      COUNT(e.id) FILTER (WHERE e.status = 'present') AS present_count,
                      COUNT(e.id) FILTER (WHERE e.status = 'absent') AS absent_count,
                      COUNT(e.id) FILTER (WHERE e.status = 'late') AS late_count
               FROM hostel_roll_calls rc
               JOIN hostels h ON h.id = rc.hostel_id
               LEFT JOIN users u ON u.id = rc.taken_by
               LEFT JOIN hostel_roll_call_entries e ON e.roll_call_id = rc.id
               WHERE rc.tenant_id = $1`;
    const params = [tid];
    if (hostel_id) { sql += ` AND rc.hostel_id = $${params.length + 1}`; params.push(hostel_id); }
    if (date) { sql += ` AND rc.roll_call_date = $${params.length + 1}`; params.push(date); }
    sql += ' GROUP BY rc.id, h.name, u.first_name, u.last_name ORDER BY rc.roll_call_date DESC, rc.session';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get roll calls error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /roll-calls — start a roll call session, pre-populated with everyone
// currently allocated to the hostel (defaulting to present)
router.post('/roll-calls', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { hostel_id, roll_call_date, session } = req.body;
    if (!hostel_id || !session) {
      return res.status(400).json({ success: false, message: 'hostel_id and session are required' });
    }
    const rcRows = await query(
      `INSERT INTO hostel_roll_calls (tenant_id, hostel_id, roll_call_date, taken_by, session)
       VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5)
       ON CONFLICT (hostel_id, roll_call_date, session) DO UPDATE SET taken_by = EXCLUDED.taken_by
       RETURNING *`,
      [tid, hostel_id, roll_call_date || null, req.user.id, session]
    );
    const rollCall = rcRows[0];

    const students = await query(
      `SELECT a.student_id
       FROM hostel_allocations a
       JOIN hostel_rooms r ON r.id = a.room_id
       WHERE r.hostel_id = $1 AND a.tenant_id = $2 AND a.is_active = TRUE`,
      [hostel_id, tid]
    );
    for (const s of students) {
      await query(
        `INSERT INTO hostel_roll_call_entries (roll_call_id, student_id, status)
         VALUES ($1, $2, 'present') ON CONFLICT (roll_call_id, student_id) DO NOTHING`,
        [rollCall.id, s.student_id]
      );
    }
    const entries = await query(
      `SELECT e.*, s.first_name || ' ' || s.last_name AS student_name, s.admission_number
       FROM hostel_roll_call_entries e JOIN students s ON s.id = e.student_id
       WHERE e.roll_call_id = $1 ORDER BY s.first_name`,
      [rollCall.id]
    );
    res.status(201).json({ success: true, data: { ...rollCall, entries } });
  } catch (err) {
    logger.error('Create roll call error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /roll-calls/:id — session with entries
router.get('/roll-calls/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rcRows = await query(
      `SELECT rc.*, h.name AS hostel_name FROM hostel_roll_calls rc
       JOIN hostels h ON h.id = rc.hostel_id WHERE rc.id = $1 AND rc.tenant_id = $2`,
      [req.params.id, tid]
    );
    if (!rcRows.length) return res.status(404).json({ success: false, message: 'Roll call not found' });
    const entries = await query(
      `SELECT e.*, s.first_name || ' ' || s.last_name AS student_name, s.admission_number
       FROM hostel_roll_call_entries e JOIN students s ON s.id = e.student_id
       WHERE e.roll_call_id = $1 ORDER BY s.first_name`,
      [req.params.id]
    );
    res.json({ success: true, data: { ...rcRows[0], entries } });
  } catch (err) {
    logger.error('Get roll call error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /roll-calls/:id/entries/:studentId — mark a single student's status
router.put('/roll-calls/:id/entries/:studentId', async (req, res) => {
  try {
    const { status, remarks } = req.body;
    if (!['present', 'absent', 'late'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be present, absent, or late' });
    }
    const rows = await query(
      `UPDATE hostel_roll_call_entries SET status = $1, remarks = $2
       WHERE roll_call_id = $3 AND student_id = $4 RETURNING *`,
      [status, remarks || null, req.params.id, req.params.studentId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update roll call entry error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /roll-calls/missing/today — students marked absent in today's most recent session
router.get('/roll-calls/missing/today', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT rc.hostel_id, h.name AS hostel_name, rc.session, rc.roll_call_date,
              s.id AS student_id, s.first_name || ' ' || s.last_name AS student_name, s.admission_number,
              e.status, e.remarks
       FROM hostel_roll_call_entries e
       JOIN hostel_roll_calls rc ON rc.id = e.roll_call_id
       JOIN hostels h ON h.id = rc.hostel_id
       JOIN students s ON s.id = e.student_id
       WHERE rc.tenant_id = $1 AND rc.roll_call_date = CURRENT_DATE AND e.status = 'absent'
       ORDER BY h.name, s.first_name`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get missing students error:', err);
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

// POST /movements — log departure/exeat (leave/outpass request)
router.post('/movements', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { student_id, movement_type, departure_at, expected_return_at, reason, guardian_name, guardian_phone } = req.body;
    if (!student_id || !movement_type || !departure_at) {
      return res.status(400).json({ success: false, message: 'student_id, movement_type and departure_at are required' });
    }
    const rows = await query(
      `INSERT INTO hostel_movements
         (tenant_id, student_id, movement_type, departure_at, expected_return_at, reason, guardian_name, guardian_phone, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING *`,
      [tid, student_id, movement_type, departure_at, expected_return_at || null, reason || null, guardian_name || null, guardian_phone || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create movement error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Two-stage approval: a leave/outpass only becomes 'approved' once both the
// parent AND the boarding master (admin) have signed off. Either can go first.
async function maybeFinalizeApproval(id, tid) {
  const rows = await query(
    `UPDATE hostel_movements SET status = 'approved'
     WHERE id = $1 AND tenant_id = $2 AND status = 'pending'
       AND parent_approved_at IS NOT NULL AND approved_by IS NOT NULL
     RETURNING *`,
    [id, tid]
  );
  return rows[0] || null;
}

// PUT /movements/:id/parent-approve — parent signs off on the leave request
router.put('/movements/:id/parent-approve', requireRole(['admin', 'superadmin', 'parent']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { approved_by_name } = req.body;
    const rows = await query(
      `UPDATE hostel_movements SET parent_approved_at = NOW(), parent_approved_by = $1
       WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [approved_by_name || `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Parent', req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Movement not found' });
    const finalized = await maybeFinalizeApproval(req.params.id, tid);
    res.json({ success: true, data: finalized || rows[0] });
  } catch (err) {
    logger.error('Parent-approve movement error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /movements/:id/approve — boarding master (admin) signs off
router.put('/movements/:id/approve', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const rows = await query(
      `UPDATE hostel_movements SET approved_by = $1
       WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [req.user.id, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Movement not found' });
    const finalized = await maybeFinalizeApproval(req.params.id, tid);
    res.json({ success: true, data: finalized || rows[0] });
  } catch (err) {
    logger.error('Approve movement error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /movements/:id/gate-verify-out — security confirms the student physically left
router.put('/movements/:id/gate-verify-out', requireRole(['admin', 'superadmin', 'security']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `UPDATE hostel_movements SET gate_verified_out_at = NOW(), gate_verified_by = $1
       WHERE id = $2 AND tenant_id = $3 AND status = 'approved' RETURNING *`,
      [req.user.id, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Movement not found or not yet approved' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Gate-verify-out movement error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /movements/:id/gate-verify-in — security confirms the student physically returned
router.put('/movements/:id/gate-verify-in', requireRole(['admin', 'superadmin', 'security']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `UPDATE hostel_movements SET gate_verified_in_at = NOW(), gate_verified_by = $1
       WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [req.user.id, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Movement not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Gate-verify-in movement error:', err);
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
             m.return_at IS NULL
             AND m.status = 'approved'
             AND (
               (m.expected_return_at IS NOT NULL AND m.expected_return_at < NOW())
               OR (m.expected_return_at IS NULL AND m.departure_at < NOW() - INTERVAL '24 hours')
             )
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

// ─── LAUNDRY MANAGEMENT ───────────────────────────────────────────────────────

// GET /laundry
router.get('/laundry', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { student_id, status } = req.query;
    let sql = `SELECT l.*, s.first_name || ' ' || s.last_name AS student_name, s.admission_number,
                      r.room_number
               FROM hostel_laundry_batches l
               JOIN students s ON s.id = l.student_id
               LEFT JOIN hostel_rooms r ON r.id = l.room_id
               WHERE l.tenant_id = $1`;
    const params = [tid];
    if (student_id) { sql += ` AND l.student_id = $${params.length + 1}`; params.push(student_id); }
    if (status) { sql += ` AND l.status = $${params.length + 1}`; params.push(status); }
    sql += ' ORDER BY l.collected_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get laundry batches error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /laundry — log a collection
router.post('/laundry', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { student_id, room_id, items_count, expected_delivery, charge_amount, notes } = req.body;
    if (!student_id) return res.status(400).json({ success: false, message: 'student_id is required' });
    const rows = await query(
      `INSERT INTO hostel_laundry_batches
         (tenant_id, student_id, room_id, items_count, expected_delivery, charge_amount, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [tid, student_id, room_id || null, items_count || 0, expected_delivery || null, charge_amount || 0, notes || null, req.user.id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create laundry batch error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /laundry/:id — update status (washing/ready/delivered/missing) or log missing items
router.put('/laundry/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status, missing_items, delivered_at } = req.body;
    const rows = await query(
      `UPDATE hostel_laundry_batches SET
         status = COALESCE($1, status),
         missing_items = COALESCE($2, missing_items),
         delivered_at = CASE WHEN $1 = 'delivered' THEN COALESCE($3, NOW()) ELSE delivered_at END
       WHERE id = $4 AND tenant_id = $5 RETURNING *`,
      [status || null, missing_items || null, delivered_at || null, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Laundry batch not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update laundry batch error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DORMITORY INSPECTIONS ────────────────────────────────────────────────────

// GET /inspections
router.get('/inspections', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { room_id, from_date, to_date } = req.query;
    let sql = `SELECT i.*, r.room_number, h.name AS hostel_name,
                      u.first_name || ' ' || u.last_name AS inspected_by_name
               FROM hostel_inspections i
               JOIN hostel_rooms r ON r.id = i.room_id
               JOIN hostels h ON h.id = r.hostel_id
               LEFT JOIN users u ON u.id = i.inspected_by
               WHERE i.tenant_id = $1`;
    const params = [tid];
    if (room_id) { sql += ` AND i.room_id = $${params.length + 1}`; params.push(room_id); }
    if (from_date) { sql += ` AND i.inspection_date >= $${params.length + 1}`; params.push(from_date); }
    if (to_date) { sql += ` AND i.inspection_date <= $${params.length + 1}`; params.push(to_date); }
    sql += ' ORDER BY i.inspection_date DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get inspections error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /inspections — log a scheduled inspection
router.post('/inspections', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { room_id, inspection_date, cleanliness_score, damages, student_remarks, photo_urls } = req.body;
    if (!room_id) return res.status(400).json({ success: false, message: 'room_id is required' });
    const rows = await query(
      `INSERT INTO hostel_inspections
         (tenant_id, room_id, inspected_by, inspection_date, cleanliness_score, damages, student_remarks, photo_urls)
       VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, $6, $7, $8) RETURNING *`,
      [tid, room_id, req.user.id, inspection_date || null, cleanliness_score || null,
       damages || null, student_remarks || null, JSON.stringify(photo_urls || [])]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create inspection error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
