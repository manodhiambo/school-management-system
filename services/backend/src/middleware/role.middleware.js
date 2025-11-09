const { requireRole, requirePermission } = require('./auth.middleware');

// Super admin only
const requireAdmin = requireRole(['admin']);

// Admin or Teacher
const requireAdminOrTeacher = requireRole(['admin', 'teacher']);

// Admin or Parent
const requireAdminOrParent = requireRole(['admin', 'parent']);

// Student specific
const requireStudent = requireRole(['student']);

// Permission-based guards
const canReadStudent = requirePermission('student', 'read');
const canWriteStudent = requirePermission('student', 'write');
const canReadTeacher = requirePermission('teacher', 'read');
const canWriteTeacher = requirePermission('teacher', 'write');
const canReadFee = requirePermission('fee', 'read');
const canWriteFee = requirePermission('fee', 'write');

module.exports = {
  requireAdmin,
  requireAdminOrTeacher,
  requireAdminOrParent,
  requireStudent,
  canReadStudent,
  canWriteStudent,
  canReadTeacher,
  canWriteTeacher,
  canReadFee,
  canWriteFee
};
