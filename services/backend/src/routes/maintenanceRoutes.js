import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);
router.use(requireModule('maintenance'));

function officeOnly(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Maintenance office only' });
  }
  next();
}

function technicianOnly(req, res, next) {
  if (req.user.role !== 'technician' && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Technician only' });
  }
  next();
}

// Tenant-scoped sequential number, same pattern as financeController.js's
// generateNumber / Store's sale_number generation.
async function generateRequestNumber(tenantId) {
  const rows = await query(
    `SELECT request_number FROM maintenance_requests WHERE tenant_id = $1 AND request_number LIKE 'MR-%'
     ORDER BY request_number DESC LIMIT 1`,
    [tenantId]
  );
  if (!rows.length) return 'MR-00001';
  const next = parseInt(rows[0].request_number.replace('MR-', ''), 10) + 1;
  return `MR-${String(next).padStart(5, '0')}`;
}

const SELECT_REQUEST = `
  SELECT r.*,
         u.first_name || ' ' || u.last_name AS requested_by_name,
         t.first_name || ' ' || t.last_name AS technician_name,
         v.first_name || ' ' || v.last_name AS verified_by_name,
         a.asset_name, a.asset_tag
  FROM maintenance_requests r
  LEFT JOIN users u ON u.id = r.requested_by
  LEFT JOIN users t ON t.id = r.assigned_technician_id
  LEFT JOIN users v ON v.id = r.verified_by
  LEFT JOIN proc_assets a ON a.id = r.asset_id
`;

// ─── REQUESTS ───────────────────────────────────────────────────────────────

// GET /requests — office sees all; teacher sees only their own
router.get('/requests', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status, category, priority } = req.query;
    let sql = `${SELECT_REQUEST} WHERE r.tenant_id = $1`;
    const params = [tid];
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      sql += ` AND r.requested_by = $${params.length + 1}`;
      params.push(req.user.id);
    }
    if (status) { sql += ` AND r.status = $${params.length + 1}`; params.push(status); }
    if (category) { sql += ` AND r.category = $${params.length + 1}`; params.push(category); }
    if (priority) { sql += ` AND r.priority = $${params.length + 1}`; params.push(priority); }
    sql += ' ORDER BY r.created_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get maintenance requests error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/requests/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(`${SELECT_REQUEST} WHERE r.id = $1 AND r.tenant_id = $2`, [req.params.id, tid]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Get maintenance request error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /requests — teacher or admin submits
router.post('/requests', async (req, res) => {
  try {
    if (!['admin', 'superadmin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only staff can submit maintenance requests' });
    }
    const tid = req.user.tenant_id;
    const { category, priority, title, description, location, photo_urls, asset_id } = req.body;
    if (!category || !title) {
      return res.status(400).json({ success: false, message: 'category and title are required' });
    }
    const requestNumber = await generateRequestNumber(tid);
    const rows = await query(
      `INSERT INTO maintenance_requests
         (tenant_id, request_number, category, priority, title, description, location, photo_urls, asset_id, requested_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [tid, requestNumber, category, priority || 'medium', title, description || null, location || null,
       JSON.stringify(photo_urls || []), asset_id || null, req.user.id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create maintenance request error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /requests/:id/assign — office assigns a technician; flips linked asset to 'maintenance'
router.put('/requests/:id/assign', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { technician_id } = req.body;
    if (!technician_id) return res.status(400).json({ success: false, message: 'technician_id is required' });

    const techRows = await query(`SELECT id FROM users WHERE id = $1 AND tenant_id = $2 AND role = 'technician'`, [technician_id, tid]);
    if (!techRows.length) return res.status(400).json({ success: false, message: 'Not a valid technician for this school' });

    const rows = await query(
      `UPDATE maintenance_requests SET
         assigned_technician_id = $1, status = 'assigned', assigned_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [technician_id, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Request not found' });
    if (rows[0].asset_id) {
      await query(`UPDATE proc_assets SET status = 'maintenance', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [rows[0].asset_id, tid]);
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Assign maintenance request error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /requests/:id/start — technician starts the repair
router.put('/requests/:id/start', technicianOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const params = [req.params.id, tid];
    let sql = `UPDATE maintenance_requests SET status = 'in_progress', started_at = NOW(), updated_at = NOW()
               WHERE id = $1 AND tenant_id = $2 AND status = 'assigned'`;
    if (req.user.role === 'technician') { sql += ` AND assigned_technician_id = $3`; params.push(req.user.id); }
    sql += ' RETURNING *';
    const rows = await query(sql, params);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Assigned request not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Start maintenance job error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /requests/:id/complete — technician marks repair done, ready for inspection
router.put('/requests/:id/complete', technicianOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { repair_cost, notes } = req.body;
    const params = [repair_cost || null, notes || null, req.params.id, tid];
    let sql = `UPDATE maintenance_requests SET status = 'inspection', completed_at = NOW(), repair_cost = $1,
               inspection_notes = COALESCE($2, inspection_notes), updated_at = NOW()
               WHERE id = $3 AND tenant_id = $4 AND status = 'in_progress'`;
    if (req.user.role === 'technician') { sql += ` AND assigned_technician_id = $5`; params.push(req.user.id); }
    sql += ' RETURNING *';
    const rows = await query(sql, params);
    if (!rows.length) return res.status(404).json({ success: false, message: 'In-progress request not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Complete maintenance job error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /requests/:id/inspect — office reviews: pass to completed, or bounce back for rework
router.put('/requests/:id/inspect', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { passed, notes } = req.body;
    const nextStatus = passed === false ? 'in_progress' : 'completed';
    const rows = await query(
      `UPDATE maintenance_requests SET status = $1, inspection_notes = COALESCE($2, inspection_notes), updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4 AND status = 'inspection' RETURNING *`,
      [nextStatus, notes || null, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Request pending inspection not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Inspect maintenance request error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /requests/:id/verify — office closes the request; restores linked asset to 'active'
router.put('/requests/:id/verify', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `UPDATE maintenance_requests SET status = 'verified', verified_at = NOW(), verified_by = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 AND status = 'completed' RETURNING *`,
      [req.user.id, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Completed request not found' });
    if (rows[0].asset_id) {
      await query(`UPDATE proc_assets SET status = 'active', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = 'maintenance'`,
        [rows[0].asset_id, tid]);
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Verify maintenance request error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /requests/:id/reject — office rejects a submitted request
router.put('/requests/:id/reject', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { reason } = req.body;
    const rows = await query(
      `UPDATE maintenance_requests SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 AND status IN ('submitted','under_review') RETURNING *`,
      [reason || null, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Open request not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Reject maintenance request error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /my-jobs — technician's own assigned jobs
router.get('/my-jobs', async (req, res) => {
  try {
    if (req.user.role !== 'technician') {
      return res.status(403).json({ success: false, message: 'Technician only' });
    }
    const tid = req.user.tenant_id;
    const rows = await query(
      `${SELECT_REQUEST} WHERE r.tenant_id = $1 AND r.assigned_technician_id = $2
       AND r.status NOT IN ('verified','rejected','cancelled') ORDER BY
       CASE r.priority WHEN 'emergency' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, r.created_at`,
      [tid, req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get my maintenance jobs error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── SCHEDULES (preventive maintenance) ─────────────────────────────────────

router.get('/schedules', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT s.*, a.asset_name, t.first_name || ' ' || t.last_name AS technician_name
       FROM maintenance_schedules s
       LEFT JOIN proc_assets a ON a.id = s.asset_id
       LEFT JOIN users t ON t.id = s.assigned_technician_id
       WHERE s.tenant_id = $1 ORDER BY s.next_due_date`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get maintenance schedules error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/schedules', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { asset_id, title, category, frequency, next_due_date, assigned_technician_id, notes } = req.body;
    if (!title || !frequency || !next_due_date) {
      return res.status(400).json({ success: false, message: 'title, frequency and next_due_date are required' });
    }
    const rows = await query(
      `INSERT INTO maintenance_schedules (tenant_id, asset_id, title, category, frequency, next_due_date, assigned_technician_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tid, asset_id || null, title, category || null, frequency, next_due_date, assigned_technician_id || null, notes || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create maintenance schedule error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/schedules/:id', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { next_due_date, last_completed_date, assigned_technician_id, is_active, notes } = req.body;
    const rows = await query(
      `UPDATE maintenance_schedules SET
         next_due_date = COALESCE($1, next_due_date),
         last_completed_date = COALESCE($2, last_completed_date),
         assigned_technician_id = COALESCE($3, assigned_technician_id),
         is_active = COALESCE($4, is_active),
         notes = COALESCE($5, notes)
       WHERE id = $6 AND tenant_id = $7 RETURNING *`,
      [next_due_date, last_completed_date, assigned_technician_id, is_active, notes, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Schedule not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update maintenance schedule error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── REPORTS ────────────────────────────────────────────────────────────────

router.get('/reports/pending', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `${SELECT_REQUEST} WHERE r.tenant_id = $1 AND r.status NOT IN ('completed','verified','rejected','cancelled')
       ORDER BY CASE r.priority WHEN 'emergency' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, r.created_at`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get pending jobs report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/completed', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `${SELECT_REQUEST} WHERE r.tenant_id = $1 AND r.status IN ('completed','verified') ORDER BY r.completed_at DESC`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get completed jobs report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/cost-by-asset', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT a.id AS asset_id, a.asset_name, a.asset_tag,
              COUNT(r.id) AS job_count, SUM(r.repair_cost) AS total_cost
       FROM maintenance_requests r
       JOIN proc_assets a ON a.id = r.asset_id
       WHERE r.tenant_id = $1 AND r.repair_cost IS NOT NULL
       GROUP BY a.id, a.asset_name, a.asset_tag
       ORDER BY total_cost DESC`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get cost-by-asset report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/technician-performance', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT t.id AS technician_id, t.first_name || ' ' || t.last_name AS technician_name,
              COUNT(r.id) FILTER (WHERE r.status IN ('completed','verified')) AS jobs_completed,
              COUNT(r.id) FILTER (WHERE r.status NOT IN ('completed','verified','rejected','cancelled')) AS jobs_open,
              AVG(EXTRACT(EPOCH FROM (r.completed_at - r.started_at)) / 3600) FILTER (WHERE r.completed_at IS NOT NULL AND r.started_at IS NOT NULL) AS avg_hours_to_complete
       FROM users t
       LEFT JOIN maintenance_requests r ON r.assigned_technician_id = t.id AND r.tenant_id = t.tenant_id
       WHERE t.tenant_id = $1 AND t.role = 'technician'
       GROUP BY t.id, t.first_name, t.last_name
       ORDER BY jobs_completed DESC`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get technician performance report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/trends', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT DATE_TRUNC('month', created_at) AS month, category, COUNT(*) AS request_count, SUM(repair_cost) AS total_cost
       FROM maintenance_requests
       WHERE tenant_id = $1
       GROUP BY DATE_TRUNC('month', created_at), category
       ORDER BY month DESC, category`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get maintenance trends report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
