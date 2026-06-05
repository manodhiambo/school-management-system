import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// GET /api/v1/meetings/slots
// Admin: all slots. Teacher: own slots. Parent: unbooked slots with teacher info.
router.get('/slots', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;

    if (role === 'parent') {
      const rows = await query(
        `SELECT ps.*,
                u.first_name || ' ' || u.last_name AS teacher_name,
                u.email AS teacher_email
         FROM ptm_slots ps
         JOIN users u ON u.id = ps.teacher_id
         WHERE ps.tenant_id = $1
           AND ps.is_booked = false
           AND ps.slot_date >= CURRENT_DATE
         ORDER BY ps.slot_date, ps.start_time`,
        [tid]
      );
      return res.json({ success: true, data: rows });
    }

    let sql = `SELECT ps.*,
                      u.first_name || ' ' || u.last_name AS teacher_name,
                      u.email AS teacher_email
               FROM ptm_slots ps
               JOIN users u ON u.id = ps.teacher_id
               WHERE ps.tenant_id = $1`;
    const params = [tid];

    if (role === 'teacher') {
      sql += ` AND ps.teacher_id = $2`;
      params.push(req.user.id);
    }

    sql += ` ORDER BY ps.slot_date, ps.start_time`;
    const rows = await query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get PTM slots error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/meetings/slots — teacher/admin creates slot(s)
// Body: {slot_date, start_time, end_time} OR {slots: [{slot_date, start_time, end_time}]}
router.post('/slots', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    if (role !== 'admin' && role !== 'teacher' && role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const teacher_id = req.user.role === 'admin' || req.user.role === 'superadmin'
      ? (req.body.teacher_id || req.user.id)
      : req.user.id;

    let slotsToCreate = [];
    if (req.body.slots && Array.isArray(req.body.slots)) {
      slotsToCreate = req.body.slots;
    } else {
      const { slot_date, start_time, end_time } = req.body;
      if (!slot_date || !start_time || !end_time) {
        return res.status(400).json({ success: false, message: 'slot_date, start_time, end_time required' });
      }
      slotsToCreate = [{ slot_date, start_time, end_time }];
    }

    if (slotsToCreate.length === 0) {
      return res.status(400).json({ success: false, message: 'No slots provided' });
    }

    const created = [];
    for (const s of slotsToCreate) {
      if (!s.slot_date || !s.start_time || !s.end_time) continue;
      const rows = await query(
        `INSERT INTO ptm_slots (tenant_id, teacher_id, slot_date, start_time, end_time, is_booked)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING *`,
        [tid, teacher_id, s.slot_date, s.start_time, s.end_time]
      );
      created.push(rows[0]);
    }

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    logger.error('Create PTM slot error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/meetings/slots/:id — teacher/admin deletes slot (only if not booked)
router.delete('/slots/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    if (role !== 'admin' && role !== 'teacher' && role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const existing = await query(
      `SELECT * FROM ptm_slots WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }
    const slot = existing[0];

    if (slot.is_booked) {
      return res.status(400).json({ success: false, message: 'Cannot delete a booked slot' });
    }
    if (role === 'teacher' && slot.teacher_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your slot' });
    }

    await query(`DELETE FROM ptm_slots WHERE id = $1 AND tenant_id = $2`, [req.params.id, tid]);
    res.json({ success: true, message: 'Slot deleted' });
  } catch (err) {
    logger.error('Delete PTM slot error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/meetings/book/:slotId — parent books a slot
// Body: {student_id, agenda}
router.post('/book/:slotId', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'parent') {
      return res.status(403).json({ success: false, message: 'Only parents can book slots' });
    }

    const { student_id, agenda } = req.body;
    if (!student_id) {
      return res.status(400).json({ success: false, message: 'student_id is required' });
    }

    const slotRows = await query(
      `SELECT * FROM ptm_slots WHERE id = $1 AND tenant_id = $2`,
      [req.params.slotId, tid]
    );
    if (slotRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }
    const slot = slotRows[0];
    if (slot.is_booked) {
      return res.status(409).json({ success: false, message: 'Slot is already booked' });
    }

    await query(
      `UPDATE ptm_slots SET is_booked = true WHERE id = $1 AND tenant_id = $2`,
      [slot.id, tid]
    );

    const booking = await query(
      `INSERT INTO ptm_bookings (tenant_id, slot_id, parent_id, student_id, agenda, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [tid, slot.id, req.user.id, student_id, agenda || null]
    );

    res.status(201).json({ success: true, data: booking[0] });
  } catch (err) {
    logger.error('Book PTM slot error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/meetings/bookings
// Admin: all. Teacher: bookings on their slots. Parent: own bookings.
router.get('/bookings', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;

    let sql = `SELECT pb.*,
                      ps.slot_date, ps.start_time, ps.end_time, ps.teacher_id,
                      u_teacher.first_name || ' ' || u_teacher.last_name AS teacher_name,
                      u_parent.first_name || ' ' || u_parent.last_name AS parent_name,
                      u_parent.email AS parent_email,
                      s.first_name || ' ' || s.last_name AS student_name,
                      s.admission_number
               FROM ptm_bookings pb
               JOIN ptm_slots ps ON ps.id = pb.slot_id
               JOIN users u_teacher ON u_teacher.id = ps.teacher_id
               JOIN users u_parent ON u_parent.id = pb.parent_id
               LEFT JOIN students s ON s.id = pb.student_id
               WHERE pb.tenant_id = $1`;
    const params = [tid];

    if (role === 'teacher') {
      sql += ` AND ps.teacher_id = $2`;
      params.push(req.user.id);
    } else if (role === 'parent') {
      sql += ` AND pb.parent_id = $2`;
      params.push(req.user.id);
    }

    sql += ` ORDER BY ps.slot_date DESC, ps.start_time`;
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get PTM bookings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/meetings/bookings/:id/status — teacher/admin updates booking status
// Body: {status, teacher_notes?}
router.put('/bookings/:id/status', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    if (role !== 'admin' && role !== 'teacher' && role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { status, teacher_notes } = req.body;
    const allowed = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(', ')}` });
    }

    const existing = await query(
      `SELECT pb.*, ps.teacher_id
       FROM ptm_bookings pb
       JOIN ptm_slots ps ON ps.id = pb.slot_id
       WHERE pb.id = $1 AND pb.tenant_id = $2`,
      [req.params.id, tid]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (role === 'teacher' && existing[0].teacher_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }

    const updated = await query(
      `UPDATE ptm_bookings
       SET status = $1, teacher_notes = COALESCE($2, teacher_notes)
       WHERE id = $3 AND tenant_id = $4
       RETURNING *`,
      [status, teacher_notes || null, req.params.id, tid]
    );

    res.json({ success: true, data: updated[0] });
  } catch (err) {
    logger.error('Update PTM booking status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/meetings/bookings/:id/cancel — parent cancels own booking
router.delete('/bookings/:id/cancel', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    if (req.user.role !== 'parent') {
      return res.status(403).json({ success: false, message: 'Only parents can cancel their bookings' });
    }

    const existing = await query(
      `SELECT * FROM ptm_bookings WHERE id = $1 AND tenant_id = $2 AND parent_id = $3`,
      [req.params.id, tid, req.user.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    const booking = existing[0];

    await query(
      `UPDATE ptm_slots SET is_booked = false WHERE id = $1 AND tenant_id = $2`,
      [booking.slot_id, tid]
    );
    await query(
      `DELETE FROM ptm_bookings WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );

    res.json({ success: true, message: 'Booking cancelled' });
  } catch (err) {
    logger.error('Cancel PTM booking error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
