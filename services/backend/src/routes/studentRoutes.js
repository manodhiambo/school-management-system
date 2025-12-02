import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all students - returns array directly in data
router.get('/', requireRole(['admin', 'teacher', 'parent']), async (req, res) => {
  try {
    const { classId, status, search } = req.query;
    
    let sql = `
      SELECT 
        s.*,
        u.email,
        u.is_active,
        c.name as class_name
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

    if (search) {
      sql += ` AND (s.first_name ILIKE $${paramIndex} OR s.last_name ILIKE $${paramIndex} OR s.admission_number ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ' ORDER BY s.created_at DESC';

    const students = await query(sql, params);
    
    // Return array directly for frontend compatibility
    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    logger.error('Get students error:', error);
    res.status(500).json({ success: false, message: 'Error fetching students', error: error.message });
  }
});

// Get student statistics
router.get('/statistics', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_students,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_students,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_students
      FROM students
    `);
    
    res.json({
      success: true,
      data: stats[0] || {}
    });
  } catch (error) {
    logger.error('Get statistics error:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
});

// Get single student
router.get('/:id', async (req, res) => {
  try {
    const students = await query(
      `SELECT s.*, u.email, c.name as class_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    res.json({ success: true, data: students[0] });
  } catch (error) {
    logger.error('Get student error:', error);
    res.status(500).json({ success: false, message: 'Error fetching student' });
  }
});

// Create student
router.post('/', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    logger.info('Create student request body:', JSON.stringify(req.body));
    
    const {
      email, password, firstName, lastName, dateOfBirth, gender,
      bloodGroup, classId, parentId, admissionDate, address,
      city, state, pincode, phonePrimary
    } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, firstName, and lastName are required'
      });
    }

    // Check if email exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Generate admission number
    const year = new Date().getFullYear();
    const lastStudent = await query(
      `SELECT admission_number FROM students 
       WHERE admission_number LIKE $1 
       ORDER BY admission_number DESC LIMIT 1`,
      [`STD${year}%`]
    );
    
    let sequence = 1;
    if (lastStudent.length > 0) {
      sequence = parseInt(lastStudent[0].admission_number.slice(-4)) + 1;
    }
    const admissionNumber = `STD${year}${sequence.toString().padStart(4, '0')}`;

    // Create user
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password || 'student123', 10);
    
    await query(
      `INSERT INTO users (id, email, password, role, is_active, is_verified)
       VALUES ($1, $2, $3, 'student', true, true)`,
      [userId, email, hashedPassword]
    );

    // Create student
    const studentId = uuidv4();
    await query(
      `INSERT INTO students (
        id, user_id, admission_number, first_name, last_name, date_of_birth,
        gender, blood_group, class_id, parent_id, admission_date,
        address, city, state, pincode, phone_primary, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'active')`,
      [
        studentId, userId, admissionNumber, firstName, lastName,
        dateOfBirth || null, gender || null, bloodGroup || null,
        classId || null, parentId || null, admissionDate || new Date(),
        address || null, city || null, state || null, pincode || null, phonePrimary || null
      ]
    );

    const newStudent = await query(
      `SELECT s.*, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1`,
      [studentId]
    );

    logger.info('Student created:', studentId);
    
    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: newStudent[0]
    });
  } catch (error) {
    logger.error('Create student error:', error);
    res.status(500).json({ success: false, message: 'Error creating student', error: error.message });
  }
});

// Update student
router.put('/:id', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, gender, bloodGroup, classId, address, city, state, pincode, phonePrimary, status } = req.body;
    
    await query(
      `UPDATE students SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        date_of_birth = COALESCE($3, date_of_birth),
        gender = COALESCE($4, gender),
        blood_group = COALESCE($5, blood_group),
        class_id = COALESCE($6, class_id),
        address = COALESCE($7, address),
        city = COALESCE($8, city),
        state = COALESCE($9, state),
        pincode = COALESCE($10, pincode),
        phone_primary = COALESCE($11, phone_primary),
        status = COALESCE($12, status),
        updated_at = NOW()
       WHERE id = $13`,
      [firstName, lastName, dateOfBirth, gender, bloodGroup, classId, address, city, state, pincode, phonePrimary, status, req.params.id]
    );

    const updated = await query(
      `SELECT s.*, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1`,
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: updated[0]
    });
  } catch (error) {
    logger.error('Update student error:', error);
    res.status(500).json({ success: false, message: 'Error updating student' });
  }
});

// Delete student
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const student = await query('SELECT user_id FROM students WHERE id = $1', [req.params.id]);
    if (student.length > 0 && student[0].user_id) {
      await query('DELETE FROM users WHERE id = $1', [student[0].user_id]);
    }
    await query('DELETE FROM students WHERE id = $1', [req.params.id]);
    
    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    logger.error('Delete student error:', error);
    res.status(500).json({ success: false, message: 'Error deleting student' });
  }
});

// Get student attendance
router.get('/:id/attendance', async (req, res) => {
  try {
    const attendance = await query(
      `SELECT * FROM attendance WHERE student_id = $1 ORDER BY date DESC`,
      [req.params.id]
    );
    
    res.json({ success: true, data: attendance });
  } catch (error) {
    logger.error('Get attendance error:', error);
    res.status(500).json({ success: false, message: 'Error fetching attendance' });
  }
});

// Get student exam results
router.get('/:id/exam-results', async (req, res) => {
  try {
    const results = await query(
      `SELECT er.*, e.name as exam_name 
       FROM exam_results er 
       JOIN exams e ON er.exam_id = e.id 
       WHERE er.student_id = $1`,
      [req.params.id]
    );
    
    res.json({ success: true, data: { results } });
  } catch (error) {
    logger.error('Get exam results error:', error);
    res.status(500).json({ success: false, message: 'Error fetching exam results' });
  }
});

// Get student fee account
router.get('/:id/finance', async (req, res) => {
  try {
    const invoices = await query(
      `SELECT * FROM fee_invoices WHERE student_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    
    res.json({ success: true, data: { invoices } });
  } catch (error) {
    logger.error('Get finance error:', error);
    res.status(500).json({ success: false, message: 'Error fetching finance' });
  }
});

export default router;
