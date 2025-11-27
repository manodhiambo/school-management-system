import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import ApiError from '../utils/ApiError.js';

class StudentService {
  async generateAdmissionNumber() {
    const year = new Date().getFullYear();

    const results = await query(
      `SELECT admission_number FROM students
       WHERE admission_number LIKE $1
       ORDER BY admission_number DESC LIMIT 1`,
      [`STD${year}%`]
    );

    let sequence = 1;
    if (results.length > 0) {
      const lastNumber = results[0].admission_number;
      sequence = parseInt(lastNumber.slice(-4)) + 1;
    }

    return `STD${year}${sequence.toString().padStart(4, '0')}`;
  }

  async createStudent(studentData) {
    const {
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodGroup,
      classId,
      parentId,
      admissionDate,
      address,
      city,
      state,
      pincode,
      phonePrimary
    } = studentData;

    // Check if email already exists
    const existingUsers = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUsers.length > 0) {
      throw new ApiError(400, 'Email already exists');
    }

    // Create user account
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password || 'student123', 10);

    await query(
      `INSERT INTO users (id, email, password, role, is_active, is_verified)
       VALUES ($1, $2, $3, 'student', TRUE, TRUE)`,
      [userId, email, hashedPassword]
    );

    // Generate admission number
    const admissionNumber = await this.generateAdmissionNumber();

    // Create student record
    const studentId = uuidv4();

    await query(
      `INSERT INTO students (
        id, user_id, admission_number, first_name, last_name, date_of_birth, gender,
        blood_group, class_id, parent_id, admission_date,
        address, city, state, pincode, phone_primary, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'active')`,
      [
        studentId,
        userId,
        admissionNumber,
        firstName,
        lastName,
        dateOfBirth || null,
        gender || null,
        bloodGroup || null,
        classId || null,
        parentId || null,
        admissionDate || new Date(),
        address || null,
        city || null,
        state || null,
        pincode || null,
        phonePrimary || null
      ]
    );

    // Fetch and return the created student
    const students = await query(
      `SELECT s.*, u.email, u.is_active
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [studentId]
    );

    return students[0];
  }

  async getStudents(filters = {}, pagination = {}) {
    const {
      classId,
      status,
      search,
      parentId,
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
        s.*,
        u.email,
        u.is_active,
        c.name as class_name,
        c.section as section_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (classId) {
      sql += ` AND s.class_id = $${paramIndex}`;
      params.push(classId);
      paramIndex++;
    }

    if (status) {
      sql += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (parentId) {
      sql += ` AND s.parent_id = $${paramIndex}`;
      params.push(parentId);
      paramIndex++;
    }

    if (gender) {
      sql += ` AND s.gender = $${paramIndex}`;
      params.push(gender);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (
        s.first_name ILIKE $${paramIndex} OR
        s.last_name ILIKE $${paramIndex} OR
        s.admission_number ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add sorting and pagination
    sql += ` ORDER BY s.${sortBy} ${sortOrder}`;
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const students = await query(sql, params);

    return {
      students,
      pagination: {
        page,
        limit
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
        c.section as section_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = $1`,
      [id]
    );

    if (students.length === 0) {
      throw new ApiError(404, 'Student not found');
    }

    return students[0];
  }

  async getStudentByUserId(userId) {
    const students = await query(
      `SELECT 
        s.*,
        u.email,
        u.is_active,
        c.name as class_name,
        c.section as section_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.user_id = $1`,
      [userId]
    );

    if (students.length === 0) {
      throw new ApiError(404, 'Student not found');
    }

    return students[0];
  }

  async updateStudent(id, updateData) {
    const fieldMap = {
      firstName: 'first_name',
      lastName: 'last_name',
      dateOfBirth: 'date_of_birth',
      gender: 'gender',
      bloodGroup: 'blood_group',
      classId: 'class_id',
      parentId: 'parent_id',
      address: 'address',
      city: 'city',
      state: 'state',
      pincode: 'pincode',
      phonePrimary: 'phone_primary',
      status: 'status'
    };

    const updates = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && fieldMap[key]) {
        updates.push(`${fieldMap[key]} = $${paramIndex}`);
        values.push(updateData[key] === '' ? null : updateData[key]);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return await this.getStudentById(id);
    }

    values.push(id);

    await query(
      `UPDATE students SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values
    );

    return await this.getStudentById(id);
  }

  async deleteStudent(id) {
    const student = await this.getStudentById(id);
    await query('DELETE FROM students WHERE id = $1', [id]);
    await query('DELETE FROM users WHERE id = $1', [student.user_id]);
    return { message: 'Student deleted successfully' };
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

  async getStudentAttendance(id, filters = {}) {
    const { startDate, endDate, month } = filters;

    let sql = `
      SELECT 
        a.*,
        c.name as class_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE a.student_id = $1
    `;

    const params = [id];
    let paramIndex = 2;

    if (startDate && endDate) {
      sql += ` AND a.date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    } else if (month) {
      sql += ` AND TO_CHAR(a.date, 'YYYY-MM') = $${paramIndex}`;
      params.push(month);
      paramIndex++;
    }

    sql += ' ORDER BY a.date DESC';

    const attendance = await query(sql, params);

    const stats = await query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
      FROM attendance
      WHERE student_id = $1`,
      [id]
    );

    return {
      attendance,
      statistics: stats[0] || {}
    };
  }

  async getStudentExamResults(studentId) {
    const results = await query(
      `SELECT 
        er.*,
        e.name as exam_name,
        e.exam_type,
        s.name as subject_name
       FROM exam_results er
       JOIN exams e ON er.exam_id = e.id
       LEFT JOIN subjects s ON er.subject_id = s.id
       WHERE er.student_id = $1
       ORDER BY e.start_date DESC`,
      [studentId]
    );

    return results;
  }

  async getStudentFeeAccount(studentId) {
    const invoices = await query(
      `SELECT * FROM fee_invoices WHERE student_id = $1 ORDER BY created_at DESC`,
      [studentId]
    );

    const payments = await query(
      `SELECT fp.* FROM fee_payments fp
       JOIN fee_invoices fi ON fp.invoice_id = fi.id
       WHERE fi.student_id = $1
       ORDER BY fp.payment_date DESC`,
      [studentId]
    );

    const summary = await query(
      `SELECT 
        COALESCE(SUM(net_amount), 0) as total_amount,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(balance_amount), 0) as total_balance
       FROM fee_invoices WHERE student_id = $1`,
      [studentId]
    );

    return {
      invoices,
      payments,
      summary: summary[0] || {}
    };
  }
}

export default new StudentService();
