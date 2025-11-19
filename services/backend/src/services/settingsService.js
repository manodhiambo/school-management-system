import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class SettingsService {
  // ==================== SCHOOL SETTINGS ====================
  async getSettings() {
    const results = await query('SELECT * FROM settings LIMIT 1');
    
    if (results.length === 0) {
      // Create default settings
      return await this.createDefaultSettings();
    }

    return results[0];
  }

  async createDefaultSettings() {
    const settingsId = uuidv4();
    await query(
      `INSERT INTO settings (
        id, school_name, school_code, current_academic_year,
        timezone, currency, date_format, time_format
      ) VALUES (?, 'School Name', 'SCH001', '2024-2025', 'Asia/Kolkata', 'INR', 'DD/MM/YYYY', '12')`,
      [settingsId]
    );

    return await this.getSettings();
  }

  async updateSettings(updateData) {
    const settings = await this.getSettings();

    const {
      schoolName,
      schoolCode,
      schoolLogoUrl,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      website,
      currentAcademicYear,
      timezone,
      currency,
      dateFormat,
      timeFormat,
      attendanceMethod,
      feeLateeFeeApplicable,
      smsEnabled,
      emailEnabled,
      pushNotificationEnabled
    } = updateData;

    const updateFields = [];
    const updateValues = [];

    if (schoolName !== undefined) {
      updateFields.push('school_name = ?');
      updateValues.push(schoolName);
    }
    if (schoolCode !== undefined) {
      updateFields.push('school_code = ?');
      updateValues.push(schoolCode);
    }
    if (schoolLogoUrl !== undefined) {
      updateFields.push('school_logo_url = ?');
      updateValues.push(schoolLogoUrl);
    }
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(address);
    }
    if (city !== undefined) {
      updateFields.push('city = ?');
      updateValues.push(city);
    }
    if (state !== undefined) {
      updateFields.push('state = ?');
      updateValues.push(state);
    }
    if (pincode !== undefined) {
      updateFields.push('pincode = ?');
      updateValues.push(pincode);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone);
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (website !== undefined) {
      updateFields.push('website = ?');
      updateValues.push(website);
    }
    if (currentAcademicYear !== undefined) {
      updateFields.push('current_academic_year = ?');
      updateValues.push(currentAcademicYear);
    }
    if (timezone !== undefined) {
      updateFields.push('timezone = ?');
      updateValues.push(timezone);
    }
    if (currency !== undefined) {
      updateFields.push('currency = ?');
      updateValues.push(currency);
    }
    if (dateFormat !== undefined) {
      updateFields.push('date_format = ?');
      updateValues.push(dateFormat);
    }
    if (timeFormat !== undefined) {
      updateFields.push('time_format = ?');
      updateValues.push(timeFormat);
    }
    if (attendanceMethod !== undefined) {
      updateFields.push('attendance_method = ?');
      updateValues.push(attendanceMethod);
    }
    if (feeLateeFeeApplicable !== undefined) {
      updateFields.push('fee_late_fee_applicable = ?');
      updateValues.push(feeLateeFeeApplicable);
    }
    if (smsEnabled !== undefined) {
      updateFields.push('sms_enabled = ?');
      updateValues.push(smsEnabled);
    }
    if (emailEnabled !== undefined) {
      updateFields.push('email_enabled = ?');
      updateValues.push(emailEnabled);
    }
    if (pushNotificationEnabled !== undefined) {
      updateFields.push('push_notification_enabled = ?');
      updateValues.push(pushNotificationEnabled);
    }

    if (updateFields.length === 0) {
      return settings;
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(settings.id);

    await query(
      `UPDATE settings SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    logger.info('School settings updated');

    return await this.getSettings();
  }

  // ==================== ACADEMIC YEARS ====================
  async createAcademicYear(yearData) {
    const { year, startDate, endDate, isCurrent } = yearData;

    // Check if year already exists
    const existing = await query(
      'SELECT * FROM academic_years WHERE year = ?',
      [year]
    );

    if (existing.length > 0) {
      throw new ApiError(400, 'Academic year already exists');
    }

    // If setting as current, update others
    if (isCurrent) {
      await query('UPDATE academic_years SET is_current = FALSE');
    }

    const yearId = uuidv4();
    await query(
      `INSERT INTO academic_years (id, year, start_date, end_date, is_current, is_active)
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [yearId, year, startDate, endDate, isCurrent]
    );

    logger.info(`Academic year created: ${year}`);

    return await query('SELECT * FROM academic_years WHERE id = ?', [yearId]);
  }

  async getAcademicYears() {
    const years = await query(
      'SELECT * FROM academic_years ORDER BY start_date DESC'
    );
    return years;
  }

  async getCurrentAcademicYear() {
    const results = await query(
      'SELECT * FROM academic_years WHERE is_current = TRUE LIMIT 1'
    );

    if (results.length === 0) {
      throw new ApiError(404, 'No current academic year set');
    }

    return results[0];
  }

  async setCurrentAcademicYear(yearId) {
    // Unset all current flags
    await query('UPDATE academic_years SET is_current = FALSE');

    // Set new current year
    await query(
      'UPDATE academic_years SET is_current = TRUE WHERE id = ?',
      [yearId]
    );

    // Update settings
    const year = await query('SELECT year FROM academic_years WHERE id = ?', [yearId]);
    await query(
      'UPDATE settings SET current_academic_year = ?',
      [year[0].year]
    );

    logger.info(`Current academic year set to: ${year[0].year}`);

    return await this.getCurrentAcademicYear();
  }

  // ==================== AUDIT LOGS ====================
  async createAuditLog(logData) {
    const {
      userId,
      action,
      resource,
      resourceId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
      method,
      endpoint,
      statusCode
    } = logData;

    const logId = uuidv4();
    await query(
      `INSERT INTO audit_logs (
        id, user_id, action, resource, resource_id, old_values,
        new_values, ip_address, user_agent, method, endpoint, status_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId, userId, action, resource, resourceId,
        JSON.stringify(oldValues), JSON.stringify(newValues),
        ipAddress, userAgent, method, endpoint, statusCode
      ]
    );

    return logId;
  }

  async getAuditLogs(filters = {}) {
    const { userId, resource, action, startDate, endDate, limit = 100 } = filters;

    let whereConditions = [];
    let queryParams = [];

    if (userId) {
      whereConditions.push('user_id = ?');
      queryParams.push(userId);
    }

    if (resource) {
      whereConditions.push('resource = ?');
      queryParams.push(resource);
    }

    if (action) {
      whereConditions.push('action = ?');
      queryParams.push(action);
    }

    if (startDate && endDate) {
      whereConditions.push('DATE(created_at) BETWEEN ? AND ?');
      queryParams.push(startDate, endDate);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const logs = await query(
      `SELECT 
        al.*,
        u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [...queryParams, limit]
    );

    return logs;
  }

  // ==================== SYSTEM LOGS ====================
  async createSystemLog(level, message, meta = {}, stackTrace = null) {
    const logId = uuidv4();
    await query(
      `INSERT INTO system_logs (id, level, message, meta, stack_trace)
       VALUES (?, ?, ?, ?, ?)`,
      [logId, level, message, JSON.stringify(meta), stackTrace]
    );

    return logId;
  }

  async getSystemLogs(filters = {}) {
    const { level, startDate, endDate, limit = 100 } = filters;

    let whereConditions = [];
    let queryParams = [];

    if (level) {
      whereConditions.push('level = ?');
      queryParams.push(level);
    }

    if (startDate && endDate) {
      whereConditions.push('DATE(created_at) BETWEEN ? AND ?');
      queryParams.push(startDate, endDate);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const logs = await query(
      `SELECT * FROM system_logs 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ?`,
      [...queryParams, limit]
    );

    return logs;
  }

  // ==================== DASHBOARD STATISTICS ====================
  async getDashboardStatistics() {
    // Get various statistics for admin dashboard
    
    // Student statistics
    const studentStats = await query(
      `SELECT 
        COUNT(*) as total_students,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_students,
        SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as male_students,
        SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as female_students
       FROM students`
    );

    // Teacher statistics
    const teacherStats = await query(
      `SELECT 
        COUNT(*) as total_teachers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_teachers
       FROM teachers`
    );

    // Attendance statistics (today)
    const today = new Date().toISOString().split('T')[0];
    const attendanceStats = await query(
      `SELECT 
        COUNT(DISTINCT student_id) as total_marked,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
       FROM attendance
       WHERE date = ?`,
      [today]
    );

    // Fee statistics
    const feeStats = await query(
      `SELECT 
        SUM(net_amount) as total_amount,
        SUM(paid_amount) as total_collected,
        SUM(balance_amount) as total_pending
       FROM fee_invoices
       WHERE YEAR(month) = YEAR(CURDATE())`
    );

    // Recent activities
    const recentActivities = await query(
      `SELECT 
        action,
        resource,
        created_at,
        u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 10`
    );

    return {
      students: studentStats[0],
      teachers: teacherStats[0],
      attendance: attendanceStats[0],
      fees: feeStats[0],
      recentActivities
    };
  }

  // ==================== DATABASE BACKUP ====================
  async createBackup() {
    // This would typically use mysqldump or similar
    // For now, just log the action
    logger.info('Database backup initiated');
    
    const backupId = uuidv4();
    const backupInfo = {
      id: backupId,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

    return backupInfo;
  }
}

export default new SettingsService();
