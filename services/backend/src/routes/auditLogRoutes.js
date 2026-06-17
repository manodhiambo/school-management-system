import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { buildAuditContext } from '../utils/auditContext.js';

const router = express.Router();
router.use(authenticate);

// ─── Helper: fire-and-forget audit log insertion ──────────────────────────────
export async function logAction(req, action, resource, resourceId, details) {
  try {
    const tid = req.user?.tenant_id || null;
    const uid = req.user?.id || null;
    const userEmail = req.user?.email || null;
    const userRole = req.user?.role || null;
    const { ipAddress, userAgent, deviceType, browser, os } = buildAuditContext(req);

    // Fire-and-forget — do not await
    query(
      `INSERT INTO audit_log
         (id, tenant_id, user_id, user_email, user_role, action, resource, resource_id, details,
          ip_address, user_agent, device_type, browser, os, http_method, request_path)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        uuidv4(), tid, uid, userEmail, userRole,
        action, resource || null,
        resourceId != null ? String(resourceId) : null,
        details ? JSON.stringify(details) : null,
        ipAddress, userAgent, deviceType, browser, os,
        req.method || null, req.originalUrl ? req.originalUrl.split('?')[0] : null,
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

    const { action, resource, user_id, user, from_date, to_date, device_type, ip_address } = req.query;

    // Validate date inputs before hitting Postgres
    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
    if (from_date && !ISO_DATE.test(from_date)) {
      return res.status(400).json({ success: false, message: 'Invalid from_date format (expected YYYY-MM-DD)' });
    }
    if (to_date && !ISO_DATE.test(to_date)) {
      return res.status(400).json({ success: false, message: 'Invalid to_date format (expected YYYY-MM-DD)' });
    }

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
    if (user) {
      params.push(`%${user}%`);
      // Search by email OR full name
      conditions.push(
        `(al.user_email ILIKE $${params.length} OR CONCAT(u.first_name, ' ', u.last_name) ILIKE $${params.length})`
      );
    }
    if (from_date) {
      params.push(from_date);
      conditions.push(`al.created_at >= $${params.length}::date`);
    }
    if (to_date) {
      params.push(to_date);
      conditions.push(`al.created_at < $${params.length}::date + interval '1 day'`);
    }
    if (device_type) {
      params.push(device_type);
      conditions.push(`al.device_type = $${params.length}`);
    }
    if (ip_address) {
      params.push(`%${ip_address}%`);
      conditions.push(`al.ip_address ILIKE $${params.length}`);
    }

    const where = conditions.join(' AND ');
    // LEFT JOIN users on both count and data queries (needed for name search + display)
    const joinClause = `LEFT JOIN users u ON al.user_id = u.id`;

    // Total count
    const countRows = await query(
      `SELECT COUNT(*) AS total FROM audit_log al ${joinClause} WHERE ${where}`,
      params
    );
    const total = parseInt(countRows[0].total);
    const pages = Math.ceil(total / limit);

    // Data rows — include user's full name alongside stored email/role
    params.push(limit, offset);
    const rows = await query(
      `SELECT al.*,
              NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), '') AS user_name
       FROM audit_log al
       ${joinClause}
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

    const [todayRows, activeUserRows, commonActionRows, failedLoginRows] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS total_today
         FROM audit_log
         WHERE tenant_id = $1 AND DATE(created_at) = CURRENT_DATE`,
        [tid]
      ),
      query(
        `SELECT al.user_email,
                NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), '') AS user_name,
                COUNT(*)::int AS cnt
         FROM audit_log al
         LEFT JOIN users u ON al.user_id = u.id
         WHERE al.tenant_id = $1 AND al.created_at >= NOW() - INTERVAL '30 days'
         GROUP BY al.user_email, u.first_name, u.last_name ORDER BY cnt DESC LIMIT 1`,
        [tid]
      ),
      query(
        `SELECT action, COUNT(*)::int AS cnt
         FROM audit_log
         WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY action ORDER BY cnt DESC LIMIT 1`,
        [tid]
      ),
      query(
        `SELECT COUNT(*)::int AS failed_today
         FROM audit_log
         WHERE tenant_id = $1 AND action IN ('login_failed', 'login_blocked')
           AND DATE(created_at) = CURRENT_DATE`,
        [tid]
      ),
    ]);

    res.json({
      success: true,
      data: {
        total_today: todayRows[0]?.total_today ?? 0,
        most_active_user: activeUserRows[0]?.user_name ?? activeUserRows[0]?.user_email ?? null,
        most_common_action: commonActionRows[0]?.action ?? null,
        failed_logins_today: failedLoginRows[0]?.failed_today ?? 0,
      },
    });
  } catch (err) {
    logger.error('Get audit summary error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
