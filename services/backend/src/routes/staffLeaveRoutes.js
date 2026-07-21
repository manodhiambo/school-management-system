import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);
router.use(requireModule('staff'));

async function notifyUser(tenantId, userId, title, message, type = 'info') {
  await query(
    `INSERT INTO notifications (id, user_id, tenant_id, title, message, type, is_read, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, false, NOW())`,
    [uuidv4(), userId, tenantId, title, message, type]
  ).catch(err => logger.error('Failed to create leave-cover notification:', err));
}

// GET /api/v1/staff-leave — list leave requests. Admin sees all; staff see
// their own requests AND any request where they're the designated cover, so
// a colleague can find and respond to a cover request.
router.get('/', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status, user_id } = req.query;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    let sql = `
      SELECT lr.*,
        u.email AS staff_email,
        ru.email AS reviewer_email,
        cu.email AS covering_email,
        UPPER(ct.first_name || ' ' || ct.last_name) AS covering_name
      FROM staff_leave_requests lr
      JOIN users u ON u.id = lr.user_id
      LEFT JOIN users ru ON ru.id = lr.reviewed_by
      LEFT JOIN users cu ON cu.id = lr.covering_staff_id
      LEFT JOIN teachers ct ON ct.user_id = lr.covering_staff_id AND ct.tenant_id = lr.tenant_id
      WHERE lr.tenant_id = $1
    `;
    const params = [tid];

    if (!isAdmin) {
      sql += ` AND (lr.user_id = $${params.length + 1} OR lr.covering_staff_id = $${params.length + 1})`;
      params.push(req.user.id);
    } else if (user_id) {
      sql += ` AND lr.user_id = $${params.length + 1}`;
      params.push(user_id);
    }

    if (status) {
      sql += ` AND lr.status = $${params.length + 1}`;
      params.push(status);
    }

    sql += ' ORDER BY lr.created_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get leave requests error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/staff-leave — submit a leave request. A covering colleague is
// mandatory: the request cannot be created without naming someone to take
// the applicant's place, and that colleague is notified to accept/decline.
router.post('/', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { leave_type, start_date, end_date, reason, staff_name, staff_role, covering_staff_id } = req.body;

    if (!leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({ success: false, message: 'leave_type, start_date, end_date and reason are required' });
    }
    if (!covering_staff_id) {
      return res.status(400).json({ success: false, message: 'You must select a colleague to cover for you before you can apply for leave' });
    }
    if (covering_staff_id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot select yourself as the covering colleague' });
    }

    const coveringTeacher = await query(
      `SELECT t.user_id FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.user_id = $1 AND t.tenant_id = $2 AND u.is_active = true`,
      [covering_staff_id, tid]
    );
    if (!coveringTeacher.length) {
      return res.status(400).json({ success: false, message: 'Selected covering colleague was not found among active teachers' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    const days_requested = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const rows = await query(
      `INSERT INTO staff_leave_requests
       (tenant_id, user_id, staff_name, staff_role, leave_type, start_date, end_date,
        days_requested, reason, status, covering_staff_id, cover_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,'pending') RETURNING *`,
      [tid, req.user.id, staff_name || null, staff_role || req.user.role,
       leave_type, start_date, end_date, days_requested, reason, covering_staff_id]
    );

    const applicantName = staff_name || req.user.email;
    await notifyUser(
      tid, covering_staff_id,
      'Cover request for a colleague’s leave',
      `${applicantName} has asked you to cover for them while on ${leave_type} leave from ${start_date} to ${end_date}. Please accept or decline.`,
      'leave_cover_request'
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create leave request error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/staff-leave/:id/cover-response — the designated covering
// colleague accepts or declines. Only that colleague may respond.
router.put('/:id/cover-response', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status, note } = req.body;
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be accepted or declined' });
    }

    const existing = await query(
      `SELECT * FROM staff_leave_requests WHERE id=$1 AND tenant_id=$2`,
      [req.params.id, tid]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Request not found' });
    if (existing[0].covering_staff_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the requested covering colleague can respond to this request' });
    }

    const rows = await query(
      `UPDATE staff_leave_requests SET cover_status=$1, cover_responded_at=NOW(), cover_response_note=$2, updated_at=NOW()
       WHERE id=$3 AND tenant_id=$4 RETURNING *`,
      [status, note || null, req.params.id, tid]
    );

    const responderName = req.user.email;
    await notifyUser(
      tid, existing[0].user_id,
      status === 'accepted' ? 'Your cover request was accepted' : 'Your cover request was declined',
      status === 'accepted'
        ? `${responderName} has agreed to cover for you during your leave.`
        : `${responderName} declined to cover for you. Please choose another colleague for your leave request.`,
      'leave_cover_response'
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Cover response error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/staff-leave/:id/reassign-cover — the applicant picks a
// different colleague, e.g. after a decline. Only allowed while the leave
// itself is still pending (not yet reviewed by admin).
router.put('/:id/reassign-cover', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { covering_staff_id } = req.body;
    if (!covering_staff_id) {
      return res.status(400).json({ success: false, message: 'covering_staff_id is required' });
    }
    if (covering_staff_id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot select yourself as the covering colleague' });
    }

    const existing = await query(
      `SELECT * FROM staff_leave_requests WHERE id=$1 AND tenant_id=$2 AND user_id=$3`,
      [req.params.id, tid, req.user.id]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Request not found' });
    if (existing[0].status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This leave request has already been reviewed and can no longer be changed' });
    }

    const coveringTeacher = await query(
      `SELECT t.user_id FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.user_id = $1 AND t.tenant_id = $2 AND u.is_active = true`,
      [covering_staff_id, tid]
    );
    if (!coveringTeacher.length) {
      return res.status(400).json({ success: false, message: 'Selected covering colleague was not found among active teachers' });
    }

    const rows = await query(
      `UPDATE staff_leave_requests
       SET covering_staff_id=$1, cover_status='pending', cover_responded_at=NULL, cover_response_note=NULL, updated_at=NOW()
       WHERE id=$2 AND tenant_id=$3 RETURNING *`,
      [covering_staff_id, req.params.id, tid]
    );

    const applicantName = existing[0].staff_name || req.user.email;
    await notifyUser(
      tid, covering_staff_id,
      'Cover request for a colleague’s leave',
      `${applicantName} has asked you to cover for them while on ${existing[0].leave_type} leave from ${new Date(existing[0].start_date).toLocaleDateString()} to ${new Date(existing[0].end_date).toLocaleDateString()}. Please accept or decline.`,
      'leave_cover_request'
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Reassign cover error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/staff-leave/:id/review — admin approves/rejects
router.put('/:id/review', async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { status, reviewer_comment } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
    }
    const tid = req.user.tenant_id;
    const rows = await query(
      `UPDATE staff_leave_requests SET status=$1, reviewed_by=$2, reviewed_at=NOW(),
       reviewer_comment=$3, updated_at=NOW()
       WHERE id=$4 AND tenant_id=$5 RETURNING *`,
      [status, req.user.id, reviewer_comment || null, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Review leave request error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/staff-leave/:id/cancel — staff cancels own pending request
router.put('/:id/cancel', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `UPDATE staff_leave_requests SET status='cancelled', updated_at=NOW()
       WHERE id=$1 AND tenant_id=$2 AND user_id=$3 AND status='pending' RETURNING *`,
      [req.params.id, tid, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Request not found or not cancellable' });
    if (rows[0].covering_staff_id) {
      await notifyUser(
        tid, rows[0].covering_staff_id,
        'Cover request cancelled',
        `${rows[0].staff_name || 'A colleague'} cancelled their leave request, so you no longer need to cover for them.`,
        'leave_cover_cancelled'
      );
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/staff-leave/:id — admin deletes
router.delete('/:id', async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const tid = req.user.tenant_id;
    await query('DELETE FROM staff_leave_requests WHERE id=$1 AND tenant_id=$2', [req.params.id, tid]);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
