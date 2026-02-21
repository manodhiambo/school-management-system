import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class TeacherService {
  async createTeacher(data, tenantId) {
    const {
      email, password, firstName, lastName, employeeId,
      dateOfBirth, gender, phonePrimary, phoneSecondary,
      address, city, state, pincode, qualification,
      experienceYears, specialization, joiningDate, salary
    } = data;

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.length > 0) {
      throw new ApiError(400, 'Email already registered');
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password || 'teacher123', 10);

    await query(
      `INSERT INTO users (id, email, password, role, tenant_id, is_active, is_verified)
       VALUES ($1, $2, $3, 'teacher', $4, true, true)`,
      [userId, email, hashedPassword, tenantId]
    );

    const teacherId = uuidv4();
    await query(
      `INSERT INTO teachers (
        id, user_id, employee_id, first_name, last_name,
        date_of_birth, gender, phone_primary, phone_secondary,
        address, city, state, pincode, qualification,
        experience_years, specialization, joining_date, salary, tenant_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'active')`,
      [
        teacherId, userId, employeeId || null, firstName, lastName,
        dateOfBirth || null, gender || null, phonePrimary || null, phoneSecondary || null,
        address || null, city || null, state || null, pincode || null, qualification || null,
        experienceYears || 0, specialization || null, joiningDate || null, salary || null, tenantId
      ]
    );

    logger.info(`Teacher created: ${firstName} ${lastName}`);
    return await this.getTeacherById(teacherId, tenantId);
  }

  async getTeachers(filters = {}, pagination = {}, tenantId) {
    const { search, status, specialization } = filters;
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT t.*, u.email, u.is_active as user_active
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (search) {
      sql += ` AND (t.first_name ILIKE $${paramIndex} OR t.last_name ILIKE $${paramIndex} OR t.employee_id ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      sql += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    sql += ' ORDER BY t.created_at DESC';
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const teachers = await query(sql, params);

    return {
      teachers,
      pagination: { page, limit }
    };
  }

  async getTeacherById(id, tenantId) {
    const results = await query(
      `SELECT t.*, u.email, u.is_active as user_active
       FROM teachers t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = $1${tenantId ? ' AND t.tenant_id = $2' : ''}`,
      tenantId ? [id, tenantId] : [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Teacher not found');
    }

    return results[0];
  }

  async updateTeacher(id, data, tenantId) {
    await this.getTeacherById(id, tenantId);

    const updates = [];
    const values = [];
    let paramIndex = 1;

    const fieldMap = {
      firstName: 'first_name',
      lastName: 'last_name',
      employeeId: 'employee_id',
      dateOfBirth: 'date_of_birth',
      gender: 'gender',
      phonePrimary: 'phone_primary',
      phoneSecondary: 'phone_secondary',
      address: 'address',
      city: 'city',
      state: 'state',
      pincode: 'pincode',
      qualification: 'qualification',
      experienceYears: 'experience_years',
      specialization: 'specialization',
      salary: 'salary',
      status: 'status'
    };

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && fieldMap[key]) {
        updates.push(`${fieldMap[key]} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    });

    if (updates.length > 0) {
      values.push(id);
      await query(
        `UPDATE teachers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
        values
      );
    }

    return await this.getTeacherById(id, tenantId);
  }

  async deleteTeacher(id, tenantId) {
    const teacher = await this.getTeacherById(id, tenantId);

    if (teacher.user_id) {
      await query('DELETE FROM users WHERE id = $1', [teacher.user_id]);
    }

    await query('DELETE FROM teachers WHERE id = $1', [id]);
    return { message: 'Teacher deleted successfully' };
  }

  async getStatistics(tenantId) {
    const stats = await query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as on_leave,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive
      FROM teachers
      WHERE tenant_id = $1
    `, [tenantId]);
    return stats[0];
  }

  async getTeacherClasses(id, tenantId) {
    const teacherResult = await query(
      'SELECT id FROM teachers WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
      [id, tenantId]
    );

    if (teacherResult.length === 0) {
      return [];
    }

    const teacherId = teacherResult[0].id;

    const classes = await query(`
      SELECT DISTINCT c.*,
        (SELECT COUNT(*)::int FROM students s WHERE s.class_id = c.id AND s.tenant_id = $2) as student_count
      FROM classes c
      JOIN timetable tt ON tt.class_id = c.id
      WHERE tt.teacher_id = $1
        AND tt.is_active = true
        AND c.is_active = true
        AND c.tenant_id = $2
      ORDER BY c.name, c.section
    `, [teacherId, tenantId]);

    return classes;
  }

  async getTeacherTimetable(id, tenantId) {
    const teacherResult = await query(
      'SELECT id FROM teachers WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
      [id, tenantId]
    );

    if (teacherResult.length === 0) {
      return [];
    }

    const teacherId = teacherResult[0].id;

    const timetable = await query(`
      SELECT tt.*,
        c.name as class_name, c.section,
        s.name as subject_name
      FROM timetable tt
      LEFT JOIN classes c ON tt.class_id = c.id
      LEFT JOIN subjects s ON tt.subject_id = s.id
      WHERE tt.teacher_id = $1 AND tt.is_active = true AND tt.tenant_id = $2
      ORDER BY tt.day_of_week, tt.start_time
    `, [teacherId, tenantId]);

    return timetable;
  }

  // Stubs for methods used by controller
  async assignClassToTeacher(id, classId) {
    return await this.getTeacherById(id);
  }

  async assignSubjectToTeacher(id, classId, subjectId, weeklyHours) {
    return await this.getTeacherById(id);
  }

  async getTeacherSchedule(id) {
    const results = await query(
      `SELECT tt.*, c.name as class_name, s.name as subject_name
       FROM timetable tt
       LEFT JOIN classes c ON tt.class_id = c.id
       LEFT JOIN subjects s ON tt.subject_id = s.id
       WHERE tt.teacher_id = $1 AND tt.is_active = true
       ORDER BY tt.day_of_week, tt.start_time`,
      [id]
    );
    return results;
  }

  async markAttendance(id, date, status, checkInTime, checkOutTime, location, ipAddress, markedBy, remarks) {
    return { id, date, status };
  }

  async getTeacherAttendance(id, filters) {
    return [];
  }

  async applyLeave(id, leaveData) {
    return { id, ...leaveData };
  }

  async getTeacherLeaves(id, filters) {
    return [];
  }

  async approveLeave(leaveId, approvedBy, status, rejectionReason) {
    return { leaveId, status };
  }

  async getTeacherSalary(id, filters) {
    return [];
  }

  async getAvailableTeachers(date, periodId) {
    return [];
  }

  async getTeacherStatistics(filters) {
    return {};
  }
}

export default new TeacherService();
