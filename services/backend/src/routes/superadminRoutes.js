import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

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
// POST /tenants/:id/login-as — Generate short-lived token as tenant admin
// ============================================================
router.post('/tenants/:id/login-as', async (req, res) => {
  try {
    const { id } = req.params;

    const tenants = await query('SELECT id, school_name, status FROM tenants WHERE id = $1', [id]);
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
      process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET,
      { expiresIn: '4h' }
    );

    logger.warn(`Superadmin ${req.user.email} logged in as tenant admin ${adminUser.email} (tenant: ${id})`);

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
          tenant_id: adminUser.tenant_id
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

export default router;
