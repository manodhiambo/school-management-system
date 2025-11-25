import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class SettingsService {
  async getSettings() {
    const results = await query('SELECT * FROM settings LIMIT 1');
    return results[0] || null;
  }

  async updateSettings(data) {
    const settings = await this.getSettings();
    
    if (!settings) {
      const id = uuidv4();
      await query(
        `INSERT INTO settings (id, school_name, school_code, phone, email, current_academic_year, timezone, currency) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, data.school_name, data.school_code, data.phone, data.email, data.current_academic_year, data.timezone, data.currency]
      );
      return await this.getSettings();
    }

    const updates = [];
    const values = [];
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(data[key]);
      }
    });

    if (updates.length > 0) {
      values.push(settings.id);
      await query(
        `UPDATE settings SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );
    }

    return await this.getSettings();
  }

  async getDashboardStatistics() {
    // Students statistics
    const studentStats = await query(`
      SELECT 
        COUNT(*) as total_students,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_students,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_students
      FROM students
    `);

    // Teachers statistics
    const teacherStats = await query(`
      SELECT 
        COUNT(*) as total_teachers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_teachers,
        SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as on_leave_teachers
      FROM teachers
    `);

    // Fee statistics
    const feeStats = await query(`
      SELECT 
        COALESCE(SUM(net_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN net_amount ELSE 0 END), 0) as total_collected,
        COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue') THEN net_amount ELSE 0 END), 0) as total_pending
      FROM fee_invoices
    `);

    // Today's attendance
    const todayAttendance = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
      FROM attendance
      WHERE DATE(date) = CURDATE()
    `);

    // Recent activities (last 10)
    const recentActivities = await query(`
      SELECT 
        al.action,
        al.resource,
        al.resource_id,
        al.created_at,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 10
    `);

    return {
      students: studentStats[0],
      teachers: teacherStats[0],
      fees: feeStats[0],
      attendance: todayAttendance[0],
      recentActivities: recentActivities || []
    };
  }

  async getAuditLogs(filters = {}) {
    let sql = `
      SELECT al.*, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.userId) {
      sql += ' AND al.user_id = ?';
      params.push(filters.userId);
    }

    if (filters.action) {
      sql += ' AND al.action = ?';
      params.push(filters.action);
    }

    if (filters.resource) {
      sql += ' AND al.resource = ?';
      params.push(filters.resource);
    }

    if (filters.startDate) {
      sql += ' AND al.created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      sql += ' AND al.created_at <= ?';
      params.push(filters.endDate);
    }

    sql += ' ORDER BY al.created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    return await query(sql, params);
  }

  async createAuditLog(data) {
    const id = uuidv4();
    await query(
      `INSERT INTO audit_logs (id, user_id, action, resource, resource_id, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        data.action,
        data.resource,
        data.resourceId,
        JSON.stringify(data.oldValues),
        JSON.stringify(data.newValues),
        data.ipAddress,
        data.userAgent
      ]
    );
    return id;
  }
}

export default new SettingsService();
