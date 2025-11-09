const { query, transaction } = require('../config/database');
const PasswordService = require('./password.service');
const EmailService = require('../services/email.service');
const logger = require('../utils/logger');
const { z } = require('zod');
const XLSX = require('xlsx');

const studentSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  date_of_birth: z.string().date(),
  gender: z.enum(['male', 'female', 'other']),
  class_id: z.string().uuid(),
  section_id: z.string().uuid(),
  parent_id: z.string().uuid(),
  admission_number: z.string().min(1),
  roll_number: z.string().optional(),
  blood_group: z.string().optional(),
  religion: z.string().optional(),
  caste: z.string().optional(),
  category: z.enum(['general', 'obc', 'sc', 'st', 'other']).optional(),
  aadhar_number: z.string().length(12).optional(),
  joining_date: z.string().date(),
  admission_date: z.string().date(),
  medical_notes: z.string().optional(),
  emergency_contact: z.object({
    name: z.string(),
    phone: z.string(),
    relation: z.string()
  }).optional()
});

const promotionSchema = z.object({
  to_class_id: z.string().uuid(),
  to_section_id: z.string().uuid(),
  session: z.string().min(1),
  result: z.enum(['promoted', 'detained', 'transfer']),
  percentage: z.coerce.number().min(0).max(100).optional()
});

class StudentService {
  static async createStudent(studentData) {
    return transaction(async (connection) => {
      // Validate data
      const validatedData = studentSchema.parse(studentData);
      
      // Check if admission number already exists
      const [existingStudent] = await connection.execute(
        'SELECT id FROM students WHERE admission_number = ?',
        [validatedData.admission_number]
      );
      
      if (existingStudent.length > 0) {
        throw new Error('Admission number already exists');
      }

      // Create user account for student
      const tempPassword = PasswordService.generateTemporaryPassword();
      const hashedPassword = await PasswordService.hashPassword(tempPassword);
      
      const [userResult] = await connection.execute(
        'INSERT INTO users (id, email, password_hash, role) VALUES (UUID(), ?, ?, ?)',
        [`${validatedData.admission_number}@school.local`, hashedPassword, 'student']
      );

      const userId = userResult.insertId;

      // Create student record
      const [studentResult] = await connection.execute(
        `INSERT INTO students (
          id, user_id, admission_number, first_name, last_name, date_of_birth,
          gender, class_id, section_id, parent_id, roll_number, blood_group,
          religion, caste, category, aadhar_number, joining_date, admission_date,
          medical_notes, emergency_contact
        ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          validatedData.admission_number,
          validatedData.first_name,
          validatedData.last_name,
          validatedData.date_of_birth,
          validatedData.gender,
          validatedData.class_id,
          validatedData.section_id,
          validatedData.parent_id,
          validatedData.roll_number || null,
          validatedData.blood_group || null,
          validatedData.religion || null,
          validatedData.caste || null,
          validatedData.category || null,
          validatedData.aadhar_number || null,
          validatedData.joining_date,
          validatedData.admission_date,
          validatedData.medical_notes || null,
          validatedData.emergency_contact ? JSON.stringify(validatedData.emergency_contact) : null
        ]
      );

      // Get parent email for notification
      const [parent] = await connection.execute(
        'SELECT u.email FROM parents p JOIN users u ON p.user_id = u.id WHERE p.id = ?',
        [validatedData.parent_id]
      );

      if (parent.length > 0) {
        const fullName = `${validatedData.first_name} ${validatedData.last_name}`;
        await EmailService.sendEmail(
          parent[0].email,
          'Student Account Created',
          `Student account created for ${fullName}. Admission Number: ${validatedData.admission_number}`
        );
      }

      logger.info(`Student created: ${validatedData.admission_number}`);
      
      return {
        studentId: studentResult.insertId,
        userId: userId,
        temporaryPassword: tempPassword
      };
    });
  }

  static async getStudents(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    let whereConditions = ['s.status != ?'];
    let params = ['deleted'];

    if (filters.classId) {
      whereConditions.push('s.class_id = ?');
      params.push(filters.classId);
    }

    if (filters.sectionId) {
      whereConditions.push('s.section_id = ?');
      params.push(filters.sectionId);
    }

    if (filters.status) {
      whereConditions.push('s.status = ?');
      params.push(filters.status);
    }

    if (filters.search) {
      whereConditions.push('(s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_number LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.join(' AND ');

    const [students] = await query(
      `SELECT 
        s.*, 
        c.name as class_name, 
        sec.section as section_name,
        p.first_name as parent_first_name,
        p.last_name as parent_last_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [totalResult] = await query(
      `SELECT COUNT(*) as total FROM students s WHERE ${whereClause}`,
      params
    );

    return {
      data: students,
      meta: {
        total: totalResult[0].total,
        page,
        limit,
        totalPages: Math.ceil(totalResult[0].total / limit)
      }
    };
  }

  static async getStudentById(studentId) {
    const [students] = await query(
      `SELECT 
        s.*,
        c.name as class_name,
        sec.section as section_name,
        p.first_name as parent_first_name,
        p.last_name as parent_last_name,
        p.phone_primary as parent_phone
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE s.id = ?`,
      [studentId]
    );

    if (!students.length) {
      throw new Error('Student not found');
    }

    return students[0];
  }

  static async updateStudent(studentId, updateData) {
    return transaction(async (connection) => {
      const validatedData = studentSchema.partial().parse(updateData);

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

      params.push(studentId);

      await connection.execute(
        `UPDATE students SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        params
      );

      logger.info(`Student updated: ${studentId}`);
      
      return { success: true };
    });
  }

  static async updateStudentStatus(studentId, status) {
    const validStatuses = ['active', 'inactive', 'suspended', 'transferred', 'deleted'];
    
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    await query(
      'UPDATE students SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, studentId]
    );

    logger.info(`Student ${studentId} status changed to ${status}`);
    
    return { success: true };
  }

  static async uploadDocument(studentId, documentData) {
    return transaction(async (connection) => {
      const { document_type, file_url, file_name, file_size, uploaded_by } = documentData;

      const [result] = await connection.execute(
        `INSERT INTO student_documents 
         (id, student_id, document_type, file_url, file_name, file_size, uploaded_by)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
        [studentId, document_type, file_url, file_name, file_size, uploaded_by]
      );

      logger.info(`Document uploaded for student ${studentId}: ${document_type}`);
      
      return { documentId: result.insertId };
    });
  }

  static async getStudentDocuments(studentId) {
    const [documents] = await query(
      `SELECT * FROM student_documents 
       WHERE student_id = ? 
       ORDER BY created_at DESC`,
      [studentId]
    );

    return documents;
  }

  static async getStudentAcademicReport(studentId) {
    const [exams] = await query(
      `SELECT 
        e.name as exam_name,
        e.type as exam_type,
        e.session,
        er.subject_id,
        s.name as subject_name,
        er.marks_obtained,
        er.grade,
        er.created_at
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      JOIN subjects s ON er.subject_id = s.id
      WHERE er.student_id = ?
      ORDER BY e.start_date DESC, s.name`,
      [studentId]
    );

    const [attendance] = await query(
      `SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days
      FROM attendance
      WHERE student_id = ?
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12`,
      [studentId]
    );

    const [gradebook] = await query(
      `SELECT 
        assessment_type,
        AVG((marks / max_marks) * 100) as average_score,
        COUNT(*) as total_assessments
      FROM gradebook
      WHERE student_id = ?
      GROUP BY assessment_type`,
      [studentId]
    );

    return {
      exams,
      attendance,
      gradebook
    };
  }

  static async getStudentFinance(studentId) {
    const [invoices] = await query(
      `SELECT 
        fi.*,
        SUM(fp.amount) as paid_amount,
        COUNT(fp.id) as payment_count
      FROM fee_inoices fi
      LEFT JOIN fee_payments fp ON fi.id = fp.invoice_id
      WHERE fi.student_id = ?
      GROUP BY fi.id
      ORDER BY fi.month DESC`,
      [studentId]
    );

    // Calculate pending amount for each invoice
    const invoicesWithBalance = invoices.map(invoice => {
      const paidAmount = parseFloat(invoice.paid_amount) || 0;
      const netAmount = parseFloat(invoice.net_amount);
      const pendingAmount = netAmount - paidAmount;
      
      return {
        ...invoice,
        paid_amount: paidAmount,
        pending_amount: pendingAmount,
        status: pendingAmount <= 0 ? 'paid' : invoice.status
      };
    });

    return invoicesWithBalance;
  }

  static async promoteStudent(studentId, promotionData) {
    const validatedData = promotionSchema.parse(promotionData);

    return transaction(async (connection) => {
      // Get current student details
      const [student] = await connection.execute(
        'SELECT class_id, section_id FROM students WHERE id = ?',
        [studentId]
      );

      if (!student.length) {
        throw new Error('Student not found');
      }

      const currentClassId = student[0].class_id;
      const currentSectionId = student[0].section_id;

      // Calculate percentage if marks are available
      let percentage = validatedData.percentage;
      if (!percentage) {
        const [results] = await connection.execute(
          `SELECT AVG(marks_obtained) as avg_marks FROM exam_results 
           WHERE student_id = ? AND exam_id IN (
             SELECT id FROM exams WHERE class_id = ? AND type = 'final'
           )`,
          [studentId, currentClassId]
        );
        percentage = results[0]?.avg_marks || 0;
      }

      // Create promotion record
      const [promotionResult] = await connection.execute(
        `INSERT INTO student_promotions 
         (id, student_id, from_class_id, to_class_id, session, result, percentage)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
        [
          studentId,
          currentClassId,
          validatedData.to_class_id,
          validatedData.session,
          validatedData.result,
          percentage
        ]
      );

      // Update student class if promoted
      if (validatedData.result === 'promoted') {
        await connection.execute(
          'UPDATE students SET class_id = ?, section_id = ?, updated_at = NOW() WHERE id = ?',
          [validatedData.to_class_id, validatedData.to_section_id, studentId]
        );

        // Reset roll number for new class
        await connection.execute(
          'UPDATE students SET roll_number = NULL WHERE id = ?',
          [studentId]
        );
      }

      logger.info(`Student ${studentId} promoted to class ${validatedData.to_class_id}`);
      
      return { 
        promotionId: promotionResult.insertId,
        result: validatedData.result,
        percentage
      };
    });
  }

  static async bulkImportStudents(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const row of data) {
      try {
        // Validate required fields
        if (!row.admission_number || !row.first_name || !row.last_name || !row.class_id || !row.parent_id) {
          throw new Error('Missing required fields: admission_number, first_name, last_name, class_id, parent_id');
        }

        // Check if admission number exists
        const [existing] = await query(
          'SELECT id FROM students WHERE admission_number = ?',
          [row.admission_number]
        );

        if (existing.length > 0) {
          throw new Error(`Admission number already exists: ${row.admission_number}`);
        }

        // Create student
        await this.createStudent({
          ...row,
          admission_date: row.admission_date || new Date().toISOString().split('T')[0],
          joining_date: row.joining_date || new Date().toISOString().split('T')[0],
          gender: row.gender || 'other',
          date_of_birth: row.date_of_birth || '2000-01-01'
        });

        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({ row, error: error.message });
      }
    }

    logger.info(`Bulk import completed: ${successCount} successful, ${errorCount} errors`);

    return {
      success: true,
      successCount,
      errorCount,
      errors
    };
  }
}

module.exports = StudentService;
