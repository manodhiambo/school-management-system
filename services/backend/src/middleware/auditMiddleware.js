import settingsService from '../services/settingsService.js';
import logger from '../utils/logger.js';

export const auditLog = (action, resource) => {
  return async (req, res, next) => {
    // Store original send
    const originalSend = res.send;

    // Override send
    res.send = function(data) {
      res.send = originalSend;

      // Log audit trail
      if (req.user && res.statusCode < 400) {
        const logData = {
          userId: req.user.id,
          action,
          resource,
          resourceId: req.params.id || null,
          oldValues: req.body._oldValues || null,
          newValues: req.body,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          method: req.method,
          endpoint: req.originalUrl,
          statusCode: res.statusCode
        };

        settingsService.createAuditLog(logData).catch(error => {
          logger.error('Audit log error:', error);
        });
      }

      return res.send(data);
    };

    next();
  };
};

export default auditLog;
