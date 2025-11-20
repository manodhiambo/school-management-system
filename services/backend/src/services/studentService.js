import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import passwordService from './passwordService.js';
import ApiError from '../utils/ApiError.js';

class StudentService {
  async createStudent(studentData) {
    const {
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodGroup,
      religion,
      caste,
      category,
      aadharNumber,
      classId,
      sectionId,
      parentId,
      joiningDate,
      admissionDate,
      medicalNotes,
      emergencyContact,
      address,
      city,
      state,
      pincode
    } = studentData;

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
       VALUES (?, ?, ?, 'student', TRUE)`,
      [userId, email, hashedPassword]
    );

    // Create student record
    const studentId = uuidv4();
    
    await query(
      `INSERT INTO students (
        id, user_id, first_name, last_name, date_of_birth, gender,
        blood_group, religion, caste, category, aadhar_number,
        class_id, section_id, parent_id, joining_date, admission_date,
        medical_notes, emergency_contact, address, city, state, pincode, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        studentId,
        userId,
        firstName,
        lastName,
        dateOfBirth || null,
        gender,
        bloodGroup || null,
        religion || null,
        caste || null,
        category || null,
        aadharNumber || null,
        classId || null,
        sectionId || null,
        parentId || null,
        joiningDate || null,
        admissionDate || null,
        medicalNotes || null,
        emergencyContact ? JSON.stringify(emergencyContact) : null,
        address || null,
        city || null,
        state || null,
        pincode || null
      ]
    );

    // Fetch and return the created student
    const students = await query(
      `SELECT s.*, u.email, u.is_active
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [studentId]
    );

    return students[0];
  }

  async getStudents(filters = {}, pagination = {}) {
    const {
      classId,
      sectionId,
      status,
      search,
      parentId,
      gender,
      session
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
        s.*,
        u.email,
        u.is_active,
        c.name as class_name,
        c.section as section_name,
        CONCAT(p.first_name, ' ', p.last_name) as parent_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE 1=1
    `;

    const params = [];

    if (classId) {
      sql += ' AND s.class_id = ?';
      params.push(classId);
    }

    if (sectionId) {
      sql += ' AND s.section_id = ?';
      params.push(sectionId);
    }

    if (status) {
      sql += ' AND s.status = ?';
      params.push(status);
    }

    if (parentId) {
      sql += ' AND s.parent_id = ?';
      params.push(parentId);
    }

    if (gender) {
      sql += ' AND s.gender = ?';
      params.push(gender);
    }

    if (search) {
      sql += ` AND (
        s.first_name LIKE ? OR 
        s.last_name LIKE ? OR 
        s.roll_number LIKE ? OR
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
    sql += ` ORDER BY s.${sortBy} ${sortOrder}`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const students = await query(sql, params);

    return {
      students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getStudentById(id) {
    const students = await query(
      `SELECT 
        s.*,
        u.email,
        u.is_active,
        u.last_login,
        c.name as class_name,
        c.section as section_name,
        CONCAT(p.first_name, ' ', p.last_name) as parent_name,
        p.phone_primary as parent_phone
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE s.id = ?`,
      [id]
    );

    if (students.length === 0) {
      throw new ApiError(404, 'Student not found');
    }

    return students[0];
  }

  async updateStudent(id, updateData) {
    const updates = [];
    const values = [];

    // Build dynamic update query
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        // Convert camelCase to snake_case
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
      `UPDATE students SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    return await this.getStudentById(id);
  }

  async updateStudentStatus(id, status) {
    const validStatuses = ['active', 'inactive', 'suspended', 'graduated', 'transferred'];
    
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    await query(
      'UPDATE students SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    return await this.getStudentById(id);
  }

  async deleteStudent(id) {
    // Get student to find associated user
    const student = await this.getStudentById(id);

    // Delete student record
    await query('DELETE FROM students WHERE id = ?', [id]);

    // Delete associated user account
    await query('DELETE FROM users WHERE id = ?', [student.user_id]);

    return { message: 'Student deleted successfully' };
  }

  async getStudentAttendance(id, filters = {}) {
    const { startDate, endDate, month } = filters;

    let sql = `
      SELECT 
        a.*,
        c.name as class_name,
        c.section as section_name,
        sub.name as subject_name
      FROM attendance a
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN subjects sub ON a.subject_id = sub.id
      WHERE a.student_id = ?
    `;

    const params = [id];

    if (startDate && endDate) {
      sql += ' AND a.date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (month) {
      sql += ' AND DATE_FORMAT(a.date, "%Y-%m") = ?';
      params.push(month);
    }

    sql += ' ORDER BY a.date DESC';

    const attendance = await query(sql, params);

    // Get statistics
    const stats = await query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused
      FROM attendance
      WHERE student_id = ?`,
      [id]
    );

    return {
      attendance,
      statistics: stats
    };
  }

  async getStudentAcademicReport(id, filters = {}) {
    const { session, examId } = filters;

    let sql = `
      SELECT 
        er.*,
        e.name as exam_name,
        e.type as exam_type,
        e.max_marks,
        e.passing_marks,
        sub.name as subject_name,
        sub.code as subject_code
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      JOIN subjects sub ON er.subject_id = sub.id
      WHERE er.student_id = ?
    `;

    const params = [id];

    if (session) {
      sql += ' AND e.session = ?';
      params.push(session);
    }

    if (examId) {
      sql += ' AND er.exam_id = ?';
      params.push(examId);
    }

    sql += ' ORDER BY e.start_date DESC';

    const results = await query(sql, params);

    return results;
  }

  async getStudentStatistics() {
    const stats = await query(`
      SELECT
        COUNT(*) as total_students,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_students,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_students,
        SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as male_students,
        SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as female_students
      FROM students
    `);

    return stats[0] || {};
  }

  async bulkImportStudents(studentsData) {
    const results = {
      success: [],
      failed: []
    };

    for (const studentData of studentsData) {
      try {
        const student = await this.createStudent(studentData);
        results.success.push({
          email: studentData.email,
          id: student.id
        });
      } catch (error) {
        results.failed.push({
          email: studentData.email,
          error: error.message
        });
      }
    }

    return results;
  }
}

export default new StudentService();
