import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get all teachers
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
      data: { teachers }
    });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ success: false, message: 'Error fetching teachers' });
  }
});

// Get single teacher
router.get('/:id', authenticate, async (req, res) => {
  try {
    const teachers = await query(`
      SELECT t.*, u.email 
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = $1
    `, [req.params.id]);
    
    if (teachers.length === 0) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    res.json({ success: true, data: teachers[0] });
  } catch (error) {
    console.error('Get teacher error:', error);
    res.status(500).json({ success: false, message: 'Error fetching teacher' });
  }
});

// Create teacher
router.post('/', authenticate, async (req, res) => {
  try {
    const { 
      email, password, first_name, last_name, employee_id,
      date_of_birth, gender, phone_primary, phone_secondary,
      address, city, state, pincode, qualification,
      experience_years, specialization, joining_date, salary
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
        teacherId, userId, employee_id || null, first_name, last_name,
        date_of_birth || null, gender || null, phone_primary || null, phone_secondary || null,
        address || null, city || null, state || null, pincode || null, qualification || null,
        experience_years || 0, specialization || null, joining_date || null, salary || null
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
    console.error('Create teacher error:', error);
    res.status(500).json({ success: false, message: 'Error creating teacher' });
  }
});

// Update teacher
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { 
      first_name, last_name, employee_id,
      date_of_birth, gender, phone_primary, phone_secondary,
      address, city, state, pincode, qualification,
      experience_years, specialization, salary, status
    } = req.body;

    await query(
      `UPDATE teachers SET
        first_name = $1, last_name = $2, employee_id = $3,
        date_of_birth = $4, gender = $5, phone_primary = $6, phone_secondary = $7,
        address = $8, city = $9, state = $10, pincode = $11, qualification = $12,
        experience_years = $13, specialization = $14, salary = $15, status = $16, updated_at = NOW()
       WHERE id = $17`,
      [
        first_name, last_name, employee_id,
        date_of_birth, gender, phone_primary, phone_secondary,
        address, city, state, pincode, qualification,
        experience_years, specialization, salary, status || 'active', req.params.id
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
    console.error('Update teacher error:', error);
    res.status(500).json({ success: false, message: 'Error updating teacher' });
  }
});

// Delete teacher
router.delete('/:id', authenticate, async (req, res) => {
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
    console.error('Delete teacher error:', error);
    res.status(500).json({ success: false, message: 'Error deleting teacher' });
  }
});

export default router;
