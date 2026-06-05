import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// ─── Helper: fire-and-forget audit log insertion ──────────────────────────────
export async function logAction(req, action, resource, resourceId, details) {
  try {
    const tid = req.user?.tenant_id || null;
    const uid = req.user?.id || null;
    const userEmail = req.user?.email || null;
    const userRole = req.user?.role || null;
    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      null;

    // Fire-and-forget — do not await
    query(
      `INSERT INTO audit_log
         (id, tenant_id, user_id, user_email, user_role, action, resource, resource_id, details, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        uuidv4(), tid, uid, userEmail, userRole,
        action, resource || null,
        resourceId != null ? String(resourceId) : null,
        details ? JSON.stringify(details) : null,
        ipAddress
      ]
    ).catch(err => logger.warn('logAction insert failed:', err.message));
  } catch (err) {
    // Never throw — audit log failure must not break the primary request
    logger.warn('logAction error:', err.message);
  }
}

// ─── All routes below are admin-only ─────────────────────────────────────────

// GET / — paginated audit log
// Query params: page, limit, action, resource, user_id, from_date, to_date
router.get('/', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const { action, resource, user_id, from_date, to_date } = req.query;

    const conditions = ['al.tenant_id = $1'];
    const params = [tid];

    if (action) {
      params.push(action);
      conditions.push(`al.action = $${params.length}`);
    }
    if (resource) {
      params.push(resource);
      conditions.push(`al.resource = $${params.length}`);
    }
    if (user_id) {
      params.push(user_id);
      conditions.push(`al.user_id = $${params.length}`);
    }
    if (from_date) {
      params.push(from_date);
      conditions.push(`al.created_at >= $${params.length}`);
    }
    if (to_date) {
      params.push(to_date);
      conditions.push(`al.created_at <= $${params.length}::date + interval '1 day'`);
    }

    const where = conditions.join(' AND ');

    // Total count
    const countRows = await query(
      `SELECT COUNT(*) AS total FROM audit_log al WHERE ${where}`,
      params
    );
    const total = parseInt(countRows[0].total);
    const pages = Math.ceil(total / limit);

    // Data rows
    params.push(limit, offset);
    const rows = await query(
      `SELECT al.*
       FROM audit_log al
       WHERE ${where}
       ORDER BY al.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ success: true, data: rows, total, page, pages });
  } catch (err) {
    logger.error('Get audit log error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /actions — distinct action values for filter dropdown
router.get('/actions', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT DISTINCT action FROM audit_log WHERE tenant_id = $1 ORDER BY action ASC`,
      [tid]
    );
    res.json({ success: true, data: rows.map(r => r.action) });
  } catch (err) {
    logger.error('Get audit actions error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /summary — summary stats for dashboard cards
router.get('/summary', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;

    const [todayRows, activeUserRows, commonActionRows] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS total_today
         FROM audit_log
         WHERE tenant_id = $1 AND DATE(created_at) = CURRENT_DATE`,
        [tid]
      ),
      query(
        `SELECT user_email, COUNT(*)::int AS cnt
         FROM audit_log
         WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY user_email ORDER BY cnt DESC LIMIT 1`,
        [tid]
      ),
      query(
        `SELECT action, COUNT(*)::int AS cnt
         FROM audit_log
         WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY action ORDER BY cnt DESC LIMIT 1`,
        [tid]
      ),
    ]);

    res.json({
      success: true,
      data: {
        total_today: todayRows[0]?.total_today ?? 0,
        most_active_user: activeUserRows[0]?.user_email ?? null,
        most_common_action: commonActionRows[0]?.action ?? null,
      },
    });
  } catch (err) {
    logger.error('Get audit summary error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
