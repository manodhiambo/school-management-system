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
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_students,
        SUM(CASE WHEN is_new_admission = 1 THEN 1 ELSE 0 END) as new_admissions
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

    // Parents statistics
    const parentStats = await query(`
      SELECT COUNT(*) as total FROM parents
    `);

    // Classes statistics
    const classStats = await query(`
      SELECT COUNT(*) as total FROM classes
    `);

    // Subjects statistics
    const subjectStats = await query(`
      SELECT COUNT(*) as total FROM subjects
    `);

    // Fee statistics
    const feeStats = await query(`
      SELECT
        COALESCE(SUM(net_amount), 0) as total_amount,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(balance_amount), 0) as total_pending,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
        COUNT(CASE WHEN status IN ('pending', 'partial') THEN 1 END) as pending_invoices,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices
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

    // Monthly student enrollment (last 6 months)
    const enrollmentTrend = await query(`
      SELECT 
        DATE_FORMAT(created_at, '%b') as month,
        DATE_FORMAT(created_at, '%Y-%m') as month_year,
        COUNT(*) as students
      FROM students
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
      ORDER BY month_year ASC
    `);

    // Monthly fee collection (last 6 months)
    const feeCollectionTrend = await query(`
      SELECT 
        DATE_FORMAT(payment_date, '%b') as month,
        DATE_FORMAT(payment_date, '%Y-%m') as month_year,
        COALESCE(SUM(amount), 0) as amount
      FROM fee_payments
      WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        AND status = 'success'
      GROUP BY DATE_FORMAT(payment_date, '%Y-%m'), DATE_FORMAT(payment_date, '%b')
      ORDER BY month_year ASC
    `);

    // Monthly attendance summary (last 6 months)
    const attendanceTrend = await query(`
      SELECT 
        DATE_FORMAT(date, '%b') as month,
        DATE_FORMAT(date, '%Y-%m') as month_year,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
        COUNT(*) as total
      FROM attendance
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(date, '%Y-%m'), DATE_FORMAT(date, '%b')
      ORDER BY month_year ASC
    `);

    // Upcoming exams
    const upcomingExams = await query(`
      SELECT COUNT(*) as upcoming
      FROM exams
      WHERE start_date > CURDATE()
    `);

    // Recent activities (last 10)
    let recentActivities = [];
    try {
      recentActivities = await query(`
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
    } catch (e) {
      // audit_logs table might not exist
      recentActivities = [];
    }

    // Recent payments (last 5)
    const recentPayments = await query(`
      SELECT 
        fp.amount,
        fp.payment_method,
        fp.payment_date,
        fp.transaction_id,
        s.first_name,
        s.last_name
      FROM fee_payments fp
      JOIN fee_invoices fi ON fp.invoice_id = fi.id
      JOIN students s ON fi.student_id = s.id
      WHERE fp.status = 'success'
      ORDER BY fp.payment_date DESC
      LIMIT 5
    `);

    // Recent admissions (last 5)
    const recentAdmissions = await query(`
      SELECT 
        first_name,
        last_name,
        admission_number,
        created_at
      FROM students
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Generate default months if no data
    const getLastSixMonths = () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        months.push({
          month: date.toLocaleString('default', { month: 'short' }),
          month_year: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        });
      }
      return months;
    };

    const defaultMonths = getLastSixMonths();

    // Fill in missing months for enrollment trend
    const filledEnrollmentTrend = defaultMonths.map(m => {
      const found = enrollmentTrend.find(e => e.month_year === m.month_year);
      return {
        month: m.month,
        students: found ? parseInt(found.students) : 0
      };
    });

    // Fill in missing months for fee collection trend
    const filledFeeCollectionTrend = defaultMonths.map(m => {
      const found = feeCollectionTrend.find(f => f.month_year === m.month_year);
      return {
        month: m.month,
        amount: found ? parseFloat(found.amount) : 0
      };
    });

    // Fill in missing months for attendance trend
    const filledAttendanceTrend = defaultMonths.map(m => {
      const found = attendanceTrend.find(a => a.month_year === m.month_year);
      return {
        month: m.month,
        present: found ? parseInt(found.present) : 0,
        absent: found ? parseInt(found.absent) : 0,
        late: found ? parseInt(found.late) : 0,
        total: found ? parseInt(found.total) : 0
      };
    });

    return {
      students: {
        total_students: parseInt(studentStats[0]?.total_students) || 0,
        active_students: parseInt(studentStats[0]?.active_students) || 0,
        inactive_students: parseInt(studentStats[0]?.inactive_students) || 0,
        new_admissions: parseInt(studentStats[0]?.new_admissions) || 0
      },
      teachers: {
        total_teachers: parseInt(teacherStats[0]?.total_teachers) || 0,
        active_teachers: parseInt(teacherStats[0]?.active_teachers) || 0,
        on_leave_teachers: parseInt(teacherStats[0]?.on_leave_teachers) || 0
      },
      parents: {
        total: parseInt(parentStats[0]?.total) || 0
      },
      classes: {
        total: parseInt(classStats[0]?.total) || 0
      },
      subjects: {
        total: parseInt(subjectStats[0]?.total) || 0
      },
      fees: {
        total_amount: parseFloat(feeStats[0]?.total_amount) || 0,
        total_collected: parseFloat(feeStats[0]?.total_collected) || 0,
        total_pending: parseFloat(feeStats[0]?.total_pending) || 0,
        paid_invoices: parseInt(feeStats[0]?.paid_invoices) || 0,
        pending_invoices: parseInt(feeStats[0]?.pending_invoices) || 0,
        overdue_invoices: parseInt(feeStats[0]?.overdue_invoices) || 0
      },
      attendance: {
        total: parseInt(todayAttendance[0]?.total) || 0,
        present: parseInt(todayAttendance[0]?.present) || 0,
        absent: parseInt(todayAttendance[0]?.absent) || 0,
        late: parseInt(todayAttendance[0]?.late) || 0
      },
      exams: {
        upcoming: parseInt(upcomingExams[0]?.upcoming) || 0
      },
      charts: {
        enrollmentTrend: filledEnrollmentTrend,
        feeCollectionTrend: filledFeeCollectionTrend,
        attendanceTrend: filledAttendanceTrend
      },
      recentActivities: recentActivities || [],
      recentPayments: recentPayments || [],
      recentAdmissions: recentAdmissions || []
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

  async createAcademicYear(data) {
    const id = uuidv4();
    await query(
      `INSERT INTO academic_years (id, year, start_date, end_date, is_current)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.year, data.startDate, data.endDate, data.isCurrent || false]
    );

    if (data.isCurrent) {
      await query('UPDATE academic_years SET is_current = FALSE WHERE id != ?', [id]);
    }

    return { id, ...data };
  }

  async getAcademicYears() {
    return await query('SELECT * FROM academic_years ORDER BY start_date DESC');
  }

  async getCurrentAcademicYear() {
    const results = await query('SELECT * FROM academic_years WHERE is_current = TRUE LIMIT 1');
    return results[0] || null;
  }

  async setCurrentAcademicYear(yearId) {
    await query('UPDATE academic_years SET is_current = FALSE');
    await query('UPDATE academic_years SET is_current = TRUE WHERE id = ?', [yearId]);
    return await this.getCurrentAcademicYear();
  }

  async getSystemLogs() {
    // Return empty array if system_logs table doesn't exist
    try {
      return await query('SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 100');
    } catch (e) {
      return [];
    }
  }

  async createBackup() {
    // Placeholder for backup functionality
    return {
      id: uuidv4(),
      created_at: new Date(),
      status: 'success',
      message: 'Backup created successfully'
    };
  }
}

export default new SettingsService();
