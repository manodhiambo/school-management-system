import { findBlacklistMatch } from '../utils/blacklist.js';
import { buildAuditContext } from '../utils/auditContext.js';
import { logAction } from '../routes/auditLogRoutes.js';
import logger from '../utils/logger.js';

// Rejects every request — authenticated or not — from a blacklisted IP/user-agent.
// authMiddleware.js already re-checks this for authenticated routes (defence in
// depth, and it needs the lookup there anyway since that's where the user gets
// decoded), and /login has its own check for detailed logging — but public,
// unauthenticated endpoints like /register, /demo-login, /apply/:schoolCode, and
// password reset had no auth middleware to piggyback on, so a device blocked from
// logging in stayed completely free to keep hitting every other public endpoint.
// Mounted globally on /api/ before the rate limiters, so a blocked device doesn't
// even spend rate-limit budget.
export async function blockBlacklisted(req, res, next) {
  try {
    const { ipAddress, userAgent } = buildAuditContext(req);
    const reason = await findBlacklistMatch(ipAddress, userAgent);
    if (reason) {
      logger.warn(`Blocked request from blacklisted device: ${ipAddress} ${req.method} ${req.path}`);
      // Reuses the same 'login_blocked' action + 'device_blacklisted' reason the
      // /login route already logs, so this shows up in the existing Security page
      // (Unauthorized Attempts tab) without any query/UI changes — request_path
      // and http_method (captured by logAction itself) show which endpoint it hit.
      logAction(req, 'login_blocked', 'request', null, { reason: 'device_blacklisted', detail: reason });
      return res.status(403).json({ success: false, message: 'Access from this device has been blocked.' });
    }
    next();
  } catch (err) {
    // Fail open on a lookup error — a DB hiccup here must not take down the whole API
    logger.warn('Blacklist check failed:', err.message);
    next();
  }
}
