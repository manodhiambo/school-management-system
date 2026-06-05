import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

// Routes that handle their own audit logging (skip auto-audit)
const SKIP_PREFIXES = ['/api/v1/auth', '/api/v1/audit-log'];

// Map HTTP method → action verb
const METHOD_VERB = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };

// Extract a human-readable resource name from a URL path
// e.g. /api/v1/students/abc123 → "student"
function resourceFromPath(urlPath) {
  const match = urlPath.match(/\/api\/v1\/([^/?]+)/);
  if (!match) return 'unknown';
  const segment = match[1].replace(/-/g, '_');
  // Singularise common plurals
  const singulars = {
    students: 'student', teachers: 'teacher', parents: 'parent',
    classes: 'class', subjects: 'subject', users: 'user',
    attendances: 'attendance', fees: 'fee', exams: 'exam',
    assignments: 'assignment', timetables: 'timetable',
    notifications: 'notification', messages: 'message',
    announcements: 'announcement', payrolls: 'payroll',
    assessments: 'assessment', hostels: 'hostel', rooms: 'room',
    allocations: 'allocation', movements: 'movement',
    transactions: 'transaction', budgets: 'budget',
  };
  return singulars[segment] || segment;
}

export function autoAuditMiddleware(req, res, next) {
  // Only log mutation methods
  if (!METHOD_VERB[req.method]) return next();

  // Skip routes that log themselves
  if (SKIP_PREFIXES.some(p => req.originalUrl.startsWith(p))) return next();

  res.on('finish', () => {
    // Only log successful operations by authenticated users
    if (!req.user || res.statusCode >= 400) return;

    const tid = req.user.tenant_id || null;
    const uid = req.user.id || null;
    const resource = resourceFromPath(req.originalUrl);
    const action = `${METHOD_VERB[req.method]}_${resource}`;
    const resourceId = req.params?.id || req.params?.studentId || null;
    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      null;

    query(
      `INSERT INTO audit_log
         (id, tenant_id, user_id, user_email, user_role, action, resource, resource_id, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        uuidv4(), tid, uid, req.user.email, req.user.role,
        action, resource,
        resourceId ? String(resourceId) : null,
        ipAddress,
      ]
    ).catch(err => logger.warn('autoAudit insert failed:', err.message));
  });

  next();
}
