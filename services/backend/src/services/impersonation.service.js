const { query } = require('../config/database');
const TokenService = require('./token.service');
const logger = require('../utils/logger');

class ImpersonationService {
  static async startImpersonation(adminId, targetUserId) {
    // Verify admin has permission
    const [admin] = await query(
      'SELECT role FROM users WHERE id = ? AND role = ?',
      [adminId, 'admin']
    );

    if (!admin) {
      throw new Error('Only administrators can impersonate users');
    }

    // Get target user details
    const [targetUser] = await query(
      'SELECT id, email, role FROM users WHERE id = ?',
      [targetUserId]
    );

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // Generate impersonation tokens
    const tokens = TokenService.generateTokens(targetUser.id, targetUser.role);
    
    // Store impersonation session
    await query(
      `INSERT INTO sessions (id, user_id, token_hash, device_info, expires_at) 
       VALUES (UUID(), ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
      [
        adminId,
        `impersonation-${targetUserId}-${Date.now()}`,
        JSON.stringify({ 
          impersonating: true,
          targetUserId: targetUser.id,
          targetRole: targetUser.role,
          adminId
        })
      ]
    );

    logger.info(`Admin ${adminId} started impersonating user ${targetUserId}`);
    
    return {
      ...tokens,
      impersonating: true,
      originalUserId: adminId,
      targetUser
    };
  }

  static async stopImpersonation(adminId, impersonationId) {
    await query(
      'DELETE FROM sessions WHERE user_id = ? AND device_info LIKE ?',
      [adminId, `%"impersonating":true%`]
    );

    logger.info(`Admin ${adminId} stopped impersonation`);
    return { message: 'Impersonation ended' };
  }

  static async getActiveImpersonations(adminId) {
    const [sessions] = await query(
      'SELECT * FROM sessions WHERE user_id = ? AND device_info LIKE ?',
      [adminId, `%"impersonating":true%`]
    );
    
    return sessions;
  }
}

module.exports = ImpersonationService;
