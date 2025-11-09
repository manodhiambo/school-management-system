const { query, transaction } = require('../config/database');
const PasswordService = require('./password.service');
const EmailService = require('../services/email.service');
const logger = require('../utils/logger');
const { z } = require('zod');

const teacherSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  date_of_birth: z.string().date().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  date_of_joining: z.string().date(),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  experience_years: z.coerce.number().min(0).optional(),
  department_id: z.string().uuid().optional(),
  designation: z.string().optional(),
  salary_grade: z.string().optional(),
  account_number: z.string().optional(),
  ifsc_code: z.string().optional(),
  pan_number: z.string().optional(),
  email: z.string().email()
});

class TeacherService {
  static async createTeacher(teacherData) {
    return transaction(async (connection) => {
      const validatedData = teacherSchema.parse(teacherData);
      
      // Generate employee ID
      const [lastTeacher] = await connection.execute(
        'SELECT employee_id FROM teachers ORDER BY created_at DESC LIMIT 1'
      );
      
      let employeeId = 'EMP001';
      if (lastTeacher.length > 0) {
        const lastId = lastTeacher[0].employee_id;
        const num = parseInt(lastId.replace('EMP', '')) + 1;
        employeeId = `EMP${String(num).padStart(3, '0')}`;
      }

      // Create user account
      const tempPassword = PasswordService.generateTemporaryPassword();
      const hashedPassword = await PasswordService.hashPassword(tempPassword);
      
      const [userResult] = await connection.execute(
        'INSERT INTO users (id, email, password_hash, role) VALUES (UUID(), ?, ?, ?)',
        [validatedData.email, hashedPassword, 'teacher']
      );

      const userId = userResult.insertId;

      // Create teacher record
      const [teacherResult] = await connection.execute(
        `INSERT INTO teachers (
          id, user_id, employee_id, first_name, last_name, date_of_birth,
          gender, date_of_joining, qualification, specialization,
          experience_years, department_id, designation, salary_grade,
          account_number, ifsc_code, pan_number
        ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          employeeId,
          validatedData.first_name,
          validatedData.last_name,
          validatedData.date_of_birth || null,
          validatedData.gender || null,
          validatedData.date_of_joining,
          validatedData.qualification || null,
          validatedData.specialization || null,
          validatedData.experience_years || 0,
          validatedData.department_id || null,
          validatedData.designation || null,
          validatedData.salary_grade || null,
          validatedData.account_number || null,
          validatedData.ifsc_code || null,
          validatedData.pan_number || null
        ]
      );

      // Send welcome email
      await EmailService.sendEmail(
        validatedData.email,
        'Teacher Account Created',
        `Your teacher account has been created. Employee ID: ${employeeId}. Temporary password: ${tempPassword}. Please login and change your password.`
      );

      logger.info(`Teacher created: ${employeeId}`);
      
      return {
        teacherId: teacherResult.insertId,
        userId: userId,
        employeeId: employeeId,
        temporaryPassword: tempPassword
      };
    });
  }

  static async getTeachers(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    let whereConditions = ['t.status != ?'];
    let params = ['deleted'];

    if (filters.departmentId) {
      whereConditions.push('t.department_id = ?');
      params.push(filters.departmentId);
    }

    if (filters.status) {
      whereConditions.push('t.status = ?');
      params.push(filters.status);
    }

    if (filters.search) {
      whereConditions.push('(t.first_name LIKE ? OR t.last_name LIKE ? OR t.employee_id LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.join(' AND ');

    const [teachers] = await query(
      `SELECT 
        t.*,
        d.name as department_name,
        c.name as class_name,
        sec.section as section_name
      FROM teachers t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN classes c ON t.class_id = c.id
      LEFT JOIN sections sec ON t.section_id = sec.id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [totalResult] = await query(
      `SELECT COUNT(*) as total FROM teachers t WHERE ${whereClause}`,
      params
    );

    return {
      data: teachers,
      meta: {
        total: totalResult[0].total,
        page,
        limit,
        totalPages: Math.ceil(totalResult[0].total / limit)
      }
    };
  }

  static async getTeacherById(teacherId) {
    const [teachers] = await query(
      `SELECT 
        t.*,
        d.name as department_name,
        c.name as class_name,
        sec.section as section_name
      FROM teachers t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN classes c ON t.class_id = c.id
      LEFT JOIN sections sec ON t.section_id = sec.id
      WHERE t.id = ?`,
      [teacherId]
    );

    if (!teachers.length) {
      throw new Error('Teacher not found');
    }

    // Get assigned class subjects
    const [classSubjects] = await query(
      `SELECT 
        cs.*,
        c.name as class_name,
        sec.section as section_name,
        s.name as subject_name
      FROM class_subjects cs
      JOIN classes c ON cs.class_id = c.id
      JOIN sections sec ON c.section = sec.id
      JOIN subjects s ON cs.subject_id = s.id
      WHERE cs.teacher_id = ?`,
      [teacherId]
    );

    return {
      ...teachers[0],
      assignedSubjects: classSubjects
    };
  }

  static async updateTeacher(teacherId, updateData) {
    return transaction(async (connection) => {
      const validatedData = teacherSchema.partial().parse(updateData);

      const updates = [];
      const params = [];

      Object.entries(validatedData).forEach(([key, value]) => {
        if (value !== undefined) {
          updates.push(`${key} = ?`);
          params.push(value);
        }
      });

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      params.push(teacherId);

      await connection.execute(
        `UPDATE teachers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        params
      );

      logger.info(`Teacher updated: ${teacherId}`);
      
      return { success: true };
    });
  }

  static async assignClass(teacherId, classData) {
    const { class_id, section_id, is_class_teacher } = classData;

    await query(
      `UPDATE teachers SET 
        class_id = ?, 
        section_id = ?, 
        is_class_teacher = ?,
        updated_at = NOW()
      WHERE id = ?`,
      [class_id, section_id, is_class_teacher, teacherId]
    );

    // If class teacher, update the class record
    if (is_class_teacher) {
      await query(
        'UPDATE classes SET class_teacher_id = ? WHERE id = ?',
        [teacherId, class_id]
      );
    }

    logger.info(`Teacher ${teacherId} assigned to class ${class_id}`);
    
    return { success: true };
  }

  static async markAttendance(teacherId, attendanceData) {
    return transaction(async (connection) => {
      const { date, status, check_in_time, check_out_time, location } = attendanceData;

      // Check if already marked
      const [existing] = await connection.execute(
        'SELECT id FROM teacher_attendance WHERE teacher_id = ? AND date = ?',
        [teacherId, date]
      );

      if (existing.length > 0) {
        // Update existing record
        await connection.execute(
          `UPDATE teacher_attendance SET 
            status = ?, 
            check_in_time = ?, 
            check_out_time = ?, 
            location = ?,
            marked_by = ?
          WHERE teacher_id = ? AND date = ?`,
          [
            status,
            check_in_time || null,
            check_out_time || null,
            location ? JSON.stringify(location) : null,
            req.user.id,
            teacherId,
            date
          ]
        );
      } else {
        // Create new record
        await connection.execute(
          `INSERT INTO teacher_attendance 
           (id, teacher_id, date, status, check_in_time, check_out_time, location, marked_by)
           VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
          [
            teacherId,
            date,
            status,
            check_in_time || null,
            check_out_time || null,
            location ? JSON.stringify(location) : null,
            req.user.id
          ]
        );
      }

      logger.info(`Teacher attendance marked: ${teacherId} - ${date}`);
      
      return { success: true };
    });
  }

  static async getTeacherAttendance(teacherId, startDate, endDate) {
    const [attendance] = await query(
      `SELECT * FROM teacher_attendance 
       WHERE teacher_id = ? AND date BETWEEN ? AND ?
       ORDER BY date DESC`,
      [teacherId, startDate, endDate]
    );

    return attendance;
  }

  static async applyLeave(teacherId, leaveData) {
    return transaction(async (connection) => {
      const { leave_type, start_date, end_date, reason } = leaveData;

      const [result] = await connection.execute(
        `INSERT INTO teacher_leaves 
         (id, teacher_id, leave_type, start_date, end_date, reason)
         VALUES (UUID(), ?, ?, ?, ?, ?)`,
        [teacherId, leave_type, start_date, end_date, reason]
      );

      // Update teacher status to on_leave if leave is approved
      await connection.execute(
        'UPDATE teachers SET status = ? WHERE id = ?',
        ['on_leave', teacherId]
      );

      logger.info(`Leave applied for teacher ${teacherId}`);
      
      return { leaveId: result.insertId };
    });
  }

  static async getTeacherLeaves(teacherId) {
    const [leaves] = await query(
      `SELECT * FROM teacher_leaves 
       WHERE teacher_id = ?
       ORDER BY start_date DESC`,
      [teacherId]
    );

    return leaves;
  }

  static async getTeacherSchedule(teacherId) {
    const [schedule] = await query(
      `SELECT 
        t.day_of_week,
        p.name as period_name,
        p.start_time,
        p.end_time,
        s.name as subject_name,
        c.name as class_name,
        sec.section as section_name
      FROM timetable t
      JOIN periods p ON t.period_id = p.id
      JOIN subjects s ON t.subject_id = s.id
      JOIN classes c ON t.class_id = c.id
      JOIN sections sec ON c.section = sec.id
      WHERE t.teacher_id = ?
      ORDER BY 
        FIELD(t.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
        p.start_time`,
      [teacherId]
    );

    return schedule;
  }

  static async getAvailableTeachers(date, periodId) {
    // Get teachers who are not already assigned and not on leave
    const [availableTeachers] = await query(
      `SELECT 
        t.id,
        t.employee_id,
        t.first_name,
        t.last_name,
        s.name as subject_name,
        d.name as department_name
      FROM teachers t
      LEFT JOIN class_subjects cs ON t.id = cs.teacher_id
      LEFT JOIN subjects s ON cs.subject_id = s.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE t.id NOT IN (
        SELECT teacher_id FROM timetable 
        WHERE day_of_week = DAYNAME(?) AND period_id = ?
      )
      AND t.id NOT IN (
        SELECT teacher_id FROM teacher_leaves 
        WHERE ? BETWEEN start_date AND end_date AND status = 'approved'
      )
      AND t.status = 'active'
      ORDER BY t.first_name`,
      [date, periodId, date]
    );

    return availableTeachers;
  }
}

module.exports = TeacherService;
