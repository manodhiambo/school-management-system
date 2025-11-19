import ApiError from '../utils/ApiError.js';

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const userRole = req.user.role;

    if (!roles.includes(userRole)) {
      throw new ApiError(403, `Access denied. Required roles: ${roles.join(', ')}`);
    }

    next();
  };
};

export default requireRole;
