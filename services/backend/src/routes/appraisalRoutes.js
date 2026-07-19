import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);
router.use(requireModule('staff'));

// ── Grade helper ─────────────────────────────────────────────────────────────
function computeGrade(totalScore, maxScore) {
  if (!maxScore || maxScore === 0) return 'N/A';
  const pct = (totalScore / maxScore) * 100;
  if (pct >= 90) return 'Outstanding';
  if (pct >= 75) return 'Exceeds Expectations';
  if (pct >= 60) return 'Meets Expectations';
  if (pct >= 45) return 'Needs Improvement';
  return 'Unsatisfactory';
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// APPRAISAL TEMPLATES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// GET /api/v1/appraisals/templates
router.get('/templates', requireAdmin, async (req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM appraisal_templates WHERE tenant_id = $1 ORDER BY name`,
      [req.user.tenant_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get appraisal templates error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/appraisals/templates
// Body: {name, criteria: [{criterion, max_score, description}]}
router.post('/templates', requireAdmin, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { name, criteria } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    if (!Array.isArray(criteria) || criteria.length === 0) {
      return res.status(400).json({ success: false, message: 'criteria must be a non-empty array' });
    }
    for (const c of criteria) {
      if (!c.criterion || c.max_score == null) {
        return res.status(400).json({ success: false, message: 'Each criterion must have criterion and max_score' });
      }
    }

    const rows = await query(
      `INSERT INTO appraisal_templates (tenant_id, name, criteria)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [tid, name, JSON.stringify(criteria)]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create appraisal template error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/appraisals/templates/:id
router.put('/templates/:id', requireAdmin, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { name, criteria } = req.body;

    const rows = await query(
      `UPDATE appraisal_templates
       SET name     = COALESCE($1, name),
           criteria = COALESCE($2, criteria)
       WHERE id = $3 AND tenant_id = $4
       RETURNING *`,
      [name || null, criteria ? JSON.stringify(criteria) : null, req.params.id, tid]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update appraisal template error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/appraisals/templates/:id
router.delete('/templates/:id', requireAdmin, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `DELETE FROM appraisal_templates WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [req.params.id, tid]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    logger.error('Delete appraisal template error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// APPRAISALS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// GET /api/v1/appraisals
// Admin: all. Teacher: own appraisals.
router.get('/', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;

    let sql = `SELECT sa.*,
                      u_staff.first_name || ' ' || u_staff.last_name AS staff_name,
                      u_staff.email AS staff_email,
                      u_appraiser.first_name || ' ' || u_appraiser.last_name AS appraiser_name,
                      at.name AS template_name
               FROM staff_appraisals sa
               JOIN users u_staff ON u_staff.id = sa.staff_id
               LEFT JOIN users u_appraiser ON u_appraiser.id = sa.appraiser_id
               LEFT JOIN appraisal_templates at ON at.id = sa.template_id
               WHERE sa.tenant_id = $1`;
    const params = [tid];

    // Anyone who isn't an admin only ever sees their own appraisals — this used
    // to only scope 'teacher', which meant any other authenticated role calling
    // this endpoint directly would see every staff member's appraisal records.
    if (role !== 'admin' && role !== 'superadmin') {
      sql += ` AND sa.staff_id = $2`;
      params.push(req.user.id);
    }

    sql += ` ORDER BY sa.period DESC, u_staff.first_name`;
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get appraisals error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/appraisals
// Body: {staff_id, template_id, period, scores, comments}
// scores: object keyed by criterion index or name, e.g. {"0": 18, "1": 22}
router.post('/', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    if (role !== 'admin' && role !== 'superadmin' && role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { staff_id, template_id, period, scores, comments } = req.body;
    if (!staff_id || !template_id || !period || !scores) {
      return res.status(400).json({ success: false, message: 'staff_id, template_id, period and scores are required' });
    }

    // fetch template to compute max_score
    const tmplRows = await query(
      `SELECT * FROM appraisal_templates WHERE id = $1 AND tenant_id = $2`,
      [template_id, tid]
    );
    if (tmplRows.length === 0) return res.status(404).json({ success: false, message: 'Template not found' });
    const template = tmplRows[0];
    const criteria = template.criteria;

    let maxScore = 0;
    for (const c of criteria) {
      maxScore += parseFloat(c.max_score) || 0;
    }

    const totalScore = Object.values(scores).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
    const grade = computeGrade(totalScore, maxScore);

    const rows = await query(
      `INSERT INTO staff_appraisals
         (tenant_id, staff_id, appraiser_id, template_id, period, scores, total_score, max_score, grade, comments, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft')
       RETURNING *`,
      [tid, staff_id, req.user.id, template_id, period, JSON.stringify(scores), totalScore, maxScore, grade, comments || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create appraisal error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/appraisals/:id — update scores/comments
router.put('/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    const { scores, comments } = req.body;

    const existing = await query(
      `SELECT sa.*, at.criteria
       FROM staff_appraisals sa
       LEFT JOIN appraisal_templates at ON at.id = sa.template_id
       WHERE sa.id = $1 AND sa.tenant_id = $2`,
      [req.params.id, tid]
    );
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Appraisal not found' });
    const appraisal = existing[0];

    if (role !== 'admin' && role !== 'superadmin' && appraisal.appraiser_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorised to edit this appraisal' });
    }

    let totalScore = appraisal.total_score;
    let grade = appraisal.grade;
    let newScores = appraisal.scores;

    if (scores) {
      totalScore = Object.values(scores).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
      grade = computeGrade(totalScore, appraisal.max_score);
      newScores = scores;
    }

    const rows = await query(
      `UPDATE staff_appraisals
       SET scores      = $1,
           total_score = $2,
           grade       = $3,
           comments    = COALESCE($4, comments)
       WHERE id = $5 AND tenant_id = $6
       RETURNING *`,
      [JSON.stringify(newScores), totalScore, grade, comments || null, req.params.id, tid]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update appraisal error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/appraisals/:id/submit
router.put('/:id/submit', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `UPDATE staff_appraisals SET status = 'submitted'
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [req.params.id, tid]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Appraisal not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Submit appraisal error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/appraisals/:id/acknowledge — staff acknowledges own appraisal
router.put('/:id/acknowledge', async (req, res) => {
  try {
    const tid = req.user.tenant_id;

    const existing = await query(
      `SELECT * FROM staff_appraisals WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Appraisal not found' });

    if (existing[0].staff_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only acknowledge your own appraisal' });
    }
    if (existing[0].status !== 'submitted') {
      return res.status(400).json({ success: false, message: 'Appraisal must be submitted before acknowledging' });
    }

    const rows = await query(
      `UPDATE staff_appraisals SET status = 'acknowledged'
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [req.params.id, tid]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Acknowledge appraisal error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/appraisals/staff/:userId/history
router.get('/staff/:userId/history', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;

    // staff can only view their own history
    if (role !== 'admin' && role !== 'superadmin' && req.params.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const rows = await query(
      `SELECT sa.*,
              u_appraiser.first_name || ' ' || u_appraiser.last_name AS appraiser_name,
              at.name AS template_name
       FROM staff_appraisals sa
       LEFT JOIN users u_appraiser ON u_appraiser.id = sa.appraiser_id
       LEFT JOIN appraisal_templates at ON at.id = sa.template_id
       WHERE sa.staff_id = $1 AND sa.tenant_id = $2
       ORDER BY sa.period DESC`,
      [req.params.userId, tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get appraisal history error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
