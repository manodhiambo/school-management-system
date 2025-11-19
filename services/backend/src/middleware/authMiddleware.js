import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { config } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'school-management-system',
    });

    // Fetch user from database
    const users = await query(
      'SELECT id, email, role, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!users || users.length === 0) {
      throw new ApiError(401, 'User not found');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new ApiError(401, 'Account is inactive');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError(401, 'Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Token expired'));
    }
    next(error);
  }
};

export default authenticate;
