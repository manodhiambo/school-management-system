import { query } from '../config/database.js';

/**
 * Extracts tenant context from JWT (req.user.tenant_id)
 * and attaches it to req.tenantId.
 * Superadmins bypass tenant isolation (req.tenantId = null).
 */
export const tenantContext = (req, res, next) => {
  if (!req.user) return next();
  if (req.user.role === 'superadmin') {
    req.tenantId = null;
    return next();
  }
  req.tenantId = req.user.tenant_id || null;
  next();
};

/**
 * Requires an active tenant — use after authenticate middleware.
 * Superadmins are always allowed through.
 * Checks tenant status and returns appropriate 403 messages.
 */
export const requireActiveTenant = async (req, res, next) => {
  if (req.user?.role === 'superadmin') return next();
  if (!req.tenantId) {
    return res.status(403).json({
      success: false,
      message: 'No tenant associated with this account.'
    });
  }
  try {
    const rows = await query(
      'SELECT status, trial_ends_at FROM tenants WHERE id = $1',
      [req.tenantId]
    );

    if (rows.length === 0 || rows[0].status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'School account is suspended. Please contact Helvino Technologies Limited at helvinotechltd@gmail.com or 0703445756.'
      });
    }

    if (rows[0].status === 'expired') {
      return res.status(403).json({
        success: false,
        message: 'School subscription has expired. Please renew to continue.'
      });
    }

    if (rows[0].status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'School registration is pending payment. Please complete payment to activate.'
      });
    }

    // Trial: allow access but block if trial period has ended
    if (rows[0].status === 'trial' && rows[0].trial_ends_at) {
      if (new Date(rows[0].trial_ends_at) < new Date()) {
        return res.status(403).json({
          success: false,
          message: 'Your free trial has ended. Please pay to continue using the system.'
        });
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};
