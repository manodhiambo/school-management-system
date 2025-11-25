import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import passwordService from './passwordService.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class TeacherService {
  async createTeacher(teacherData) {
    const {
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      dateOfJoining,
      qualification,
      specialization,
      experienceYears,
      departmentId,
      designation,
      salaryGrade,
      basicSalary,
      accountNumber,
      ifscCode,
      panNumber,
      aadharNumber,
      address,
      city,
      state,
      pincode,
      phone,
      emergencyContact,
      isClassTeacher,
      classId,
      sectionId
    } = teacherData;

    // Check if email already exists
    const existingUsers = await query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      throw new ApiError(400, 'Email already exists');
    }

    // Create user account
    const userId = uuidv4();
    const hashedPassword = await passwordService.hashPassword(password);

    await query(
      `INSERT INTO users (id, email, password_hash, role, is_active)
       VALUES (?, ?, ?, 'teacher', TRUE)`,
      [userId, email, hashedPassword]
    );

    // Generate employee ID
    const employeeId = await this.generateEmployeeId();

    // Create teacher record
    const teacherId = uuidv4();
    await query(
      `INSERT INTO teachers (
        id, user_id, employee_id, first_name, last_name, date_of_birth,
        gender, date_of_joining, qualification, specialization, experience_years,
        department_id, designation, salary_grade, basic_salary,
        account_number, ifsc_code, pan_number, aadhar_number,
        address, city, state, pincode, phone, emergency_contact,
        is_class_teacher, class_id, section_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        teacherId,
        userId,
        employeeId,
        firstName,
        lastName,
        dateOfBirth || null,
        gender,
        dateOfJoining,
        qualification || null,
        specialization || null,
        experienceYears || null,
        departmentId || null,
        designation || null,
        salaryGrade || null,
        basicSalary || null,
        accountNumber || null,
        ifscCode || null,
        panNumber || null,
        aadharNumber || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        phone || null,
        emergencyContact ? JSON.stringify(emergencyContact) : null,
        isClassTeacher || false,
        classId || null,
        sectionId || null
      ]
    );

    // Update class teacher assignment
    if (isClassTeacher && classId) {
      await query(
        'UPDATE classes SET class_teacher_id = ? WHERE id = ?',
        [teacherId, classId]
      );
    }

    logger.info(`Teacher created: ${employeeId}`);

    return await this.getTeacherById(teacherId);
  }

  async generateEmployeeId() {
    const year = new Date().getFullYear().toString().slice(-2);

    const results = await query(
      `SELECT employee_id FROM teachers
       WHERE employee_id LIKE ?
       ORDER BY employee_id DESC LIMIT 1`,
      [`TCH${year}%`]
    );

    let sequence = 1;
    if (results.length > 0) {
      const lastNumber = results[0].employee_id;
      sequence = parseInt(lastNumber.slice(-4)) + 1;
    }

    return `TCH${year}${sequence.toString().padStart(4, '0')}`;
  }

  async getTeacherById(id) {
    const results = await query(
      `SELECT
        t.*,
        u.email,
        u.last_login,
        d.name as department_name,
        d.code as department_code,
        c.name as class_name,
        c.section as section_name
       FROM teachers t
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN departments d ON t.department_id = d.id
       LEFT JOIN classes c ON t.class_id = c.id
       WHERE t.id = ?`,
      [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Teacher not found');
    }

    return results[0];
  }

  async getTeachers(filters = {}, pagination = {}) {
    const {
      departmentId,
      status,
      search,
      specialization,
      isClassTeacher,
      gender
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = pagination;

    const offset = (page - 1) * limit;

    let sql = `
      SELECT
        t.*,
        u.email,
        u.is_active,
        d.name as department_name,
        c.name as class_name,
        c.section as section_name
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN classes c ON t.class_id = c.id
      WHERE 1=1
    `;

    const params = [];

    if (departmentId) {
      sql += ' AND t.department_id = ?';
      params.push(departmentId);
    }

    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    if (specialization) {
      sql += ' AND t.specialization = ?';
      params.push(specialization);
    }

    if (isClassTeacher !== undefined) {
      sql += ' AND t.is_class_teacher = ?';
      params.push(isClassTeacher);
    }

    if (gender) {
      sql += ' AND t.gender = ?';
      params.push(gender);
    }

    if (search) {
      sql += ` AND (
        t.first_name LIKE ? OR
        t.last_name LIKE ? OR
        t.employee_id LIKE ? OR
        u.email LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Get total count
    const countSql = sql.replace(
      /SELECT .+ FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const countResult = await query(countSql, params);
    const total = countResult[0]?.total || 0;

    // Add sorting and pagination
    sql += ` ORDER BY t.${sortBy} ${sortOrder}`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const teachers = await query(sql, params);

    return {
      teachers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateTeacher(id, updateData) {
    const updates = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        updates.push(`${dbKey} = ?`);
        values.push(updateData[key] === '' ? null : updateData[key]);
      }
    });

    if (updates.length === 0) {
      throw new ApiError(400, 'No fields to update');
    }

    values.push(id);

    await query(
      `UPDATE teachers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    return await this.getTeacherById(id);
  }

  async deleteTeacher(id) {
    const teacher = await this.getTeacherById(id);

    await query('DELETE FROM teachers WHERE id = ?', [id]);
    await query('DELETE FROM users WHERE id = ?', [teacher.user_id]);

    return { message: 'Teacher deleted successfully' };
  }

  async getTeacherStatistics() {
    const stats = await query(`
      SELECT
        COUNT(*) as total_teachers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_teachers,
        SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as on_leave_teachers,
        SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as male_teachers,
        SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as female_teachers,
        SUM(CASE WHEN is_class_teacher = TRUE THEN 1 ELSE 0 END) as class_teachers
      FROM teachers
    `);

    return stats[0] || {};
  }

  async getAvailableTeachers(filters = {}) {
    const { date, timeSlot } = filters;

    let sql = `
      SELECT
        t.*,
        u.email,
        d.name as department_name
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE t.status = 'active'
    `;

    const params = [];

    if (date && timeSlot) {
      sql += `
        AND t.id NOT IN (
          SELECT teacher_id FROM timetable
          WHERE date = ? AND time_slot = ?
        )
      `;
      params.push(date, timeSlot);
    }

    const teachers = await query(sql, params);
    return teachers;
  }


  async getTeacherClasses(teacherId) {
    // Get classes where teacher is assigned
    const classes = await query(
      `SELECT DISTINCT
        c.id,
        c.name as class_name,
        c.section,
        c.academic_year,
        COUNT(DISTINCT s.id) as current_strength,
        COUNT(DISTINCT cs.subject_id) as total_subjects,
        ROUND(AVG(CASE WHEN a.status = 'present' THEN 100 ELSE 0 END), 2) as attendance_percentage,
        ROUND(AVG(er.marks_obtained * 100.0 / e.max_marks), 2) as average_grade
       FROM classes c
       LEFT JOIN class_subjects cs ON c.id = cs.class_id
       LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
       LEFT JOIN attendance a ON s.id = a.student_id
       LEFT JOIN exam_results er ON s.id = er.student_id
       LEFT JOIN exams e ON er.exam_id = e.id
       WHERE cs.teacher_id = ?
       GROUP BY c.id, c.name, c.section, c.academic_year`,
      [teacherId]
    );
    
    return classes;
  }
}

export default new TeacherService();
