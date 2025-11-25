import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import passwordService from './passwordService.js';
import ApiError from '../utils/ApiError.js';

class StudentService {
  async generateAdmissionNumber() {
    const year = new Date().getFullYear();
    
    const results = await query(
      `SELECT admission_number FROM students
       WHERE admission_number LIKE ?
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

    // Generate admission number
    const admissionNumber = await this.generateAdmissionNumber();

    // Create student record
    const studentId = uuidv4();
    
    await query(
      `INSERT INTO students (
        id, user_id, admission_number, first_name, last_name, date_of_birth, gender,
        blood_group, religion, caste, category, aadhar_number,
        class_id, section_id, parent_id, joining_date, admission_date,
        medical_notes, emergency_contact, address, city, state, pincode, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        studentId,
        userId,
        admissionNumber,
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
        s.admission_number LIKE ? OR
        s.roll_number LIKE ? OR
        u.email LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
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
        c.section as section_name
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
    const student = await this.getStudentById(id);
    await query('DELETE FROM students WHERE id = ?', [id]);
    await query('DELETE FROM users WHERE id = ?', [student.user_id]);
    return { message: 'Student deleted successfully' };
  }

  async getStudentAttendance(id, filters = {}) {
    const { startDate, endDate, month } = filters;

    let sql = `
      SELECT 
        a.*,
        c.name as class_name,
        c.section as section_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
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
      statistics: stats[0] || {}
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


  async getStudentExamResults(studentId) {
    // Get all exam results for the student
    const results = await query(
      `SELECT 
        e.id as exam_id,
        e.name as exam_name,
        e.type as exam_type,
        e.session,
        e.start_date,
        e.max_marks as total_marks,
        er.marks_obtained,
        er.grade,
        er.is_absent,
        s.name as subject_name,
        s.code as subject_code
       FROM exam_results er
       JOIN exams e ON er.exam_id = e.id
       JOIN subjects s ON er.subject_id = s.id
       WHERE er.student_id = ?
       ORDER BY e.start_date DESC`,
      [studentId]
    );

    // Group results by exam
    const examMap = new Map();
    
    results.forEach(row => {
      if (!examMap.has(row.exam_id)) {
        examMap.set(row.exam_id, {
          exam_id: row.exam_id,
          exam_name: row.exam_name,
          exam_type: row.exam_type,
          session: row.session,
          start_date: row.start_date,
          subjects: [],
          total_marks: 0,
          marks_obtained: 0
        });
      }
      
      const exam = examMap.get(row.exam_id);
      exam.subjects.push({
        subject_name: row.subject_name,
        subject_code: row.subject_code,
        marks_obtained: row.marks_obtained,
        total_marks: row.total_marks,
        grade: row.grade,
        is_absent: row.is_absent,
        percentage: row.is_absent ? 0 : ((row.marks_obtained / row.total_marks) * 100).toFixed(2)
      });
      
      if (!row.is_absent) {
        exam.total_marks += parseFloat(row.total_marks);
        exam.marks_obtained += parseFloat(row.marks_obtained);
      }
    });

    // Calculate overall percentage and grade for each exam
    const examResults = Array.from(examMap.values()).map(exam => {
      exam.percentage = exam.total_marks > 0 
        ? ((exam.marks_obtained / exam.total_marks) * 100).toFixed(2)
        : 0;
      
      // Calculate grade based on percentage
      if (exam.percentage >= 90) exam.grade = 'A+';
      else if (exam.percentage >= 80) exam.grade = 'A';
      else if (exam.percentage >= 70) exam.grade = 'B+';
      else if (exam.percentage >= 60) exam.grade = 'B';
      else if (exam.percentage >= 50) exam.grade = 'C';
      else if (exam.percentage >= 40) exam.grade = 'D';
      else exam.grade = 'F';
      
      return exam;
    });

    return examResults;
  }


  async getStudentTimetable(studentId) {
    // First, check if this is a user_id or student id
    let student = await query(
      'SELECT id, class_id, section_id FROM students WHERE id = ?',
      [studentId]
    );

    // If not found, try user_id
    if (student.length === 0) {
      student = await query(
        'SELECT id, class_id, section_id FROM students WHERE user_id = ?',
        [studentId]
      );
    }

    if (student.length === 0) {
      throw new ApiError(404, 'Student not found');
    }

    const { class_id, section_id } = student[0];

    if (!class_id) {
      return [];
    }

    // Get timetable for the class
    const timetable = await query(
      `SELECT 
        t.id,
        t.day_of_week,
        p.period_number,
        p.start_time,
        p.end_time,
        s.name as subject_name,
        s.code as subject_code,
        CONCAT(te.first_name, ' ', te.last_name) as teacher_name,
        r.room_number
       FROM timetable t
       JOIN periods p ON t.period_id = p.id
       JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN teachers te ON t.teacher_id = te.id
       LEFT JOIN rooms r ON t.room_id = r.id
       WHERE t.class_id = ? AND t.is_active = TRUE
       ORDER BY 
        FIELD(t.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
        p.period_number`,
      [class_id]
    );

    // Group by day
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const groupedTimetable = days.map(day => ({
      day_name: day,
      day: day,
      periods: timetable
        .filter(entry => entry.day_of_week.toLowerCase() === day.toLowerCase())
        .map(entry => ({
          period_number: entry.period_number,
          start_time: entry.start_time,
          end_time: entry.end_time,
          subject_name: entry.subject_name,
          subject_code: entry.subject_code,
          teacher_name: entry.teacher_name,
          room_number: entry.room_number,
          room: entry.room_number
        }))
    }));

    return groupedTimetable;
  }
}

export default new StudentService();
