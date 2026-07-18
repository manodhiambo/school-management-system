import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

const GATE_ROLES = ['admin', 'security'];

// ─────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────
router.get('/dashboard', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const today = new Date().toISOString().split('T')[0];

    const [visitorsIn, pickupWaiting, releasedToday, blockedAttempts, recentVisits, recentPickups] = await Promise.all([
      query(
        `SELECT COUNT(*) AS cnt FROM visitor_visits WHERE tenant_id=$1 AND status='checked_in'`,
        [tenant_id]
      ),
      query(
        `SELECT COUNT(*) AS cnt FROM students
         WHERE tenant_id=$1 AND status='active'
           AND id NOT IN (
             SELECT student_id FROM pickup_transactions
             WHERE tenant_id=$1 AND pickup_time::date=CURRENT_DATE
           )
           AND id IN (
             SELECT id FROM students WHERE tenant_id=$1 AND status='active'
               AND (uses_transport IS NULL OR uses_transport=FALSE)
           )`,
        [tenant_id]
      ),
      query(
        `SELECT COUNT(*) AS cnt FROM pickup_transactions WHERE tenant_id=$1 AND pickup_time::date=CURRENT_DATE`,
        [tenant_id]
      ),
      query(
        `SELECT COUNT(*) AS cnt FROM pickup_transactions WHERE tenant_id=$1 AND pickup_time::date=CURRENT_DATE AND is_authorized=FALSE`,
        [tenant_id]
      ),
      query(
        `SELECT vv.id, v.full_name, vv.purpose, vv.check_in_time, vv.status, vv.gate,
                vv.host_name, v.organization
         FROM visitor_visits vv
         JOIN visitors v ON v.id=vv.visitor_id
         WHERE vv.tenant_id=$1
         ORDER BY vv.check_in_time DESC LIMIT 8`,
        [tenant_id]
      ),
      query(
        `SELECT pt.id, s.first_name||' '||s.last_name AS student_name, s.admission_number,
                pt.pickup_person_name, pt.pickup_person_relationship, pt.pickup_time, pt.is_authorized,
                pt.gate
         FROM pickup_transactions pt
         JOIN students s ON s.id=pt.student_id
         WHERE pt.tenant_id=$1
         ORDER BY pt.pickup_time DESC LIMIT 8`,
        [tenant_id]
      ),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          visitors_inside: parseInt(visitorsIn[0]?.cnt || 0),
          students_awaiting_pickup: parseInt(pickupWaiting[0]?.cnt || 0),
          released_today: parseInt(releasedToday[0]?.cnt || 0),
          blocked_attempts: parseInt(blockedAttempts[0]?.cnt || 0),
        },
        recent_visits: recentVisits,
        recent_pickups: recentPickups,
      },
    });
  } catch (err) {
    logger.error('Gate dashboard error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// VISITORS
// ─────────────────────────────────────────────
router.get('/visitors', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { search, blacklisted, page = 1, limit = 50 } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (safePage - 1) * safeLimit;
    const params = [tenant_id];
    let where = 'WHERE v.tenant_id=$1';
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (v.full_name ILIKE $${params.length} OR v.national_id ILIKE $${params.length} OR v.phone ILIKE $${params.length})`;
    }
    if (blacklisted !== undefined) {
      params.push(blacklisted === 'true');
      where += ` AND v.is_blacklisted=$${params.length}`;
    }
    params.push(safeLimit, offset);
    const rows = await query(
      `SELECT v.*,
              (SELECT COUNT(*) FROM visitor_visits vv WHERE vv.visitor_id=v.id) AS visit_count,
              (SELECT MAX(vv.check_in_time) FROM visitor_visits vv WHERE vv.visitor_id=v.id) AS last_visit
       FROM visitors v ${where}
       ORDER BY v.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get visitors error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/visitors', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id, id: userId } = req.user;
    const {
      full_name, national_id, passport_number, phone, email,
      gender, organization, photo_url, id_copy_url, notes,
    } = req.body;
    if (!full_name || !phone) {
      return res.status(400).json({ success: false, message: 'full_name and phone are required' });
    }

    // Check existing by national_id
    if (national_id) {
      const existing = await query(
        `SELECT id FROM visitors WHERE tenant_id=$1 AND national_id=$2 LIMIT 1`,
        [tenant_id, national_id]
      );
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Visitor with this ID already registered', data: { id: existing[0].id } });
      }
    }

    const id = uuidv4();
    const rows = await query(
      `INSERT INTO visitors (id,tenant_id,full_name,national_id,passport_number,phone,email,gender,organization,photo_url,id_copy_url,notes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [id, tenant_id, full_name, national_id || null, passport_number || null, phone,
       email || null, gender || null, organization || null, photo_url || null, id_copy_url || null, notes || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create visitor error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/visitors/:id', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const rows = await query(
      `SELECT v.*,
              (SELECT json_agg(vv ORDER BY vv.check_in_time DESC)
               FROM visitor_visits vv WHERE vv.visitor_id=v.id) AS visit_history
       FROM visitors v WHERE v.id=$1 AND v.tenant_id=$2`,
      [req.params.id, tenant_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Visitor not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/visitors/:id', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { full_name, national_id, passport_number, phone, email, gender, organization, notes } = req.body;
    const rows = await query(
      `UPDATE visitors SET full_name=COALESCE($1,full_name), national_id=COALESCE($2,national_id),
        passport_number=COALESCE($3,passport_number), phone=COALESCE($4,phone),
        email=COALESCE($5,email), gender=COALESCE($6,gender), organization=COALESCE($7,organization),
        notes=COALESCE($8,notes), updated_at=NOW()
       WHERE id=$9 AND tenant_id=$10 RETURNING *`,
      [full_name, national_id, passport_number, phone, email, gender, organization, notes, req.params.id, tenant_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Visitor not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// VISITOR VISITS (CHECK-IN / CHECK-OUT)
// ─────────────────────────────────────────────
router.post('/visits', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id, id: userId } = req.user;
    const {
      visitor_id, purpose, purpose_details, department, host_user_id, host_name,
      vehicle_registration, items_brought, expected_duration_mins, gate, security_notes,
    } = req.body;
    if (!visitor_id || !purpose) {
      return res.status(400).json({ success: false, message: 'visitor_id and purpose are required' });
    }

    // Check visitor belongs to tenant and is not blacklisted
    const visitorRows = await query(
      `SELECT id, is_blacklisted, full_name FROM visitors WHERE id=$1 AND tenant_id=$2`,
      [visitor_id, tenant_id]
    );
    if (!visitorRows.length) return res.status(404).json({ success: false, message: 'Visitor not found' });
    if (visitorRows[0].is_blacklisted) {
      return res.status(403).json({ success: false, message: 'This visitor is blacklisted and cannot enter the school' });
    }

    const id = uuidv4();
    const passNumber = `VIS-${Date.now().toString(36).toUpperCase()}`;
    const expectedOut = expected_duration_mins
      ? new Date(Date.now() + expected_duration_mins * 60000).toISOString()
      : null;

    const rows = await query(
      `INSERT INTO visitor_visits
         (id,tenant_id,visitor_id,purpose,purpose_details,department,host_user_id,host_name,
          vehicle_registration,items_brought,expected_duration_mins,pass_number,
          status,check_in_time,expected_out_time,registered_by,gate,security_notes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'checked_in',NOW(),$13,$14,$15,$16) RETURNING *`,
      [id, tenant_id, visitor_id, purpose, purpose_details || null, department || null,
       host_user_id || null, host_name || null, vehicle_registration || null,
       items_brought || null, expected_duration_mins || 60, passNumber, expectedOut,
       userId, gate || 'Main Gate', security_notes || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create visit error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/visits/:id/checkout', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { security_notes } = req.body;
    const rows = await query(
      `UPDATE visitor_visits SET status='checked_out', check_out_time=NOW(),
        security_notes=COALESCE($1,security_notes), updated_at=NOW()
       WHERE id=$2 AND tenant_id=$3 AND status='checked_in' RETURNING *`,
      [security_notes || null, req.params.id, tenant_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Visit not found or already checked out' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/visits', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { status, date, search, page = 1, limit = 50 } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (safePage - 1) * safeLimit;
    const params = [tenant_id];
    let where = 'WHERE vv.tenant_id=$1';
    if (status) { params.push(status); where += ` AND vv.status=$${params.length}`; }
    if (date) { params.push(date); where += ` AND vv.check_in_time::date=$${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (v.full_name ILIKE $${params.length} OR v.national_id ILIKE $${params.length} OR v.phone ILIKE $${params.length} OR vv.pass_number ILIKE $${params.length})`;
    }
    params.push(safeLimit, offset);
    const rows = await query(
      `SELECT vv.*, v.full_name, v.phone, v.national_id, v.organization, v.photo_url,
              u.first_name||' '||u.last_name AS registered_by_name
       FROM visitor_visits vv
       JOIN visitors v ON v.id=vv.visitor_id
       LEFT JOIN users u ON u.id=vv.registered_by
       ${where}
       ORDER BY vv.check_in_time DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/visits/:id', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const rows = await query(
      `SELECT vv.*, v.full_name, v.phone, v.national_id, v.gender, v.organization, v.photo_url,
              u.first_name||' '||u.last_name AS registered_by_name
       FROM visitor_visits vv
       JOIN visitors v ON v.id=vv.visitor_id
       LEFT JOIN users u ON u.id=vv.registered_by
       WHERE vv.id=$1 AND vv.tenant_id=$2`,
      [req.params.id, tenant_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Visit not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// PICKUP — AUTHORIZED PERSONS
// ─────────────────────────────────────────────
router.get('/pickup/authorized/:studentId', requireRole([...GATE_ROLES, 'parent']), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const rows = await query(
      `SELECT pap.*, s.first_name||' '||s.last_name AS student_name, s.admission_number
       FROM pickup_authorized_persons pap
       JOIN students s ON s.id=pap.student_id
       WHERE pap.student_id=$1 AND pap.tenant_id=$2
       ORDER BY pap.is_active DESC, pap.created_at ASC`,
      [req.params.studentId, tenant_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/pickup/authorized', requireRole([...GATE_ROLES, 'parent']), async (req, res) => {
  try {
    const { tenant_id, id: userId } = req.user;
    const { student_id, full_name, relationship, national_id, phone, photo_url } = req.body;
    if (!student_id || !full_name || !relationship || !phone) {
      return res.status(400).json({ success: false, message: 'student_id, full_name, relationship, phone required' });
    }
    const id = uuidv4();
    const rows = await query(
      `INSERT INTO pickup_authorized_persons (id,tenant_id,student_id,full_name,relationship,national_id,phone,photo_url,added_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, tenant_id, student_id, full_name, relationship, national_id || null, phone, photo_url || null, userId]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/pickup/authorized/:id', requireRole([...GATE_ROLES, 'parent']), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { full_name, relationship, national_id, phone, photo_url, is_active } = req.body;
    const rows = await query(
      `UPDATE pickup_authorized_persons
       SET full_name=COALESCE($1,full_name), relationship=COALESCE($2,relationship),
           national_id=COALESCE($3,national_id), phone=COALESCE($4,phone),
           photo_url=COALESCE($5,photo_url),
           is_active=COALESCE($6,is_active), updated_at=NOW()
       WHERE id=$7 AND tenant_id=$8 RETURNING *`,
      [full_name, relationship, national_id, phone, photo_url, is_active, req.params.id, tenant_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/pickup/authorized/:id', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    await query(
      `UPDATE pickup_authorized_persons SET is_active=FALSE, updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
      [req.params.id, tenant_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// PICKUP — STUDENT SEARCH
// ─────────────────────────────────────────────
router.get('/pickup/students', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { search } = req.query;
    if (!search || search.length < 2) {
      return res.json({ success: true, data: [] });
    }
    const rows = await query(
      `SELECT s.id, s.first_name, s.last_name, s.admission_number,
              s.profile_photo_url, s.grade_level, s.education_level,
              c.name AS class_name,
              CASE WHEN pt.id IS NOT NULL THEN TRUE ELSE FALSE END AS already_picked_today
       FROM students s
       LEFT JOIN classes c ON c.id=s.class_id
       LEFT JOIN pickup_transactions pt ON pt.student_id=s.id AND pt.pickup_time::date=CURRENT_DATE
       WHERE s.tenant_id=$1 AND s.status='active'
         AND (s.first_name||' '||s.last_name ILIKE $2 OR s.admission_number ILIKE $2)
       ORDER BY s.first_name, s.last_name LIMIT 20`,
      [tenant_id, `%${search}%`]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// PICKUP — RELEASE STUDENT
// ─────────────────────────────────────────────
router.post('/pickup/release', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id, id: userId } = req.user;
    const {
      student_id, authorized_person_id,
      pickup_person_name, pickup_person_relationship, pickup_person_id_number, pickup_person_phone,
      verification_method, is_authorized, gate, remarks,
    } = req.body;
    if (!student_id || !pickup_person_name) {
      return res.status(400).json({ success: false, message: 'student_id and pickup_person_name are required' });
    }

    // Check student hasn't already been picked today
    const alreadyPicked = await query(
      `SELECT id FROM pickup_transactions WHERE student_id=$1 AND tenant_id=$2 AND pickup_time::date=CURRENT_DATE LIMIT 1`,
      [student_id, tenant_id]
    );
    if (alreadyPicked.length > 0) {
      return res.status(409).json({ success: false, message: 'Student has already been picked up today' });
    }

    // Check guardian blacklist
    if (pickup_person_id_number || pickup_person_phone) {
      const blacklisted = await query(
        `SELECT id FROM guardian_blacklist
         WHERE tenant_id=$1 AND is_active=TRUE
           AND (student_id=$2 OR student_id IS NULL)
           AND (national_id=$3 OR phone=$4)`,
        [tenant_id, student_id, pickup_person_id_number || null, pickup_person_phone || null]
      );
      if (blacklisted.length > 0) {
        const id = uuidv4();
        await query(
          `INSERT INTO pickup_transactions
             (id,tenant_id,student_id,pickup_person_name,pickup_person_relationship,
              pickup_person_id_number,pickup_person_phone,verification_method,is_authorized,
              pickup_time,gate,approved_by,remarks)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,FALSE,NOW(),$9,$10,$11)`,
          [id, tenant_id, student_id, pickup_person_name, pickup_person_relationship || null,
           pickup_person_id_number || null, pickup_person_phone || null,
           verification_method || 'id_check', gate || 'Main Gate', userId,
           'BLOCKED: Guardian is blacklisted. ' + (remarks || '')]
        );
        return res.status(403).json({ success: false, message: 'ACCESS DENIED: This guardian is blacklisted', logged: true });
      }
    }

    const id = uuidv4();
    const rows = await query(
      `INSERT INTO pickup_transactions
         (id,tenant_id,student_id,authorized_person_id,pickup_person_name,pickup_person_relationship,
          pickup_person_id_number,pickup_person_phone,verification_method,is_authorized,
          pickup_time,gate,approved_by,remarks)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),$11,$12,$13) RETURNING *`,
      [id, tenant_id, student_id, authorized_person_id || null,
       pickup_person_name, pickup_person_relationship || null,
       pickup_person_id_number || null, pickup_person_phone || null,
       verification_method || 'id_check', is_authorized !== false,
       gate || 'Main Gate', userId, remarks || null]
    );

    // Get student info for notification context
    const studentRows = await query(
      `SELECT s.first_name||' '||s.last_name AS student_name, s.parent_id
       FROM students s WHERE s.id=$1`,
      [student_id]
    );

    res.status(201).json({
      success: true,
      data: rows[0],
      student_name: studentRows[0]?.student_name,
    });
  } catch (err) {
    logger.error('Pickup release error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// PICKUP — TRANSACTION HISTORY
// ─────────────────────────────────────────────
router.get('/pickup/history', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { date, student_id, unauthorized_only, page = 1, limit = 50 } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (safePage - 1) * safeLimit;
    const params = [tenant_id];
    let where = 'WHERE pt.tenant_id=$1';
    if (date) { params.push(date); where += ` AND pt.pickup_time::date=$${params.length}`; }
    if (student_id) { params.push(student_id); where += ` AND pt.student_id=$${params.length}`; }
    if (unauthorized_only === 'true') where += ` AND pt.is_authorized=FALSE`;

    params.push(safeLimit, offset);
    const rows = await query(
      `SELECT pt.*, s.first_name||' '||s.last_name AS student_name, s.admission_number,
              c.name AS class_name,
              u.first_name||' '||u.last_name AS approved_by_name
       FROM pickup_transactions pt
       JOIN students s ON s.id=pt.student_id
       LEFT JOIN classes c ON c.id=s.class_id
       LEFT JOIN users u ON u.id=pt.approved_by
       ${where}
       ORDER BY pt.pickup_time DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// LIVE MONITORING
// ─────────────────────────────────────────────
router.get('/live/visitors', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const rows = await query(
      `SELECT vv.id, v.full_name, v.phone, v.photo_url, v.organization,
              vv.purpose, vv.pass_number, vv.check_in_time, vv.expected_out_time,
              vv.host_name, vv.gate,
              EXTRACT(EPOCH FROM (NOW()-vv.check_in_time))/60 AS minutes_inside,
              CASE WHEN vv.expected_out_time < NOW() THEN TRUE ELSE FALSE END AS is_overstay
       FROM visitor_visits vv
       JOIN visitors v ON v.id=vv.visitor_id
       WHERE vv.tenant_id=$1 AND vv.status='checked_in'
       ORDER BY vv.check_in_time ASC`,
      [tenant_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/live/students-waiting', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    // Students not yet picked today and not on transport
    const rows = await query(
      `SELECT s.id, s.first_name||' '||s.last_name AS full_name, s.admission_number,
              s.profile_photo_url, c.name AS class_name,
              (SELECT COUNT(*) FROM pickup_authorized_persons pap WHERE pap.student_id=s.id AND pap.is_active=TRUE) AS authorized_count
       FROM students s
       LEFT JOIN classes c ON c.id=s.class_id
       WHERE s.tenant_id=$1 AND s.status='active'
         AND (s.uses_transport IS NULL OR s.uses_transport=FALSE)
         AND s.id NOT IN (
           SELECT student_id FROM pickup_transactions
           WHERE tenant_id=$1 AND pickup_time::date=CURRENT_DATE
         )
       ORDER BY c.name, s.first_name LIMIT 200`,
      [tenant_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// OTP (Phase 2 — simple server-side OTP)
// ─────────────────────────────────────────────
router.post('/pickup/otp/request', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id, id: userId } = req.user;
    const { student_id, pickup_person_name, pickup_person_phone } = req.body;
    if (!student_id) return res.status(400).json({ success: false, message: 'student_id required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60000); // 15 minutes

    // Find parent user to notify
    const parentRows = await query(
      `SELECT u.id, p.phone_primary FROM students s
       JOIN parents p ON p.id=s.parent_id
       JOIN users u ON u.id=p.user_id
       WHERE s.id=$1 AND s.tenant_id=$2 LIMIT 1`,
      [student_id, tenant_id]
    );

    const id = uuidv4();
    await query(
      `INSERT INTO pickup_otp_requests (id,tenant_id,student_id,parent_user_id,otp_code,pickup_person_name,pickup_person_phone,expires_at,requested_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, tenant_id, student_id, parentRows[0]?.id || null, otp,
       pickup_person_name || null, pickup_person_phone || null,
       expiresAt.toISOString(), userId]
    );

    res.json({
      success: true,
      message: 'OTP generated. Parent must share the 6-digit code with the pickup person.',
      data: { otp_request_id: id, parent_phone: parentRows[0]?.phone_primary, otp },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/pickup/otp/verify', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { otp_request_id, otp_code } = req.body;
    const rows = await query(
      `SELECT * FROM pickup_otp_requests WHERE id=$1 AND tenant_id=$2 AND is_used=FALSE AND expires_at>NOW()`,
      [otp_request_id, tenant_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'OTP not found or expired' });
    if (rows[0].otp_code !== otp_code) return res.status(400).json({ success: false, message: 'Invalid OTP' });

    await query(`UPDATE pickup_otp_requests SET is_used=TRUE, used_at=NOW() WHERE id=$1`, [otp_request_id]);
    res.json({ success: true, message: 'OTP verified successfully', data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// BLACKLIST — VISITORS
// ─────────────────────────────────────────────
router.get('/blacklist/visitors', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const rows = await query(
      `SELECT vb.*, u.first_name||' '||u.last_name AS added_by_name
       FROM visitor_blacklist vb
       LEFT JOIN users u ON u.id=vb.added_by
       WHERE vb.tenant_id=$1 AND vb.is_active=TRUE
       ORDER BY vb.created_at DESC`,
      [tenant_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/blacklist/visitors', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id, id: userId } = req.user;
    const { visitor_id, national_id, full_name, phone, reason } = req.body;
    if (!reason || !full_name) return res.status(400).json({ success: false, message: 'full_name and reason required' });

    const id = uuidv4();
    const rows = await query(
      `INSERT INTO visitor_blacklist (id,tenant_id,visitor_id,national_id,full_name,phone,reason,added_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, tenant_id, visitor_id || null, national_id || null, full_name, phone || null, reason, userId]
    );

    // Mark the visitor record as blacklisted too
    if (visitor_id) {
      await query(
        `UPDATE visitors SET is_blacklisted=TRUE, blacklist_reason=$1, blacklisted_at=NOW(), blacklisted_by=$2
         WHERE id=$3 AND tenant_id=$4`,
        [reason, userId, visitor_id, tenant_id]
      );
    }

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/blacklist/visitors/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { tenant_id, id: userId } = req.user;
    const rows = await query(
      `UPDATE visitor_blacklist SET is_active=FALSE WHERE id=$1 AND tenant_id=$2 RETURNING visitor_id`,
      [req.params.id, tenant_id]
    );
    if (rows[0]?.visitor_id) {
      await query(`UPDATE visitors SET is_blacklisted=FALSE WHERE id=$1`, [rows[0].visitor_id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// BLACKLIST — GUARDIANS
// ─────────────────────────────────────────────
router.get('/blacklist/guardians', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const rows = await query(
      `SELECT gb.*, u.first_name||' '||u.last_name AS added_by_name,
              s.first_name||' '||s.last_name AS student_name
       FROM guardian_blacklist gb
       LEFT JOIN users u ON u.id=gb.added_by
       LEFT JOIN students s ON s.id=gb.student_id
       WHERE gb.tenant_id=$1 AND gb.is_active=TRUE
       ORDER BY gb.created_at DESC`,
      [tenant_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/blacklist/guardians', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id, id: userId } = req.user;
    const { student_id, full_name, national_id, phone, reason } = req.body;
    if (!reason || !full_name) return res.status(400).json({ success: false, message: 'full_name and reason required' });
    const id = uuidv4();
    const rows = await query(
      `INSERT INTO guardian_blacklist (id,tenant_id,student_id,full_name,national_id,phone,reason,added_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, tenant_id, student_id || null, full_name, national_id || null, phone || null, reason, userId]
    );
    // Also update the authorized person record if found
    if (student_id && (national_id || phone)) {
      await query(
        `UPDATE pickup_authorized_persons
         SET is_blacklisted=TRUE, blacklist_reason=$1
         WHERE student_id=$2 AND tenant_id=$3 AND (national_id=$4 OR phone=$5)`,
        [reason, student_id, tenant_id, national_id || null, phone || null]
      );
    }
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/blacklist/guardians/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    await query(
      `UPDATE guardian_blacklist SET is_active=FALSE WHERE id=$1 AND tenant_id=$2`,
      [req.params.id, tenant_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────
router.get('/reports/visitors', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { start_date, end_date } = req.query;
    const rows = await query(
      `SELECT vv.*, v.full_name, v.phone, v.national_id, v.organization,
              u.first_name||' '||u.last_name AS registered_by_name
       FROM visitor_visits vv
       JOIN visitors v ON v.id=vv.visitor_id
       LEFT JOIN users u ON u.id=vv.registered_by
       WHERE vv.tenant_id=$1
         AND ($2::date IS NULL OR vv.check_in_time::date >= $2::date)
         AND ($3::date IS NULL OR vv.check_in_time::date <= $3::date)
       ORDER BY vv.check_in_time DESC LIMIT 500`,
      [tenant_id, start_date || null, end_date || null]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/pickups', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { start_date, end_date, student_id } = req.query;
    const rows = await query(
      `SELECT pt.*, s.first_name||' '||s.last_name AS student_name, s.admission_number,
              c.name AS class_name, u.first_name||' '||u.last_name AS approved_by_name
       FROM pickup_transactions pt
       JOIN students s ON s.id=pt.student_id
       LEFT JOIN classes c ON c.id=s.class_id
       LEFT JOIN users u ON u.id=pt.approved_by
       WHERE pt.tenant_id=$1
         AND ($2::date IS NULL OR pt.pickup_time::date >= $2::date)
         AND ($3::date IS NULL OR pt.pickup_time::date <= $3::date)
         AND ($4::uuid IS NULL OR pt.student_id=$4::uuid)
       ORDER BY pt.pickup_time DESC LIMIT 500`,
      [tenant_id, start_date || null, end_date || null, student_id || null]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
