import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class AttendanceService {
  // ==================== ATTENDANCE SESSIONS ====================
  async createAttendanceSession(sessionData) {
    const { name, startTime, endTime } = sessionData;

    const sessionId = uuidv4();
    await query(
      `INSERT INTO attendance_sessions (id, name, start_time, end_time, is_active)
       VALUES (?, ?, ?, ?, TRUE)`,
      [sessionId, name, startTime, endTime]
    );

    logger.info(`Attendance session created: ${name}`);

    return await query('SELECT * FROM attendance_sessions WHERE id = ?', [sessionId]);
  }

  async getAttendanceSessions() {
    const sessions = await query(
      'SELECT * FROM attendance_sessions WHERE is_active = TRUE ORDER BY start_time'
    );
    return sessions;
  }

  // ==================== MARK ATTENDANCE ====================
  async markAttendance(attendanceData) {
    const {
      studentId,
      date,
      sessionId,
      status,
      checkInTime,
      checkOutTime,
      markedBy,
      method,
      location,
      reason,
      isExcused
    } = attendanceData;

    // Check if attendance already exists
    const existing = await query(
      'SELECT * FROM attendance WHERE student_id = ? AND date = ? AND session_id = ?',
      [studentId, date, sessionId]
    );

    const attendanceId = uuidv4();

    if (existing.length > 0) {
      // Update existing attendance
      await query(
        `UPDATE attendance 
         SET status = ?, check_in_time = ?, check_out_time = ?, 
             marked_by = ?, method = ?, location = ?, reason = ?, is_excused = ?, updated_at = NOW()
         WHERE student_id = ? AND date = ? AND session_id = ?`,
        [
          status, checkInTime, checkOutTime, markedBy, method,
          JSON.stringify(location), reason, isExcused,
          studentId, date, sessionId
        ]
      );

      return await query(
        'SELECT * FROM attendance WHERE student_id = ? AND date = ? AND session_id = ?',
        [studentId, date, sessionId]
      );
    }

    // Insert new attendance
    await query(
      `INSERT INTO attendance (
        id, student_id, date, session_id, status, check_in_time, check_out_time,
        marked_by, method, location, reason, is_excused
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attendanceId, studentId, date, sessionId, status, checkInTime, checkOutTime,
        markedBy, method, JSON.stringify(location), reason, isExcused
      ]
    );

    logger.info(`Attendance marked for student ${studentId} on ${date}`);

    return await query('SELECT * FROM attendance WHERE id = ?', [attendanceId]);
  }

  async bulkMarkAttendance(attendanceList, markedBy, method = 'manual') {
    const results = {
      success: [],
      failed: []
    };

    for (const attendance of attendanceList) {
      try {
        const marked = await this.markAttendance({
          ...attendance,
          markedBy,
          method
        });
        results.success.push(marked[0]);
      } catch (error) {
        results.failed.push({
          data: attendance,
          error: error.message
        });
      }
    }

    logger.info(`Bulk attendance: ${results.success.length} success, ${results.failed.length} failed`);

    return results;
  }

  async markClassAttendance(classId, date, sessionId, attendanceList, markedBy) {
    // Get all students in class
    const students = await query(
      'SELECT id FROM students WHERE class_id = ? AND status = "active"',
      [classId]
    );

    const attendanceData = students.map(student => {
      const studentAttendance = attendanceList.find(a => a.studentId === student.id);
      
      return {
        studentId: student.id,
        date,
        sessionId,
        status: studentAttendance?.status || 'absent',
        checkInTime: studentAttendance?.checkInTime,
        checkOutTime: studentAttendance?.checkOutTime,
        reason: studentAttendance?.reason,
        isExcused: studentAttendance?.isExcused || false
      };
    });

    return await this.bulkMarkAttendance(attendanceData, markedBy);
  }

  // ==================== RETRIEVE ATTENDANCE ====================
  async getAttendance(filters = {}) {
    const {
      studentId,
      classId,
      date,
      startDate,
      endDate,
      status,
      sessionId
    } = filters;

    let whereConditions = [];
    let queryParams = [];

    if (studentId) {
      whereConditions.push('a.student_id = ?');
      queryParams.push(studentId);
    }

    if (classId) {
      whereConditions.push('s.class_id = ?');
      queryParams.push(classId);
    }

    if (date) {
      whereConditions.push('a.date = ?');
      queryParams.push(date);
    }

    if (startDate && endDate) {
      whereConditions.push('a.date BETWEEN ? AND ?');
      queryParams.push(startDate, endDate);
    }

    if (status) {
      whereConditions.push('a.status = ?');
      queryParams.push(status);
    }

    if (sessionId) {
      whereConditions.push('a.session_id = ?');
      queryParams.push(sessionId);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const attendance = await query(
      `SELECT 
        a.*,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.roll_number,
        c.name as class_name,
        c.section as section_name,
        ases.name as session_name,
        t.first_name as marked_by_first_name,
        t.last_name as marked_by_last_name
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN attendance_sessions ases ON a.session_id = ases.id
       LEFT JOIN teachers t ON a.marked_by = t.id
       ${whereClause}
       ORDER BY a.date DESC, s.roll_number`,
      queryParams
    );

    return attendance;
  }

  async getClassAttendanceByDate(classId, date, sessionId = null) {
    let sessionCondition = sessionId ? 'AND a.session_id = ?' : '';
    let queryParams = sessionId ? [classId, date, sessionId] : [classId, date];

    const attendance = await query(
      `SELECT 
        s.id as student_id,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.roll_number,
        s.profile_photo_url,
        a.status,
        a.check_in_time,
        a.check_out_time,
        a.reason,
        a.is_excused
       FROM students s
       LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ? ${sessionCondition}
       WHERE s.class_id = ? AND s.status = 'active'
       ORDER BY s.roll_number`,
      sessionId ? [date, sessionId, classId] : [date, classId]
    );

    // Add default status for students without attendance
    const result = attendance.map(student => ({
      ...student,
      status: student.status || 'unmarked'
    }));

    return result;
  }

  // ==================== ATTENDANCE STATISTICS ====================
  async getAttendanceStatistics(filters = {}) {
    const { studentId, classId, startDate, endDate, month } = filters;

    let whereConditions = [];
    let queryParams = [];

    if (studentId) {
      whereConditions.push('a.student_id = ?');
      queryParams.push(studentId);
    }

    if (classId) {
      whereConditions.push('s.class_id = ?');
      queryParams.push(classId);
    }

    if (startDate && endDate) {
      whereConditions.push('a.date BETWEEN ? AND ?');
      queryParams.push(startDate, endDate);
    } else if (month) {
      whereConditions.push('DATE_FORMAT(a.date, "%Y-%m") = ?');
      queryParams.push(month);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const stats = await query(
      `SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN a.status = 'half_day' THEN 1 ELSE 0 END) as half_days,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_days,
        SUM(CASE WHEN a.status = 'holiday' THEN 1 ELSE 0 END) as holidays,
        ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / 
              NULLIF(COUNT(*) - SUM(CASE WHEN a.status = 'holiday' THEN 1 ELSE 0 END), 0), 2) as attendance_percentage
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       ${whereClause}`,
      queryParams
    );

    return stats[0];
  }

  async getStudentAttendanceSummary(studentId, month) {
    const summary = await query(
      `SELECT * FROM attendance_summary 
       WHERE student_id = ? AND month = ?`,
      [studentId, month]
    );

    if (summary.length === 0) {
      // Calculate and create summary
      return await this.updateAttendanceSummary(studentId, month);
    }

    return summary[0];
  }

  async updateAttendanceSummary(studentId, month) {
    const stats = await this.getAttendanceStatistics({
      studentId,
      month
    });

    const summaryId = uuidv4();

    // Check if summary exists
    const existing = await query(
      'SELECT * FROM attendance_summary WHERE student_id = ? AND month = ?',
      [studentId, month]
    );

    if (existing.length > 0) {
      await query(
        `UPDATE attendance_summary 
         SET total_days = ?, present_days = ?, absent_days = ?, 
             late_days = ?, half_days = ?, excused_days = ?,
             attendance_percentage = ?, updated_at = NOW()
         WHERE student_id = ? AND month = ?`,
        [
          stats.total_days, stats.present_days, stats.absent_days,
          stats.late_days, stats.half_days, stats.excused_days,
          stats.attendance_percentage, studentId, month
        ]
      );
    } else {
      await query(
        `INSERT INTO attendance_summary (
          id, student_id, month, total_days, present_days, absent_days,
          late_days, half_days, excused_days, attendance_percentage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          summaryId, studentId, month, stats.total_days, stats.present_days,
          stats.absent_days, stats.late_days, stats.half_days,
          stats.excused_days, stats.attendance_percentage
        ]
      );
    }

    return await query(
      'SELECT * FROM attendance_summary WHERE student_id = ? AND month = ?',
      [studentId, month]
    );
  }

  // ==================== DEFAULTERS & REPORTS ====================
  async getDefaulters(classId, threshold = 75, startDate, endDate) {
    const students = await query(
      `SELECT 
        s.id,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.roll_number,
        COUNT(a.id) as total_days,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
        ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id), 2) as attendance_percentage,
        p.first_name as parent_first_name,
        p.last_name as parent_last_name,
        p.phone_primary as parent_phone
       FROM students s
       LEFT JOIN attendance a ON s.id = a.student_id 
         AND a.date BETWEEN ? AND ?
         AND a.status != 'holiday'
       LEFT JOIN parents p ON s.parent_id = p.id
       WHERE s.class_id = ? AND s.status = 'active'
       GROUP BY s.id
       HAVING attendance_percentage < ?
       ORDER BY attendance_percentage ASC`,
      [startDate, endDate, classId, threshold]
    );

    return students;
  }

  async getAttendanceReport(filters = {}) {
    const {
      classId,
      startDate,
      endDate,
      reportType = 'daily' // daily, weekly, monthly
    } = filters;

    let groupBy = '';
    let dateFormat = '';

    switch (reportType) {
      case 'daily':
        groupBy = 'a.date';
        dateFormat = 'a.date';
        break;
      case 'weekly':
        groupBy = 'YEARWEEK(a.date, 1)';
        dateFormat = 'YEARWEEK(a.date, 1)';
        break;
      case 'monthly':
        groupBy = 'DATE_FORMAT(a.date, "%Y-%m")';
        dateFormat = 'DATE_FORMAT(a.date, "%Y-%m")';
        break;
    }

    const report = await query(
      `SELECT 
        ${dateFormat} as period,
        COUNT(DISTINCT s.id) as total_students,
        COUNT(a.id) as total_records,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
        ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id), 2) as attendance_percentage
       FROM students s
       LEFT JOIN attendance a ON s.id = a.student_id
       WHERE s.class_id = ? AND a.date BETWEEN ? AND ?
       GROUP BY ${groupBy}
       ORDER BY period`,
      [classId, startDate, endDate]
    );

    return report;
  }

  // ==================== NOTIFICATIONS ====================
  async notifyParentsOfAbsence(date) {
    const absentStudents = await query(
      `SELECT 
        s.id as student_id,
        s.first_name,
        s.last_name,
        s.admission_number,
        c.name as class_name,
        c.section as section_name,
        p.id as parent_id,
        p.first_name as parent_first_name,
        p.phone_primary,
        u.id as user_id
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       JOIN classes c ON s.class_id = c.id
       LEFT JOIN parents p ON s.parent_id = p.id
       LEFT JOIN users u ON p.user_id = u.id
       WHERE a.date = ? 
         AND a.status = 'absent' 
         AND a.parent_notified = FALSE
         AND a.is_excused = FALSE`,
      [date]
    );

    // Create notifications
    for (const student of absentStudents) {
      if (student.user_id) {
        const notificationId = uuidv4();
        await query(
          `INSERT INTO notifications (id, user_id, title, message, type, data)
           VALUES (?, ?, ?, ?, 'attendance', ?)`,
          [
            notificationId,
            student.user_id,
            'Student Absence Alert',
            `${student.first_name} ${student.last_name} was absent from ${student.class_name}-${student.section_name} on ${date}`,
            JSON.stringify({
              studentId: student.student_id,
              date,
              status: 'absent'
            })
          ]
        );

        // Mark as notified
        await query(
          'UPDATE attendance SET parent_notified = TRUE, notified_at = NOW() WHERE student_id = ? AND date = ?',
          [student.student_id, date]
        );
      }
    }

    logger.info(`Absence notifications sent for ${absentStudents.length} students`);

    return {
      notified: absentStudents.length,
      students: absentStudents
    };
  }
}

export default new AttendanceService();
