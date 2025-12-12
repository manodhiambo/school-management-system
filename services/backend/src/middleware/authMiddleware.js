import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { query } from '../config/database.js';
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

    const users = await query(
      'SELECT id, email, role, is_active, is_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (users.length === 0) {
      throw new ApiError(401, 'User not found');
    }

    const user = users[0];

    if (!user.is_active) {
      throw new ApiError(401, 'Account is deactivated');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.is_active,
      isVerified: user.is_verified
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

    const users = await query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (users.length > 0 && users[0].is_active) {
      req.user = {
        id: users[0].id,
        email: users[0].email,
        role: users[0].role,
        isActive: users[0].is_active
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

export default { authenticate, optionalAuth, authorize };
