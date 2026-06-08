import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import pool from '../config/database.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new ApiError(401, 'No token provided');
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    
    const result = await pool.query(
      `SELECT u.id, u.email, u.role, u.tenant_id, u.is_active, u.is_verified, t.disabled_modules
       FROM users u
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(401, 'User not found');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new ApiError(401, 'Account is deactivated');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id || null,
      isActive: user.is_active,
      isVerified: user.is_verified,
      disabled_modules: user.disabled_modules || []
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.error('Invalid token:', error.message);
      return next(new ApiError(401, 'Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      logger.error('Token expired');
      return next(new ApiError(401, 'Token expired'));
    }
    next(error);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    
    const result = await pool.query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length > 0 && result.rows[0].is_active) {
      req.user = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].role,
        isActive: result.rows[0].is_active
      };
    }

    next();
  } catch (error) {
    next();
  }
};

/**
 * ROLE-BASED AUTHORIZATION
 * authorize(['admin', 'teacher'])
 */
export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Access denied'));
    }
    next();
  };
};

/**
 * PER-TENANT MODULE GATING
 * requireModule('transport') — blocks access if the tenant has disabled
 * that module. Superadmins always pass through (they manage the toggle,
 * not consume it). Users with no tenant (e.g. superadmin) are unaffected.
 */
export const requireModule = (moduleKey) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    if (req.user.role === 'superadmin' || !req.user.tenant_id) {
      return next();
    }
    const disabled = Array.isArray(req.user.disabled_modules) ? req.user.disabled_modules : [];
    if (disabled.includes(moduleKey)) {
      return next(new ApiError(403, 'This module is not enabled for your school. Please contact your administrator.'));
    }
    next();
  };
};

export default { authenticate, optionalAuth, authorize, requireModule };
