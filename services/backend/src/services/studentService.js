import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import passwordService from './passwordService.js';

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

    // Generate admission number
    const admissionNumber = await this.generateAdmissionNumber();

    // Create student record
    const studentId = uuidv4();
    await query(
      `INSERT INTO students (
        id, user_id, admission_number, first_name, last_name, date_of_birth,
        gender, blood_group, religion, caste, category, aadhar_number,
        class_id, section_id, parent_id, joining_date, admission_date,
        medical_notes, emergency_contact, address, city, state, pincode, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        studentId, userId, admissionNumber, firstName, lastName, dateOfBirth,
        gender, bloodGroup, religion, caste, category, aadharNumber,
        classId, sectionId, parentId, joiningDate, admissionDate,
        medicalNotes, JSON.stringify(emergencyContact), address, city, state, pincode
      ]
    );

    // Update class strength
    if (classId) {
      await query(
        'UPDATE classes SET current_strength = current_strength + 1 WHERE id = ?',
        [classId]
      );
    }

    logger.info(`Student created: ${admissionNumber}`);

    return await this.getStudentById(studentId);
  }

  async generateAdmissionNumber() {
    const year = new Date().getFullYear().toString().slice(-2);
    
    // Get last admission number for this year
    const results = await query(
      `SELECT admission_number FROM students 
       WHERE admission_number LIKE ? 
       ORDER BY admission_number DESC LIMIT 1`,
      [`STU${year}%`]
    );

    let sequence = 1;
    if (results.length > 0) {
      const lastNumber = results[0].admission_number;
      sequence = parseInt(lastNumber.slice(-4)) + 1;
    }

    return `STU${year}${sequence.toString().padStart(4, '0')}`;
  }

  async getStudentById(id) {
    const results = await query(
      `SELECT 
        s.*,
        u.email,
        u.last_login,
        c.name as class_name,
        c.section as section_name,
        p.first_name as parent_first_name,
        p.last_name as parent_last_name,
        p.phone_primary as parent_phone
       FROM students s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN parents p ON s.parent_id = p.id
       WHERE s.id = ?`,
      [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Student not found');
    }

    const student = results[0];

    // Parse JSON fields
    if (student.emergency_contact) {
      student.emergency_contact = JSON.parse(student.emergency_contact);
    }

    return student;
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

    // Build query
    let whereConditions = [];
    let queryParams = [];

    if (classId) {
      whereConditions.push('s.class_id = ?');
      queryParams.push(classId);
    }

    if (sectionId) {
      whereConditions.push('s.section_id = ?');
      queryParams.push(sectionId);
    }

    if (status) {
      whereConditions.push('s.status = ?');
      queryParams.push(status);
    }

    if (parentId) {
      whereConditions.push('s.parent_id = ?');
      queryParams.push(parentId);
    }

    if (gender) {
      whereConditions.push('s.gender = ?');
      queryParams.push(gender);
    }

    if (search) {
      whereConditions.push(
        '(s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_number LIKE ? OR s.roll_number LIKE ?)'
      );
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM students s
      ${whereClause}
    `;

    const countResults = await query(countQuery, queryParams);
    const total = countResults[0].total;

    // Get students
    const studentsQuery = `
      SELECT 
        s.*,
        u.email,
        c.name as class_name,
        c.section as section_name,
        p.first_name as parent_first_name,
        p.last_name as parent_last_name
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN parents p ON s.parent_id = p.id
      ${whereClause}
      ORDER BY s.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);
    const students = await query(studentsQuery, queryParams);

    return {
      students,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateStudent(id, updateData) {
    const student = await this.getStudentById(id);

    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodGroup,
      religion,
      caste,
      category,
      aadharNumber,
      rollNumber,
      classId,
      sectionId,
      parentId,
      medicalNotes,
      emergencyContact,
      address,
      city,
      state,
      pincode,
      profilePhotoUrl
    } = updateData;

    // Handle class change
    if (classId && classId !== student.class_id) {
      // Decrease old class strength
      if (student.class_id) {
        await query(
          'UPDATE classes SET current_strength = current_strength - 1 WHERE id = ?',
          [student.class_id]
        );
      }
      // Increase new class strength
      await query(
        'UPDATE classes SET current_strength = current_strength + 1 WHERE id = ?',
        [classId]
      );
    }

    const updateFields = [];
    const updateValues = [];

    if (firstName !== undefined) {
      updateFields.push('first_name = ?');
      updateValues.push(firstName);
    }
    if (lastName !== undefined) {
      updateFields.push('last_name = ?');
      updateValues.push(lastName);
    }
    if (dateOfBirth !== undefined) {
      updateFields.push('date_of_birth = ?');
      updateValues.push(dateOfBirth);
    }
    if (gender !== undefined) {
      updateFields.push('gender = ?');
      updateValues.push(gender);
    }
    if (bloodGroup !== undefined) {
      updateFields.push('blood_group = ?');
      updateValues.push(bloodGroup);
    }
    if (religion !== undefined) {
      updateFields.push('religion = ?');
      updateValues.push(religion);
    }
    if (caste !== undefined) {
      updateFields.push('caste = ?');
      updateValues.push(caste);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }
    if (aadharNumber !== undefined) {
      updateFields.push('aadhar_number = ?');
      updateValues.push(aadharNumber);
    }
    if (rollNumber !== undefined) {
      updateFields.push('roll_number = ?');
      updateValues.push(rollNumber);
    }
    if (classId !== undefined) {
      updateFields.push('class_id = ?');
      updateValues.push(classId);
    }
    if (sectionId !== undefined) {
      updateFields.push('section_id = ?');
      updateValues.push(sectionId);
    }
    if (parentId !== undefined) {
      updateFields.push('parent_id = ?');
      updateValues.push(parentId);
    }
    if (medicalNotes !== undefined) {
      updateFields.push('medical_notes = ?');
      updateValues.push(medicalNotes);
    }
    if (emergencyContact !== undefined) {
      updateFields.push('emergency_contact = ?');
      updateValues.push(JSON.stringify(emergencyContact));
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
    if (profilePhotoUrl !== undefined) {
      updateFields.push('profile_photo_url = ?');
      updateValues.push(profilePhotoUrl);
    }

    if (updateFields.length === 0) {
      return student;
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    await query(
      `UPDATE students SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    logger.info(`Student updated: ${id}`);

    return await this.getStudentById(id);
  }

  async updateStudentStatus(id, status) {
    const validStatuses = ['active', 'inactive', 'suspended', 'transferred', 'graduated'];
    
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    await query(
      'UPDATE students SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    logger.info(`Student status updated: ${id} -> ${status}`);

    return await this.getStudentById(id);
  }

  async deleteStudent(id) {
    const student = await this.getStudentById(id);

    // Soft delete - just update status
    await query(
      'UPDATE students SET status = ?, updated_at = NOW() WHERE id = ?',
      ['inactive', id]
    );

    // Decrease class strength
    if (student.class_id) {
      await query(
        'UPDATE classes SET current_strength = GREATEST(current_strength - 1, 0) WHERE id = ?',
        [student.class_id]
      );
    }

    // Optionally deactivate user account
    await query(
      'UPDATE users SET is_active = FALSE WHERE id = ?',
      [student.user_id]
    );

    logger.info(`Student deleted (soft): ${id}`);

    return { message: 'Student deleted successfully' };
  }

  async getStudentAttendance(id, filters = {}) {
    const { startDate, endDate, month } = filters;

    let whereConditions = ['student_id = ?'];
    let queryParams = [id];

    if (startDate && endDate) {
      whereConditions.push('date BETWEEN ? AND ?');
      queryParams.push(startDate, endDate);
    } else if (month) {
      whereConditions.push('DATE_FORMAT(date, "%Y-%m") = ?');
      queryParams.push(month);
    }

    const attendance = await query(
      `SELECT * FROM attendance 
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY date DESC`,
      queryParams
    );

    // Get summary
    const summary = await query(
      `SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END) as half_days,
        ROUND(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as attendance_percentage
       FROM attendance
       WHERE ${whereConditions.join(' AND ')}`,
      queryParams
    );

    return {
      attendance,
      summary: summary[0]
    };
  }

  async getStudentAcademicReport(id, filters = {}) {
    const { session, examId } = filters;

    let whereConditions = ['er.student_id = ?'];
    let queryParams = [id];

    if (session) {
      whereConditions.push('e.session = ?');
      queryParams.push(session);
    }

    if (examId) {
      whereConditions.push('er.exam_id = ?');
      queryParams.push(examId);
    }

    const results = await query(
      `SELECT 
        er.*,
        e.name as exam_name,
        e.type as exam_type,
        e.max_marks,
        e.passing_marks,
        s.name as subject_name,
        s.code as subject_code,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name
       FROM exam_results er
       JOIN exams e ON er.exam_id = e.id
       JOIN subjects s ON er.subject_id = s.id
       LEFT JOIN teachers t ON er.teacher_id = t.id
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY e.start_date DESC, s.name`,
      queryParams
    );

    // Calculate overall performance
    if (results.length > 0) {
      const totalMarks = results.reduce((sum, r) => sum + parseFloat(r.marks_obtained), 0);
      const maxMarks = results.reduce((sum, r) => sum + parseFloat(r.max_marks || 0), 0);
      const percentage = maxMarks > 0 ? (totalMarks / maxMarks * 100).toFixed(2) : 0;

      return {
        results,
        summary: {
          totalMarks,
          maxMarks,
          percentage,
          totalSubjects: results.length
        }
      };
    }

    return { results, summary: null };
  }

  async getStudentFinance(id) {
    // Get all invoices
    const invoices = await query(
      `SELECT * FROM fee_invoices 
       WHERE student_id = ?
       ORDER BY month DESC`,
      [id]
    );

    // Get all payments
    const payments = await query(
      `SELECT fp.*, fi.invoice_number
       FROM fee_payments fp
       JOIN fee_invoices fi ON fp.invoice_id = fi.id
       WHERE fi.student_id = ?
       ORDER BY fp.payment_date DESC`,
      [id]
    );

    // Calculate summary
    const summary = await query(
      `SELECT 
        SUM(net_amount) as total_amount,
        SUM(paid_amount) as total_paid,
        SUM(balance_amount) as total_balance,
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_invoices,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_invoices
       FROM fee_invoices
       WHERE student_id = ?`,
      [id]
    );

    return {
      invoices,
      payments,
      summary: summary[0]
    };
  }

  async promoteStudent(id, toClassId, session, result, percentage, remarks, promotedBy) {
    const student = await this.getStudentById(id);
    const fromClassId = student.class_id;

    // Create promotion record
    const promotionId = uuidv4();
    await query(
      `INSERT INTO student_promotions 
       (id, student_id, from_class_id, to_class_id, session, result, percentage, remarks, promoted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [promotionId, id, fromClassId, toClassId, session, result, percentage, remarks, promotedBy]
    );

    // Update student class
    if (result === 'promoted') {
      await this.updateStudent(id, { classId: toClassId });
      await query(
        'UPDATE students SET is_new_admission = FALSE WHERE id = ?',
        [id]
      );
    }

    logger.info(`Student promoted: ${id} from ${fromClassId} to ${toClassId}`);

    return await this.getStudentById(id);
  }

  async getStudentTimetable(id) {
    const student = await this.getStudentById(id);

    if (!student.class_id) {
      throw new ApiError(400, 'Student is not assigned to any class');
    }

    const timetable = await query(
      `SELECT 
        t.*,
        s.name as subject_name,
        s.code as subject_code,
        te.first_name as teacher_first_name,
        te.last_name as teacher_last_name,
        p.name as period_name,
        p.start_time,
        p.end_time,
        r.room_number,
        r.room_name
       FROM timetable t
       JOIN subjects s ON t.subject_id = s.id
       JOIN teachers te ON t.teacher_id = te.id
       JOIN periods p ON t.period_id = p.id
       LEFT JOIN rooms r ON t.room_id = r.id
       WHERE t.class_id = ? AND t.is_active = TRUE
       ORDER BY 
         FIELD(t.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
         p.start_time`,
      [student.class_id]
    );

    // Group by day
    const groupedTimetable = timetable.reduce((acc, slot) => {
      if (!acc[slot.day_of_week]) {
        acc[slot.day_of_week] = [];
      }
      acc[slot.day_of_week].push(slot);
      return acc;
    }, {});

    return groupedTimetable;
  }

  async getStudentDocuments(id) {
    const documents = await query(
      `SELECT 
        sd.*,
        u.email as uploaded_by_email
       FROM student_documents sd
       LEFT JOIN users u ON sd.uploaded_by = u.id
       WHERE sd.student_id = ?
       ORDER BY sd.created_at DESC`,
      [id]
    );

    return documents;
  }

  async addStudentDocument(id, documentData) {
    const { documentType, fileUrl, fileName, fileSize, mimeType, uploadedBy } = documentData;

    const documentId = uuidv4();
    await query(
      `INSERT INTO student_documents 
       (id, student_id, document_type, file_url, file_name, file_size, mime_type, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [documentId, id, documentType, fileUrl, fileName, fileSize, mimeType, uploadedBy]
    );

    logger.info(`Document added for student: ${id}`);

    return await query(
      'SELECT * FROM student_documents WHERE id = ?',
      [documentId]
    );
  }

  async deleteStudentDocument(studentId, documentId) {
    const documents = await query(
      'SELECT * FROM student_documents WHERE id = ? AND student_id = ?',
      [documentId, studentId]
    );

    if (documents.length === 0) {
      throw new ApiError(404, 'Document not found');
    }

    await query(
      'DELETE FROM student_documents WHERE id = ?',
      [documentId]
    );

    logger.info(`Document deleted: ${documentId}`);

    return { message: 'Document deleted successfully' };
  }

  async bulkImportStudents(studentsData, importedBy) {
    const results = {
      success: [],
      failed: []
    };

    for (const studentData of studentsData) {
      try {
        const student = await this.createStudent({
          ...studentData,
          password: studentData.password || 'Student@123'
        });
        results.success.push({
          admissionNumber: student.admission_number,
          name: `${student.first_name} ${student.last_name}`
        });
      } catch (error) {
        results.failed.push({
          data: studentData,
          error: error.message
        });
      }
    }

    logger.info(`Bulk import completed: ${results.success.length} success, ${results.failed.length} failed`);

    return results;
  }

  async getStudentStatistics(filters = {}) {
    const { classId, session } = filters;

    let whereConditions = [];
    let queryParams = [];

    if (classId) {
      whereConditions.push('class_id = ?');
      queryParams.push(classId);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Overall statistics
    const stats = await query(
      `SELECT 
        COUNT(*) as total_students,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_students,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_students,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_students,
        SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as male_students,
        SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as female_students,
        SUM(CASE WHEN is_new_admission = TRUE THEN 1 ELSE 0 END) as new_admissions
       FROM students
       ${whereClause}`,
      queryParams
    );

    // Class-wise distribution
    const classDistribution = await query(
      `SELECT 
        c.name as class_name,
        c.section,
        COUNT(s.id) as student_count
       FROM classes c
       LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
       GROUP BY c.id
       ORDER BY c.numeric_value, c.section`
    );

    return {
      statistics: stats[0],
      classDistribution
    };
  }
}

export default new StudentService();
