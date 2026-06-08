import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);
router.use(requireModule('staff'));

// GET /api/v1/staff-leave — list leave requests (admin: all; staff: own)
router.get('/', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status, user_id } = req.query;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    let sql = `
      SELECT lr.*,
        u.email AS staff_email,
        ru.email AS reviewer_email
      FROM staff_leave_requests lr
      JOIN users u ON u.id = lr.user_id
      LEFT JOIN users ru ON ru.id = lr.reviewed_by
      WHERE lr.tenant_id = $1
    `;
    const params = [tid];

    if (!isAdmin) {
      sql += ` AND lr.user_id = $${params.length + 1}`;
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

// POST /api/v1/staff-leave — submit a leave request
router.post('/', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { leave_type, start_date, end_date, reason, staff_name, staff_role } = req.body;

    if (!leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({ success: false, message: 'leave_type, start_date, end_date and reason are required' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    const days_requested = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const rows = await query(
      `INSERT INTO staff_leave_requests
       (tenant_id, user_id, staff_name, staff_role, leave_type, start_date, end_date,
        days_requested, reason, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending') RETURNING *`,
      [tid, req.user.id, staff_name || null, staff_role || req.user.role,
       leave_type, start_date, end_date, days_requested, reason]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create leave request error:', err);
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
