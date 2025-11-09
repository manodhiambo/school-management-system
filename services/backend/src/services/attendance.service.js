const { query, transaction } = require('../config/database');
const EmailService = require('../services/email.service');
const SMSService = require('../services/sms.service');
const logger = require('../utils/logger');
const { z } = require('zod');

const attendanceSchema = z.object({
  student_id: z.string().uuid(),
  date: z.string().date(),
  status: z.enum(['present', 'absent', 'late', 'half_day']),
  check_in_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  check_out_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  reason: z.string().optional(),
  is_excused: z.boolean().default(false)
});

const bulkAttendanceSchema = z.object({
  class_id: z.string().uuid(),
  date: z.string().date(),
  attendance: z.array(attendanceSchema)
});

class AttendanceService {
  static async markAttendance(attendanceData, markedBy) {
    return transaction(async (connection) => {
      const validatedData = attendanceSchema.parse(attendanceData);

      // Check if already marked
      const [existing] = await connection.execute(
        'SELECT id FROM attendance WHERE student_id = ? AND date = ?',
        [validatedData.student_id, validatedData.date]
      );

      if (existing.length > 0) {
        // Update existing record
        await connection.execute(
          `UPDATE attendance SET 
            status = ?, 
            check_in_time = ?, 
            check_out_time = ?, 
            reason = ?, 
            is_excused = ?, 
            marked_by = ?
          WHERE student_id = ? AND date = ?`,
          [
            validatedData.status,
            validatedData.check_in_time || null,
            validatedData.check_out_time || null,
            validatedData.reason || null,
            validatedData.is_excused,
            markedBy,
            validatedData.student_id,
            validatedData.date
          ]
        );
      } else {
        // Create new record
        await connection.execute(
          `INSERT INTO attendance 
           (id, student_id, date, status, check_in_time, check_out_time, reason, is_excused, marked_by)
           VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            validatedData.student_id,
            validatedData.date,
            validatedData.status,
            validatedData.check_in_time || null,
            validatedData.check_out_time || null,
            validatedData.reason || null,
            validatedData.is_excused,
            markedBy
          ]
        );
      }

      // Send notification to parent if absent
      if (validatedData.status === 'absent' && !validatedData.is_excused) {
        this.notifyParentOfAbsence(validatedData.student_id, validatedData.date);
      }

      logger.info(`Attendance marked: ${validatedData.student_id} - ${validatedData.date}`);
      
      return { success: true };
    });
  }

  static async markBulkAttendance(bulkData, markedBy) {
    return transaction(async (connection) => {
      const validatedData = bulkAttendanceSchema.parse(bulkData);
      let successCount = 0;

      for (const attendance of validatedData.attendance) {
        try {
          // Check if already marked
          const [existing] = await connection.execute(
            'SELECT id FROM attendance WHERE student_id = ? AND date = ?',
            [attendance.student_id, validatedData.date]
          );

          if (existing.length > 0) {
            await connection.execute(
              `UPDATE attendance SET 
                status = ?, 
                check_in_time = ?, 
                check_out_time = ?, 
                reason = ?, 
                is_excused = ?, 
                marked_by = ?
              WHERE student_id = ? AND date = ?`,
              [
                attendance.status,
                attendance.check_in_time || null,
                attendance.check_out_time || null,
                attendance.reason || null,
                attendance.is_excused,
                markedBy,
                attendance.student_id,
                validatedData.date
              ]
            );
          } else {
            await connection.execute(
              `INSERT INTO attendance 
               (id, student_id, date, status, check_in_time, check_out_time, reason, is_excused, marked_by)
               VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                attendance.student_id,
                validatedData.date,
                attendance.status,
                attendance.check_in_time || null,
                attendance.check_out_time || null,
                attendance.reason || null,
                attendance.is_excused,
                markedBy
              ]
            );
          }

          // Send notification for absences
          if (attendance.status === 'absent' && !attendance.is_excused) {
            this.notifyParentOfAbsence(attendance.student_id, validatedData.date);
          }

          successCount++;
        } catch (error) {
          logger.error(`Failed to mark attendance for student ${attendance.student_id}:`, error);
        }
      }

      logger.info(`Bulk attendance marked: ${successCount} students for ${validatedData.date}`);
      
      return { success: true, successCount };
    });
  }

  static async getClassAttendance(classId, date) {
    const [attendance] = await query(
      `SELECT 
        a.*,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        s.admission_number,
        s.roll_number
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE s.class_id = ? AND a.date = ?
      ORDER BY s.roll_number, s.first_name`,
      [classId, date]
    );

    return attendance;
  }

  static async getStudentMonthlyAttendance(studentId, month) {
    // month format: YYYY-MM
    const [attendance] = await query(
      `SELECT * FROM attendance 
       WHERE student_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?
       ORDER BY date`,
      [studentId, month]
    );

    const [summary] = await query(
      `SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END) as half_day_days
      FROM attendance 
      WHERE student_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?`,
      [studentId, month]
    );

    return {
      details: attendance,
      summary: summary[0]
    };
  }

  static async getStudentAttendanceStats(studentId) {
    const [stats] = await query(
      `SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
        ROUND(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as attendance_percentage
      FROM attendance 
      WHERE student_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)`,
      [studentId]
    );

    return stats[0];
  }

  static async importBiometricAttendance(data) {
    let successCount = 0;
    const errors = [];

    for (const record of data) {
      try {
        const { student_admission_number, date, time } = record;
        
        // Get student ID
        const [student] = await query(
          'SELECT id FROM students WHERE admission_number = ?',
          [student_admission_number]
        );

        if (!student.length) {
          throw new Error(`Student not found: ${student_admission_number}`);
        }

        // Determine status (present if any record exists for the day)
        await this.markAttendance({
          student_id: student[0].id,
          date: date,
          status: 'present',
          check_in_time: time
        }, 'biometric_system');

        successCount++;
      } catch (error) {
        errors.push({ record, error: error.message });
      }
    }

    logger.info(`Biometric attendance imported: ${successCount} successful, ${errors.length} errors`);

    return {
      success: true,
      successCount,
      errorCount: errors.length,
      errors
    };
  }

  static async generateAttendanceReport(filters) {
    let whereConditions = [];
    let params = [];

    if (filters.classId) {
      whereConditions.push('s.class_id = ?');
      params.push(filters.classId);
    }

    if (filters.startDate && filters.endDate) {
      whereConditions.push('a.date BETWEEN ? AND ?');
      params.push(filters.startDate, filters.endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [report] = await query(
      `SELECT 
        s.admission_number,
        s.first_name,
        s.last_name,
        s.class_id,
        COUNT(*) as total_days,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days,
        ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as attendance_percentage
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.first_name`,
      params
    );

    return report;
  }

  static async notifyParentOfAbsence(studentId, date) {
    try {
      const [studentAndParent] = await query(
        `SELECT 
          s.first_name as student_first_name,
          s.last_name as student_last_name,
          p.phone_primary,
          u.email
        FROM students s
        JOIN parent_students ps ON s.id = ps.student_id
        JOIN parents p ON ps.parent_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE s.id = ? AND ps.is_primary_contact = TRUE`,
        [studentId]
      );

      if (studentAndParent.length > 0) {
        const { student_first_name, student_last_name, phone_primary, email } = studentAndParent[0];

        // Send SMS
        if (phone_primary) {
          await SMSService.sendAttendanceSMS(
            phone_primary,
            `${student_first_name} ${student_last_name}`,
            date,
            'absent'
          );
        }

        // Send email
        if (email) {
          await EmailService.sendAttendanceNotification(
            email,
            `${student_first_name} ${student_last_name}`,
            date,
            'absent'
          );
        }
      }
    } catch (error) {
      logger.error(`Failed to notify parent of absence for student ${studentId}:`, error);
    }
  }
}

module.exports = AttendanceService;
