import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { MODULE_REGISTRY, MODULE_KEYS, isModuleKey } from '../config/moduleRegistry.js';
import logger from '../utils/logger.js';
import { config } from '../config/env.js';
import { logAction } from './auditLogRoutes.js';
import { isValidIp, isPrivateIp } from '../utils/ipValidation.js';
import { buildAuditContext } from '../utils/auditContext.js';

const router = express.Router();

// ============================================================
// MIDDLEWARE: Require superadmin role
// ============================================================
const requireSuperadmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Superadmin privileges required.'
    });
  }
  next();
};

// Apply authentication to ALL routes in this router
router.use(authenticate, requireSuperadmin);

// ============================================================
// GET /tenants — List all tenants with counts and payment info
// ============================================================
router.get('/tenants', async (req, res) => {
  try {
    const { search, status } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(t.school_name ILIKE $${idx} OR t.email ILIKE $${idx} OR t.admin_email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (status) {
      conditions.push(`t.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const tenants = await query(`
      SELECT
        t.*,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student') AS student_count,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'teacher') AS teacher_count,
        (
          SELECT COALESCE(SUM(tp.amount), 0)
          FROM tenant_payments tp
          WHERE tp.tenant_id = t.id AND tp.status = 'completed'
        ) AS total_paid,
        (
          SELECT tp2.status
          FROM tenant_payments tp2
          WHERE tp2.tenant_id = t.id
          ORDER BY tp2.created_at DESC
          LIMIT 1
        ) AS last_payment_status
      FROM tenants t
      LEFT JOIN users u ON u.tenant_id = t.id
      ${whereClause}
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `, params);

    res.json({ success: true, data: tenants });
  } catch (error) {
    logger.error('List tenants error:', error);
    res.status(500).json({ success: false, message: 'Failed to list tenants', error: error.message });
  }
});

// ============================================================
// GET /tenants/:id — Get single tenant with full details
// ============================================================
router.get('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const tenants = await query(`
      SELECT
        t.*,
        COUNT(DISTINCT s.id) AS student_count,
        COUNT(DISTINCT tc.id) AS teacher_count
      FROM tenants t
      LEFT JOIN students s ON s.tenant_id = t.id
      LEFT JOIN teachers tc ON tc.tenant_id = t.id
      WHERE t.id = $1
      GROUP BY t.id
    `, [id]);

    if (tenants.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const payments = await query(
      `SELECT * FROM tenant_payments WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [id]
    );

    const admins = await query(
      `SELECT id, email, is_active, created_at, last_login FROM users WHERE tenant_id = $1 AND role = 'admin' LIMIT 5`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...tenants[0],
        recent_payments: payments,
        admin_users: admins
      }
    });
  } catch (error) {
    logger.error('Get tenant error:', error);
    res.status(500).json({ success: false, message: 'Failed to get tenant', error: error.message });
  }
});

// ============================================================
// POST /tenants — Create tenant manually
// ============================================================
router.post('/tenants', async (req, res) => {
  try {
    const {
      school_name,
      email,
      phone,
      address,
      city,
      county,
      country = 'Kenya',
      admin_email,
      status = 'trial',
      notes
    } = req.body;

    if (!school_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'school_name and email are required'
      });
    }

    const existing = await query('SELECT id FROM tenants WHERE email = $1', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'A school with this email already exists' });
    }

    // Generate unique school_code and subdomain
    const baseCode = school_name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    const rand = Math.floor(Math.random() * 900) + 100;
    const school_code = `${baseCode}${rand}`;
    const subdomain = school_name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) + rand;

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const result = await query(`
      INSERT INTO tenants (
        school_name, email, phone, address, city, county, country,
        admin_email, school_code, subdomain, schema_name,
        status, subscription_starts_at, subscription_ends_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, NOW(), $13, NOW()
      )
      RETURNING *
    `, [
      school_name, email, phone, address, city, county, country,
      admin_email || email, school_code, subdomain, `tenant_${school_code.toLowerCase()}`,
      status, oneYearFromNow.toISOString()
    ]);

    logger.info(`Tenant created by superadmin: ${school_name}`);
    res.status(201).json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Create tenant error:', error);
    res.status(500).json({ success: false, message: 'Failed to create tenant', error: error.message });
  }
});

// ============================================================
// PUT /tenants/:id — Update tenant
// ============================================================
router.put('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      school_name,
      email,
      phone,
      address,
      city,
      county,
      country,
      admin_email,
      status,
      subscription_ends_at
    } = req.body;

    const existing = await query('SELECT id FROM tenants WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const result = await query(`
      UPDATE tenants SET
        school_name        = COALESCE($1, school_name),
        email              = COALESCE($2, email),
        phone              = COALESCE($3, phone),
        address            = COALESCE($4, address),
        city               = COALESCE($5, city),
        county             = COALESCE($6, county),
        country            = COALESCE($7, country),
        admin_email        = COALESCE($8, admin_email),
        status             = COALESCE($9, status),
        subscription_ends_at = COALESCE($10, subscription_ends_at),
        updated_at         = NOW()
      WHERE id = $11
      RETURNING *
    `, [
      school_name, email, phone, address, city, county, country,
      admin_email, status, subscription_ends_at, id
    ]);

    logger.info(`Tenant updated by superadmin: ${id}`);
    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Update tenant error:', error);
    res.status(500).json({ success: false, message: 'Failed to update tenant', error: error.message });
  }
});

// ============================================================
// GET /modules — List all toggleable feature modules
// ============================================================
router.get('/modules', (req, res) => {
  res.json({ success: true, data: MODULE_REGISTRY });
});

// ============================================================
// GET /tenants/:id/modules — Get a tenant's module access state
// ============================================================
router.get('/tenants/:id/modules', async (req, res) => {
  try {
    const { id } = req.params;
    const tenants = await query('SELECT id, disabled_modules FROM tenants WHERE id = $1', [id]);
    if (tenants.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const disabled = Array.isArray(tenants[0].disabled_modules) ? tenants[0].disabled_modules : [];
    const modules = MODULE_REGISTRY.map((m) => ({
      ...m,
      enabled: !disabled.includes(m.key)
    }));

    res.json({ success: true, data: modules });
  } catch (error) {
    logger.error('Get tenant modules error:', error);
    res.status(500).json({ success: false, message: 'Failed to get tenant modules', error: error.message });
  }
});

// ============================================================
// PUT /tenants/:id/modules — Set which modules are enabled for a tenant
// Body: { enabled_modules: ['academics', 'finance', ...] } — any module
// key from MODULE_REGISTRY not present in this list is treated as disabled.
// ============================================================
router.put('/tenants/:id/modules', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled_modules } = req.body;

    if (!Array.isArray(enabled_modules)) {
      return res.status(400).json({ success: false, message: 'enabled_modules must be an array of module keys' });
    }

    const existing = await query('SELECT id FROM tenants WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const enabledSet = new Set(enabled_modules.filter(isModuleKey));
    const disabledModules = MODULE_KEYS.filter((key) => !enabledSet.has(key));

    const result = await query(
      `UPDATE tenants SET disabled_modules = $1::jsonb, updated_at = NOW() WHERE id = $2 RETURNING id, disabled_modules`,
      [JSON.stringify(disabledModules), id]
    );

    logger.info(`Tenant ${id} modules updated by superadmin. Disabled: [${disabledModules.join(', ')}]`);
    res.json({
      success: true,
      data: MODULE_REGISTRY.map((m) => ({ ...m, enabled: !disabledModules.includes(m.key) })),
      raw: result[0]
    });
  } catch (error) {
    logger.error('Update tenant modules error:', error);
    res.status(500).json({ success: false, message: 'Failed to update tenant modules', error: error.message });
  }
});

// ============================================================
// DELETE /tenants/:id — Soft delete (suspend)
// ============================================================
router.delete('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, school_name FROM tenants WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    await query(
      `UPDATE tenants SET status = 'suspended', suspended_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );

    logger.warn(`Tenant soft-deleted (suspended) by superadmin: ${id} (${existing[0].school_name})`);

    res.json({
      success: true,
      message: `School "${existing[0].school_name}" has been suspended.`,
      warning: 'All users belonging to this tenant can no longer log in until the account is reactivated.'
    });
  } catch (error) {
    logger.error('Delete tenant error:', error);
    res.status(500).json({ success: false, message: 'Failed to suspend tenant', error: error.message });
  }
});

// ============================================================
// POST /tenants/:id/activate — Activate tenant
// ============================================================
router.post('/tenants/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, school_name FROM tenants WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const result = await query(`
      UPDATE tenants SET
        status = 'active',
        subscription_starts_at = NOW(),
        subscription_ends_at = $1,
        suspended_at = NULL,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [oneYearFromNow.toISOString(), id]);

    logger.info(`Tenant activated by superadmin: ${id}`);
    res.json({ success: true, message: 'Tenant activated successfully', data: result[0] });
  } catch (error) {
    logger.error('Activate tenant error:', error);
    res.status(500).json({ success: false, message: 'Failed to activate tenant', error: error.message });
  }
});

// ============================================================
// POST /tenants/:id/suspend — Suspend tenant
// ============================================================
router.post('/tenants/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, school_name FROM tenants WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const result = await query(`
      UPDATE tenants SET status = 'suspended', suspended_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    logger.warn(`Tenant suspended by superadmin: ${id}`);
    res.json({ success: true, message: 'Tenant suspended', data: result[0] });
  } catch (error) {
    logger.error('Suspend tenant error:', error);
    res.status(500).json({ success: false, message: 'Failed to suspend tenant', error: error.message });
  }
});

// ============================================================
// POST /tenants/:id/extend — Extend subscription
// ============================================================
router.post('/tenants/:id/extend', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, school_name, subscription_ends_at FROM tenants WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const tenant = existing[0];
    const months = parseInt(req.body?.months) || 12;

    // Extend from current subscription_ends_at or from today if expired/not set
    const baseDate = tenant.subscription_ends_at && new Date(tenant.subscription_ends_at) > new Date()
      ? new Date(tenant.subscription_ends_at)
      : new Date();
    baseDate.setMonth(baseDate.getMonth() + months);

    const result = await query(`
      UPDATE tenants SET
        subscription_ends_at = $1,
        status = CASE WHEN status = 'expired' THEN 'active' ELSE status END,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [baseDate.toISOString(), id]);

    logger.info(`Tenant subscription extended by superadmin: ${id}, new end: ${baseDate.toISOString()}`);
    res.json({ success: true, message: `Subscription extended to ${baseDate.toDateString()}`, data: result[0] });
  } catch (error) {
    logger.error('Extend subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to extend subscription', error: error.message });
  }
});

// ============================================================
// DELETE /tenants/:id/permanent — Permanently purge tenant + all data
// ============================================================
router.delete('/tenants/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params;
    const { confirm } = req.body;

    const existing = await query('SELECT id, school_name, schema_name FROM tenants WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const tenant = existing[0];

    if (tenant.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot permanently delete an active tenant. Suspend or deactivate the school first.'
      });
    }

    // Require explicit confirmation string
    if (confirm !== tenant.school_name) {
      return res.status(400).json({
        success: false,
        message: `Confirmation text must match the school name exactly: "${tenant.school_name}"`
      });
    }

    // Delete tables without ON DELETE CASCADE first (migration 024)
    const nonCascadeTables = [
      'student_hostel', 'student_clubs', 'student_competency_summary',
      'student_transport', 'student_health_records', 'student_portfolios',
      'cbc_report_cards', 'parent_alerts', 'discipline_incidents',
      'academic_terms', 'school_clubs', 'hostels', 'transport_routes',
      'cbc_assessments', 'cbc_strands'
    ];
    for (const table of nonCascadeTables) {
      await query(`DELETE FROM ${table} WHERE tenant_id = $1`, [id]);
    }

    // Delete the tenant row — CASCADE handles all other related tables
    await query('DELETE FROM tenants WHERE id = $1', [id]);

    // Drop tenant schema if it exists
    if (tenant.schema_name) {
      try {
        await query(`DROP SCHEMA IF EXISTS "${tenant.schema_name}" CASCADE`);
      } catch (schemaErr) {
        logger.warn(`Could not drop schema ${tenant.schema_name}:`, schemaErr.message);
      }
    }

    logger.warn(`Tenant PERMANENTLY DELETED by superadmin: ${id} (${tenant.school_name})`);

    res.json({
      success: true,
      message: `School "${tenant.school_name}" and all its data have been permanently deleted.`
    });
  } catch (error) {
    logger.error('Permanent delete tenant error:', error);
    res.status(500).json({ success: false, message: 'Failed to permanently delete tenant', error: error.message });
  }
});

// ============================================================
// POST /tenants/:id/login-as — Generate short-lived token as tenant admin
// ============================================================
router.post('/tenants/:id/login-as', async (req, res) => {
  try {
    const { id } = req.params;

    const tenants = await query('SELECT id, school_name, status, disabled_modules FROM tenants WHERE id = $1', [id]);
    if (tenants.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    // Find the tenant's admin user
    const admins = await query(
      `SELECT id, email, role, tenant_id, is_active FROM users
       WHERE role = 'admin' AND tenant_id = $1 AND is_active = true
       LIMIT 1`,
      [id]
    );

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active admin user found for this tenant'
      });
    }

    const adminUser = admins[0];

    const token = jwt.sign(
      {
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        tenant_id: adminUser.tenant_id,
        loginAs: true,
        originalSuperadmin: req.user.id
      },
      config.jwt.secret,
      { expiresIn: '4h' }
    );

    logger.warn(`Superadmin ${req.user.email} logged in as tenant admin ${adminUser.email} (tenant: ${id})`);
    logAction(req, 'SUPERADMIN_IMPERSONATE', 'tenant', id, {
      impersonated_admin: adminUser.email,
      impersonated_admin_id: adminUser.id,
      tenant_id: id,
    });

    res.json({
      success: true,
      message: `Logged in as admin for ${tenants[0].school_name}`,
      data: {
        token,
        expiresIn: '4h',
        user: {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
          tenant_id: adminUser.tenant_id,
          disabled_modules: Array.isArray(tenants[0].disabled_modules) ? tenants[0].disabled_modules : []
        },
        tenant: tenants[0],
        loginAs: true,
        originalSuperadmin: req.user.id
      }
    });
  } catch (error) {
    logger.error('Login-as error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate impersonation token', error: error.message });
  }
});

// ============================================================
// GET /tenants/:id/payments — List all payments for a tenant
// ============================================================
router.get('/tenants/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;

    const tenants = await query('SELECT id FROM tenants WHERE id = $1', [id]);
    if (tenants.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const payments = await query(
      `SELECT * FROM tenant_payments WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    res.json({ success: true, data: payments });
  } catch (error) {
    logger.error('Get tenant payments error:', error);
    res.status(500).json({ success: false, message: 'Failed to get payments', error: error.message });
  }
});

// ============================================================
// GET /stats — Aggregate platform statistics
// ============================================================
router.get('/stats', async (req, res) => {
  try {
    const statsRows = await query(`
      SELECT
        COUNT(*)                                                   AS total_tenants,
        COUNT(*) FILTER (WHERE status = 'active')                 AS active_tenants,
        COUNT(*) FILTER (WHERE status = 'trial')                  AS trial_tenants,
        COUNT(*) FILTER (WHERE status = 'suspended')              AS suspended,
        COUNT(*) FILTER (WHERE status = 'expired')                AS expired,
        COUNT(*) FILTER (WHERE status = 'cancelled')              AS cancelled,
        COUNT(*) FILTER (WHERE
          subscription_ends_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
          AND status = 'active'
        ) AS expiring_soon
      FROM tenants
    `);

    const revenueRows = await query(`
      SELECT
        COALESCE(SUM(amount), 0) AS total_revenue,
        COALESCE(SUM(amount) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())), 0) AS monthly_revenue
      FROM tenant_payments
      WHERE status = 'completed'
    `);

    const recentRows = await query(`
      SELECT id, school_name, email, admin_email, county, status, created_at
      FROM tenants
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const expiringRows = await query(`
      SELECT id, school_name, subscription_ends_at
      FROM tenants
      WHERE subscription_ends_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
        AND status = 'active'
      ORDER BY subscription_ends_at ASC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        ...statsRows[0],
        total_revenue: revenueRows[0].total_revenue,
        monthly_revenue: revenueRows[0].monthly_revenue,
        recent_registrations: recentRows,
        expiring_list: expiringRows
      }
    });
  } catch (error) {
    logger.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get stats', error: error.message });
  }
});

// ============================================================
// PUT /profile — Change superadmin password
// ============================================================
router.put('/profile', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required' });
    }

    const users = await query('SELECT password FROM users WHERE id = $1', [userId]);
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    const valid = await bcrypt.compare(currentPassword || '', users[0].password);
    if (!valid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Update superadmin profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update password', error: error.message });
  }
});

// ============================================================
// SECURITY — cross-tenant unauthorized login attempts
// (audit_log is normally tenant-scoped for school admins; these
//  routes give the platform superadmin visibility across ALL
//  tenants, including attempts against unregistered emails where
//  tenant_id is null and would otherwise be invisible to everyone)
// ============================================================
const SECURITY_ACTIONS = ['login_failed', 'login_blocked'];

// GET /security/login-attempts — paginated, cross-tenant
router.get('/security/login-attempts', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const { reason, email, ip_address, from_date, to_date } = req.query;

    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
    if (from_date && !ISO_DATE.test(from_date)) {
      return res.status(400).json({ success: false, message: 'Invalid from_date format (expected YYYY-MM-DD)' });
    }
    if (to_date && !ISO_DATE.test(to_date)) {
      return res.status(400).json({ success: false, message: 'Invalid to_date format (expected YYYY-MM-DD)' });
    }

    const conditions = [`al.action = ANY($1)`];
    const params = [SECURITY_ACTIONS];

    if (reason) {
      params.push(reason);
      conditions.push(`al.details->>'reason' = $${params.length}`);
    }
    if (email) {
      params.push(`%${email}%`);
      conditions.push(`(al.details->>'email' ILIKE $${params.length} OR al.user_email ILIKE $${params.length})`);
    }
    if (ip_address) {
      params.push(`%${ip_address}%`);
      conditions.push(`al.ip_address ILIKE $${params.length}`);
    }
    if (from_date) {
      params.push(from_date);
      conditions.push(`al.created_at >= $${params.length}::date`);
    }
    if (to_date) {
      params.push(to_date);
      conditions.push(`al.created_at < $${params.length}::date + interval '1 day'`);
    }

    const where = conditions.join(' AND ');

    const countRows = await query(
      `SELECT COUNT(*) AS total FROM audit_log al WHERE ${where}`,
      params
    );
    const total = parseInt(countRows[0].total);
    const pages = Math.ceil(total / limit);

    params.push(limit, offset);
    const rows = await query(
      `SELECT al.*, t.school_name AS tenant_name
       FROM audit_log al
       LEFT JOIN tenants t ON al.tenant_id = t.id
       WHERE ${where}
       ORDER BY al.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ success: true, data: rows, total, page, pages });
  } catch (error) {
    logger.error('Get security login attempts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /security/summary — platform-wide security stats
router.get('/security/summary', async (req, res) => {
  try {
    const [todayRows, topIpRows, topEmailRows] = await Promise.all([
      query(
        `SELECT
           COUNT(*) FILTER (WHERE action = 'login_failed')::int AS failed_today,
           COUNT(*) FILTER (WHERE action = 'login_blocked')::int AS blocked_today,
           COUNT(DISTINCT ip_address)::int AS unique_ips_today
         FROM audit_log
         WHERE action = ANY($1) AND DATE(created_at) = CURRENT_DATE`,
        [SECURITY_ACTIONS]
      ),
      query(
        `SELECT ip_address, COUNT(*)::int AS attempts
         FROM audit_log
         WHERE action = ANY($1) AND created_at >= NOW() - INTERVAL '7 days' AND ip_address IS NOT NULL
         GROUP BY ip_address ORDER BY attempts DESC LIMIT 5`,
        [SECURITY_ACTIONS]
      ),
      query(
        `SELECT details->>'email' AS email, COUNT(*)::int AS attempts
         FROM audit_log
         WHERE action = ANY($1) AND created_at >= NOW() - INTERVAL '7 days' AND details->>'email' IS NOT NULL
         GROUP BY details->>'email' ORDER BY attempts DESC LIMIT 5`,
        [SECURITY_ACTIONS]
      ),
    ]);

    res.json({
      success: true,
      data: {
        failed_today: todayRows[0]?.failed_today ?? 0,
        blocked_today: todayRows[0]?.blocked_today ?? 0,
        unique_ips_today: todayRows[0]?.unique_ips_today ?? 0,
        top_offending_ips: topIpRows,
        top_targeted_emails: topEmailRows,
      },
    });
  } catch (error) {
    logger.error('Get security summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /security/geo-lookup?ip=x.x.x.x — on-demand IP geolocation
// Resolved lazily (only when superadmin investigates a flagged attempt) rather
// than at write-time, so we avoid bundling a geo-IP database dependency and
// avoid an external call on every single login attempt.
const geoCache = new Map(); // ip -> { data, expiresAt }
const GEO_CACHE_TTL_MS = 60 * 60 * 1000;
const GEO_CACHE_MAX_SIZE = 500;

router.get('/security/geo-lookup', async (req, res) => {
  try {
    const ip = String(req.query.ip || '').trim();
    if (!ip || !isValidIp(ip)) {
      return res.status(400).json({ success: false, message: 'Invalid IP address' });
    }

    if (isPrivateIp(ip)) {
      return res.json({ success: true, data: { ip, location: 'Private / local network' } });
    }

    const cached = geoCache.get(ip);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ success: true, data: cached.data });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let data;
    try {
      // ip-api.com free tier is HTTP-only (HTTPS requires a paid plan) — acceptable
      // here since we're only transmitting a bare IP address, not user data.
      const resp = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city,isp,mobile,proxy,hosting`, { signal: controller.signal });
      const json = await resp.json();
      if (json.status !== 'success') throw new Error(json.message || 'lookup failed');
      // Mobile carrier IPs (Safaricom, Airtel, MTN, etc.) sit behind a single
      // nationwide CGNAT pool registered to the carrier's HQ, so every subscriber
      // resolves to the same city (almost always the capital) regardless of where
      // they actually are. ip-api flags this via the `mobile` field.
      data = {
        ip,
        country: json.country || null,
        region: json.regionName || null,
        city: json.city || null,
        isp: json.isp || null,
        isMobileCarrier: !!json.mobile,
        location: [json.city, json.regionName, json.country].filter(Boolean).join(', ') || 'Unknown',
      };
    } finally {
      clearTimeout(timeout);
    }

    if (geoCache.size >= GEO_CACHE_MAX_SIZE) {
      geoCache.delete(geoCache.keys().next().value);
    }
    geoCache.set(ip, { data, expiresAt: Date.now() + GEO_CACHE_TTL_MS });

    res.json({ success: true, data });
  } catch (error) {
    logger.warn('Geo lookup failed:', error.message);
    res.status(502).json({ success: false, message: 'Location lookup unavailable' });
  }
});

// GET /security/all-logins — every login attempt across ALL tenants
// (successful + failed + blocked) so the superadmin can see who logged in,
// when, from which IP/device, across the whole platform.
const ALL_LOGIN_ACTIONS = ['login', 'login_failed', 'login_blocked'];

router.get('/security/all-logins', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const { action, email, ip_address, from_date, to_date } = req.query;

    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
    if (from_date && !ISO_DATE.test(from_date)) {
      return res.status(400).json({ success: false, message: 'Invalid from_date format (expected YYYY-MM-DD)' });
    }
    if (to_date && !ISO_DATE.test(to_date)) {
      return res.status(400).json({ success: false, message: 'Invalid to_date format (expected YYYY-MM-DD)' });
    }

    const conditions = [`al.action = ANY($1)`];
    const params = [ALL_LOGIN_ACTIONS];

    if (action) {
      params.push(action);
      conditions.push(`al.action = $${params.length}`);
    }
    if (email) {
      params.push(`%${email}%`);
      conditions.push(`(al.details->>'email' ILIKE $${params.length} OR al.user_email ILIKE $${params.length})`);
    }
    if (ip_address) {
      params.push(`%${ip_address}%`);
      conditions.push(`al.ip_address ILIKE $${params.length}`);
    }
    if (from_date) {
      params.push(from_date);
      conditions.push(`al.created_at >= $${params.length}::date`);
    }
    if (to_date) {
      params.push(to_date);
      conditions.push(`al.created_at < $${params.length}::date + interval '1 day'`);
    }

    const where = conditions.join(' AND ');

    const countRows = await query(`SELECT COUNT(*) AS total FROM audit_log al WHERE ${where}`, params);
    const total = parseInt(countRows[0].total);
    const pages = Math.ceil(total / limit);

    params.push(limit, offset);
    const rows = await query(
      `SELECT al.*, t.school_name AS tenant_name,
              NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), '') AS user_name
       FROM audit_log al
       LEFT JOIN tenants t ON al.tenant_id = t.id
       LEFT JOIN users u ON al.user_id = u.id
       WHERE ${where}
       ORDER BY al.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ success: true, data: rows, total, page, pages });
  } catch (error) {
    logger.error('Get all logins error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// DEVICE BLACKLIST — block a specific IP and/or user-agent from
// logging in or making any authenticated request platform-wide.
// ============================================================

// GET /security/blacklist — list blacklisted devices
router.get('/security/blacklist', async (req, res) => {
  try {
    const rows = await query(
      `SELECT db.*, u.email AS blacklisted_by_email
       FROM device_blacklist db
       LEFT JOIN users u ON db.blacklisted_by = u.id
       ORDER BY db.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('List device blacklist error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /security/blacklist — blacklist a device by IP and/or user-agent
router.post('/security/blacklist', async (req, res) => {
  try {
    const { ip_address, user_agent, reason } = req.body;

    if (!ip_address && !user_agent) {
      return res.status(400).json({ success: false, message: 'Provide an ip_address and/or user_agent to blacklist' });
    }
    if (ip_address && !isValidIp(ip_address)) {
      return res.status(400).json({ success: false, message: 'Invalid IP address' });
    }

    // Prevent the superadmin from locking themselves out by blacklisting their own device
    const self = buildAuditContext(req);
    if ((ip_address && ip_address === self.ipAddress) || (user_agent && user_agent === self.userAgent)) {
      return res.status(400).json({ success: false, message: 'You cannot blacklist the device you are currently using' });
    }

    const rows = await query(
      `INSERT INTO device_blacklist (ip_address, user_agent, reason, blacklisted_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [ip_address || null, user_agent || null, reason || null, req.user.id]
    );

    logAction(req, 'device_blacklisted', 'device_blacklist', rows[0].id, { ip_address, user_agent, reason });
    logger.warn(`Device blacklisted by ${req.user.email}: ip=${ip_address || '-'} ua=${user_agent || '-'}`);

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error('Blacklist device error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /security/blacklist/:id — revoke a device blacklist entry
router.delete('/security/blacklist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await query(
      `UPDATE device_blacklist SET is_active = FALSE WHERE id = $1 RETURNING *`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Blacklist entry not found' });
    }
    logAction(req, 'device_unblacklisted', 'device_blacklist', id, {});
    res.json({ success: true, message: 'Device removed from blacklist' });
  } catch (error) {
    logger.error('Unblacklist device error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// USER BLACKLIST — block a specific user account platform-wide,
// independent of (and in addition to) per-tenant deactivation.
// ============================================================

// GET /security/blacklisted-users — list all blacklisted users
router.get('/security/blacklisted-users', async (req, res) => {
  try {
    const rows = await query(
      `SELECT bu.id, bu.email, bu.role, bu.tenant_id, t.school_name AS tenant_name,
              bu.blacklist_reason, bu.blacklisted_at,
              ab.email AS blacklisted_by_email
       FROM users bu
       LEFT JOIN tenants t ON bu.tenant_id = t.id
       LEFT JOIN users ab ON bu.blacklisted_by = ab.id
       WHERE bu.is_blacklisted = TRUE
       ORDER BY bu.blacklisted_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('List blacklisted users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /security/users/:id/blacklist — blacklist a single user account
router.post('/security/users/:id/blacklist', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const target = await query('SELECT id, email, role FROM users WHERE id = $1', [id]);
    if (target.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (target[0].role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot blacklist a superadmin account' });
    }

    await query(
      `UPDATE users
       SET is_blacklisted = TRUE, blacklist_reason = $1, blacklisted_at = NOW(), blacklisted_by = $2
       WHERE id = $3`,
      [reason || null, req.user.id, id]
    );

    logAction(req, 'user_blacklisted', 'user', id, { email: target[0].email, reason });
    logger.warn(`User blacklisted by ${req.user.email}: ${target[0].email}`);

    res.json({ success: true, message: `${target[0].email} has been blacklisted` });
  } catch (error) {
    logger.error('Blacklist user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /security/users/:id/unblacklist — restore a blacklisted user
router.post('/security/users/:id/unblacklist', async (req, res) => {
  try {
    const { id } = req.params;
    const target = await query('SELECT id, email FROM users WHERE id = $1', [id]);
    if (target.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await query(
      `UPDATE users
       SET is_blacklisted = FALSE, blacklist_reason = NULL, blacklisted_at = NULL, blacklisted_by = NULL
       WHERE id = $1`,
      [id]
    );

    logAction(req, 'user_unblacklisted', 'user', id, { email: target[0].email });
    res.json({ success: true, message: `${target[0].email} has been restored` });
  } catch (error) {
    logger.error('Unblacklist user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
