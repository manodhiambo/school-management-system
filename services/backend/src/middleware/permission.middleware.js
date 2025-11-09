const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class PermissionMiddleware {
  static requirePermission(resource, action) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        // Admin has all permissions
        if (req.user.role === 'admin') {
          return next();
        }

        // Check role-based permission
        const permission = await prisma.permissions.findFirst({
          where: {
            role: req.user.role,
            resource,
            action
          }
        });

        if (!permission) {
          return res.status(403).json({
            success: false,
            message: `Permission denied: ${resource}:${action}`
          });
        }

        // Check conditions if any
        if (permission.conditions) {
          const conditions = JSON.parse(permission.conditions);
          const hasCondition = this.checkConditions(req, conditions);
          
          if (!hasCondition) {
            return res.status(403).json({
              success: false,
              message: 'Permission conditions not met'
            });
          }
        }

        next();
      } catch (error) {
        logger.error('Permission middleware error:', error);
        res.status(500).json({
          success: false,
          message: 'Permission check error'
        });
      }
    };
  }

  static checkConditions(req, conditions) {
    // Example conditions: { "owner": "creator_id", "status": "active" }
    for (const [key, value] of Object.entries(conditions)) {
      if (key === 'owner' && req.user.id !== req.body[value] && req.user.id !== req.params[value]) {
        return false;
      }
      // Add more condition checks as needed
    }
    return true;
  }

  static requireAnyPermission(permissions) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        // Admin has all permissions
        if (req.user.role === 'admin') {
          return next();
        }

        const hasPermission = await prisma.permissions.findFirst({
          where: {
            role: req.user.role,
            OR: permissions.map(p => ({
              resource: p.resource,
              action: p.action
            }))
          }
        });

        if (!hasPermission) {
          const permsStr = permissions.map(p => `${p.resource}:${p.action}`).join(' or ');
          return res.status(403).json({
            success: false,
            message: `Permission denied: requires ${permsStr}`
          });
        }

        next();
      } catch (error) {
        logger.error('Permission middleware error:', error);
        res.status(500).json({
          success: false,
          message: 'Permission check error'
        });
      }
    };
  }
}

module.exports = PermissionMiddleware;
