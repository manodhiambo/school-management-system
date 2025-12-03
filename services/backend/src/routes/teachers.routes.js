import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';

const router = express.Router();

// Get all teachers - returns array directly
router.get('/', authenticate, async (req, res) => {
  try {
    const teachers = await query(`
      SELECT t.*, u.email, u.is_active as user_active
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.first_name, t.last_name
    `);
    res.json({
      success: true,
      data: teachers
    });
  } catch (error) {
    logger.error('Get teachers error:', error);
    res.status(500).json({ success: false, message: 'Error fetching teachers' });
  }
});

// Get teacher by user ID
router.get('/by-user/:userId', authenticate, async (req, res) => {
  try {
    const teachers = await query(`
      SELECT t.*, u.email
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.user_id = $1
    `, [req.params.userId]);
    
    if (teachers.length === 0) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    res.json({ success: true, data: teachers[0] });
  } catch (error) {
    logger.error('Get teacher by user error:', error);
    res.status(500).json({ success: false, message: 'Error fetching teacher' });
  }
});

// Get single teacher
router.get('/:id', authenticate, async (req, res) => {
  try {
    const teachers = await query(`
      SELECT t.*, u.email 
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = $1 OR t.user_id = $1
    `, [req.params.id]);
    
    if (teachers.length === 0) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    res.json({ success: true, data: teachers[0] });
  } catch (error) {
    logger.error('Get teacher error:', error);
    res.status(500).json({ success: false, message: 'Error fetching teacher' });
  }
});

// Get teacher's classes (classes they teach based on timetable)
router.get('/:id/classes', authenticate, async (req, res) => {
  try {
    // First try to find teacher by ID or user_id
    const teacher = await query(
      'SELECT id FROM teachers WHERE id = $1 OR user_id = $1',
      [req.params.id]
    );
    
    const teacherId = teacher.length > 0 ? teacher[0].id : req.params.id;
    
    // Get classes from timetable where this teacher is assigned
    const classes = await query(`
      SELECT DISTINCT c.id, c.name, c.section, c.capacity
      FROM classes c
      JOIN timetable t ON c.id = t.class_id
      WHERE t.teacher_id = $1 AND t.is_active = true
    `, [teacherId]);
    
    // If no classes from timetable, return all classes (for now)
    if (classes.length === 0) {
      const allClasses = await query('SELECT id, name, section, capacity FROM classes ORDER BY name');
      return res.json({ success: true, data: allClasses });
    }
    
    res.json({ success: true, data: classes });
  } catch (error) {
    logger.error('Get teacher classes error:', error);
    res.status(500).json({ success: false, message: 'Error fetching teacher classes' });
  }
});

// Create teacher
router.post('/', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { 
      email, password, firstName, lastName, employeeId,
      dateOfBirth, gender, phonePrimary, phoneSecondary,
      address, city, state, pincode, qualification,
      experienceYears, specialization, joiningDate, salary
    } = req.body;

    // Check if email exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create user
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password || 'teacher123', 10);
    
    await query(
      `INSERT INTO users (id, email, password, role, is_active, is_verified)
       VALUES ($1, $2, $3, 'teacher', true, true)`,
      [userId, email, hashedPassword]
    );

    // Create teacher
    const teacherId = uuidv4();
    await query(
      `INSERT INTO teachers (
        id, user_id, employee_id, first_name, last_name,
        date_of_birth, gender, phone_primary, phone_secondary,
        address, city, state, pincode, qualification,
        experience_years, specialization, joining_date, salary, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'active')`,
      [
        teacherId, userId, employeeId || null, firstName, lastName,
        dateOfBirth || null, gender || null, phonePrimary || null, phoneSecondary || null,
        address || null, city || null, state || null, pincode || null, qualification || null,
        experienceYears || 0, specialization || null, joiningDate || null, salary || null
      ]
    );

    const newTeacher = await query(`
      SELECT t.*, u.email 
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = $1
    `, [teacherId]);

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: newTeacher[0]
    });
  } catch (error) {
    logger.error('Create teacher error:', error);
    res.status(500).json({ success: false, message: 'Error creating teacher' });
  }
});

// Update teacher
router.put('/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { 
      firstName, lastName, employeeId,
      dateOfBirth, gender, phonePrimary, phoneSecondary,
      address, city, state, pincode, qualification,
      experienceYears, specialization, salary, status
    } = req.body;

    await query(
      `UPDATE teachers SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        employee_id = COALESCE($3, employee_id),
        date_of_birth = COALESCE($4, date_of_birth),
        gender = COALESCE($5, gender),
        phone_primary = COALESCE($6, phone_primary),
        phone_secondary = COALESCE($7, phone_secondary),
        address = COALESCE($8, address),
        city = COALESCE($9, city),
        state = COALESCE($10, state),
        pincode = COALESCE($11, pincode),
        qualification = COALESCE($12, qualification),
        experience_years = COALESCE($13, experience_years),
        specialization = COALESCE($14, specialization),
        salary = COALESCE($15, salary),
        status = COALESCE($16, status),
        updated_at = NOW()
       WHERE id = $17`,
      [
        firstName, lastName, employeeId,
        dateOfBirth, gender, phonePrimary, phoneSecondary,
        address, city, state, pincode, qualification,
        experienceYears, specialization, salary, status, req.params.id
      ]
    );

    const updated = await query(`
      SELECT t.*, u.email 
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = $1
    `, [req.params.id]);

    res.json({
      success: true,
      message: 'Teacher updated successfully',
      data: updated[0]
    });
  } catch (error) {
    logger.error('Update teacher error:', error);
    res.status(500).json({ success: false, message: 'Error updating teacher' });
  }
});

// Delete teacher
router.delete('/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const teacher = await query('SELECT user_id FROM teachers WHERE id = $1', [req.params.id]);
    if (teacher.length > 0 && teacher[0].user_id) {
      await query('DELETE FROM users WHERE id = $1', [teacher[0].user_id]);
    }
    await query('DELETE FROM teachers WHERE id = $1', [req.params.id]);
    res.json({
      success: true,
      message: 'Teacher deleted successfully'
    });
  } catch (error) {
    logger.error('Delete teacher error:', error);
    res.status(500).json({ success: false, message: 'Error deleting teacher' });
  }
});

export default router;
