import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);
router.use(requireModule('finance'));

// ─── FUNDERS ──────────────────────────────────────────────────────────────────

// GET /funders — list funders
router.get('/funders', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT * FROM bursary_funders WHERE tenant_id = $1 ORDER BY name`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get bursary funders error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /funders — create funder (admin/finance)
router.post('/funders', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const allowed = ['admin', 'superadmin', 'finance_officer'];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin/Finance only' });
    }
    const { name, funder_type, contact, phone, email, notes } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }
    const rows = await query(
      `INSERT INTO bursary_funders (tenant_id, name, funder_type, contact, phone, email, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING *`,
      [tid, name, funder_type || null, contact || null, phone || null, email || null, notes || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create bursary funder error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /funders/:id — update funder
router.put('/funders/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const allowed = ['admin', 'superadmin', 'finance_officer'];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin/Finance only' });
    }
    const { name, funder_type, contact, phone, email, notes, is_active } = req.body;
    const rows = await query(
      `UPDATE bursary_funders SET
         name = COALESCE($1, name),
         funder_type = COALESCE($2, funder_type),
         contact = COALESCE($3, contact),
         phone = COALESCE($4, phone),
         email = COALESCE($5, email),
         notes = COALESCE($6, notes),
         is_active = COALESCE($7, is_active)
       WHERE id = $8 AND tenant_id = $9 RETURNING *`,
      [name, funder_type, contact, phone, email, notes, is_active, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Funder not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update bursary funder error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── BURSARIES ────────────────────────────────────────────────────────────────

// GET /bursaries — list with funder name and application counts
router.get('/bursaries', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT b.*,
              f.name AS funder_name,
              COUNT(a.id) AS total_applications,
              COUNT(a.id) FILTER (WHERE a.status = 'pending') AS pending_count,
              COUNT(a.id) FILTER (WHERE a.status = 'approved') AS approved_count,
              COUNT(a.id) FILTER (WHERE a.status = 'disbursed') AS disbursed_count
       FROM bursaries b
       LEFT JOIN bursary_funders f ON f.id = b.funder_id
       LEFT JOIN bursary_applications a ON a.bursary_id = b.id AND a.tenant_id = b.tenant_id
       WHERE b.tenant_id = $1
       GROUP BY b.id, f.name
       ORDER BY b.academic_year DESC, b.name`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get bursaries error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /bursaries — create bursary
router.post('/bursaries', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const allowed = ['admin', 'superadmin', 'finance_officer'];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin/Finance only' });
    }
    const { funder_id, name, academic_year, total_amount, per_student, deadline, description } = req.body;
    if (!name || !academic_year || total_amount == null) {
      return res.status(400).json({ success: false, message: 'name, academic_year and total_amount are required' });
    }
    const rows = await query(
      `INSERT INTO bursaries (tenant_id, funder_id, name, academic_year, total_amount, per_student, deadline, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE) RETURNING *`,
      [tid, funder_id || null, name, academic_year, total_amount, per_student || null, deadline || null, description || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create bursary error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /bursaries/:id — update bursary
router.put('/bursaries/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const allowed = ['admin', 'superadmin', 'finance_officer'];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin/Finance only' });
    }
    const { funder_id, name, academic_year, total_amount, per_student, deadline, description, is_active } = req.body;
    const rows = await query(
      `UPDATE bursaries SET
         funder_id = COALESCE($1, funder_id),
         name = COALESCE($2, name),
         academic_year = COALESCE($3, academic_year),
         total_amount = COALESCE($4, total_amount),
         per_student = COALESCE($5, per_student),
         deadline = COALESCE($6, deadline),
         description = COALESCE($7, description),
         is_active = COALESCE($8, is_active)
       WHERE id = $9 AND tenant_id = $10 RETURNING *`,
      [funder_id, name, academic_year, total_amount, per_student, deadline, description, is_active, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Bursary not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update bursary error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── APPLICATIONS ─────────────────────────────────────────────────────────────

// GET /applications — list with filters
router.get('/applications', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { bursary_id, status, student_id } = req.query;
    let sql = `SELECT a.*,
                      s.first_name || ' ' || s.last_name AS student_name,
                      s.admission_number,
                      b.name AS bursary_name,
                      b.academic_year,
                      f.name AS funder_name,
                      u.first_name || ' ' || u.last_name AS reviewer_name
               FROM bursary_applications a
               JOIN students s ON s.id = a.student_id
               JOIN bursaries b ON b.id = a.bursary_id
               LEFT JOIN bursary_funders f ON f.id = b.funder_id
               LEFT JOIN users u ON u.id = a.reviewed_by
               WHERE a.tenant_id = $1`;
    const params = [tid];
    if (bursary_id) { sql += ` AND a.bursary_id = $${params.length + 1}`; params.push(bursary_id); }
    if (status) { sql += ` AND a.status = $${params.length + 1}`; params.push(status); }
    if (student_id) { sql += ` AND a.student_id = $${params.length + 1}`; params.push(student_id); }
    sql += ' ORDER BY a.created_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get bursary applications error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /applications — apply for bursary
router.post('/applications', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { bursary_id, student_id, amount_req, reason, documents } = req.body;
    if (!bursary_id || !student_id || amount_req == null) {
      return res.status(400).json({ success: false, message: 'bursary_id, student_id and amount_req are required' });
    }

    // Verify bursary is active and open
    const bursaryRows = await query(
      `SELECT * FROM bursaries WHERE id = $1 AND tenant_id = $2 AND is_active = TRUE`,
      [bursary_id, tid]
    );
    if (!bursaryRows.length) {
      return res.status(404).json({ success: false, message: 'Bursary not found or not active' });
    }

    const rows = await query(
      `INSERT INTO bursary_applications
         (tenant_id, bursary_id, student_id, amount_req, reason, documents, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [tid, bursary_id, student_id, amount_req, reason || null, documents ? JSON.stringify(documents) : null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create bursary application error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /applications/:id/review — admin reviews
router.put('/applications/:id/review', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const allowed = ['admin', 'superadmin', 'finance_officer'];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin/Finance only' });
    }
    const { status, amount_awarded, notes } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
    }
    const rows = await query(
      `UPDATE bursary_applications SET
         status = $1,
         amount_awarded = $2,
         notes = $3,
         reviewed_by = $4,
         reviewed_at = NOW()
       WHERE id = $5 AND tenant_id = $6 RETURNING *`,
      [status, amount_awarded || null, notes || null, req.user.id, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Review bursary application error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /applications/:id/disburse — admin marks disbursed
router.put('/applications/:id/disburse', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const allowed = ['admin', 'superadmin', 'finance_officer'];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin/Finance only' });
    }

    // Fetch application
    const appRows = await query(
      `SELECT * FROM bursary_applications WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    if (!appRows.length) return res.status(404).json({ success: false, message: 'Application not found' });
    const app = appRows[0];
    if (app.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Application must be approved before disbursement' });
    }

    const rows = await query(
      `UPDATE bursary_applications SET status = 'disbursed', disbursed_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [req.params.id, tid]
    );

    // Reduce student fee balance if fee_accounts table exists
    if (app.amount_awarded) {
      try {
        await query(
          `UPDATE fee_accounts SET balance = balance - $1
           WHERE student_id = $2 AND tenant_id = $3`,
          [parseFloat(app.amount_awarded), app.student_id, tid]
        );
      } catch (feeErr) {
        logger.warn('Could not update fee_accounts during bursary disbursement:', feeErr.message);
      }
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Disburse bursary error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── STATS ────────────────────────────────────────────────────────────────────

// GET /stats — bursary statistics
router.get('/stats', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const currentYear = new Date().getFullYear().toString();

    const disbursedRows = await query(
      `SELECT COALESCE(SUM(a.amount_awarded), 0) AS total_disbursed
       FROM bursary_applications a
       JOIN bursaries b ON b.id = a.bursary_id
       WHERE a.tenant_id = $1 AND a.status = 'disbursed'
         AND b.academic_year LIKE $2`,
      [tid, `${currentYear}%`]
    );

    const pendingRows = await query(
      `SELECT COUNT(*) AS pending_count FROM bursary_applications
       WHERE tenant_id = $1 AND status = 'pending'`,
      [tid]
    );

    const funderRows = await query(
      `SELECT f.name AS funder_name,
              COUNT(a.id) AS applications,
              COALESCE(SUM(a.amount_awarded) FILTER (WHERE a.status IN ('approved','disbursed')), 0) AS total_awarded
       FROM bursary_applications a
       JOIN bursaries b ON b.id = a.bursary_id
       JOIN bursary_funders f ON f.id = b.funder_id
       WHERE a.tenant_id = $1
       GROUP BY f.id, f.name
       ORDER BY total_awarded DESC`,
      [tid]
    );

    res.json({
      success: true,
      data: {
        total_disbursed_this_year: parseFloat(disbursedRows[0].total_disbursed),
        pending_applications: parseInt(pendingRows[0].pending_count),
        by_funder: funderRows
      }
    });
  } catch (err) {
    logger.error('Get bursary stats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
