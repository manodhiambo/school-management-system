import { query, getClient } from '../config/database.js';
import logger from '../utils/logger.js';

// Get all library members (for admin)
export const getAllMembers = async (req, res) => {
  try {
    const result = await query(`
      SELECT lm.*, u.email, u.role,
        COALESCE(s.first_name, t.first_name) AS first_name,
        COALESCE(s.last_name, t.last_name) AS last_name,
        COALESCE(s.admission_number, t.employee_id) AS reference_number
      FROM library_members lm
      JOIN users u ON lm.user_id = u.id
      LEFT JOIN students s ON lm.student_id = s.id
      LEFT JOIN teachers t ON lm.teacher_id = t.id
      ORDER BY lm.created_at DESC
    `);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get all members error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all users without library membership
export const getUsersWithoutMembership = async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.email, u.role,
        COALESCE(s.first_name, t.first_name) AS first_name,
        COALESCE(s.last_name, t.last_name) AS last_name,
        COALESCE(s.admission_number, t.employee_id) AS reference_number,
        COALESCE(s.id, t.id) AS profile_id
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id AND u.role = 'student'
      LEFT JOIN teachers t ON u.id = t.user_id AND u.role = 'teacher'
      LEFT JOIN library_members lm ON u.id = lm.user_id
      WHERE lm.id IS NULL
        AND u.role IN ('student', 'teacher', 'admin')
        AND u.is_active = TRUE
      ORDER BY u.role, COALESCE(s.first_name, t.first_name)
    `);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get users without membership error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create library member (admin)
export const createMember = async (req, res) => {
  try {
    const { user_id, max_books_allowed, max_days_allowed } = req.body;

    const users = await query('SELECT * FROM users WHERE id = ?', [user_id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];
    let studentId = null;
    let teacherId = null;
    let memberType = 'staff';
    let maxBooks = max_books_allowed || 3;
    let maxDays = max_days_allowed || 14;

    if (user.role === 'student') {
      const student = await query('SELECT id FROM students WHERE user_id = ?', [user_id]);
      if (student.length > 0) {
        studentId = student[0].id;
        memberType = 'student';
      }
    } else if (user.role === 'teacher') {
      const teacher = await query('SELECT id FROM teachers WHERE user_id = ?', [user_id]);
      if (teacher.length > 0) {
        teacherId = teacher[0].id;
        memberType = 'teacher';
        maxBooks = maxBooks || 5;
        maxDays = maxDays || 30;
      }
    }

    const memberNumber = `LIB${Date.now()}`;

    const result = await query(
      `INSERT INTO library_members (
        user_id, student_id, teacher_id, member_type,
        membership_number, max_books_allowed, max_days_allowed
      ) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [user_id, studentId, teacherId, memberType, memberNumber, maxBooks, maxDays]
    );

    logger.info(`Library member created: ${memberNumber} for user ${user_id}`);
    res.status(201).json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Create member error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update library member
export const updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { max_books_allowed, max_days_allowed, status, is_blocked, block_reason } = req.body;

    const updates = [];
    const values = [];

    if (max_books_allowed !== undefined) {
      updates.push('max_books_allowed = ?');
      values.push(max_books_allowed);
    }
    if (max_days_allowed !== undefined) {
      updates.push('max_days_allowed = ?');
      values.push(max_days_allowed);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (is_blocked !== undefined) {
      updates.push('is_blocked = ?');
      values.push(is_blocked);
    }
    if (block_reason !== undefined) {
      updates.push('block_reason = ?');
      values.push(block_reason);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await query(
      `UPDATE library_members SET ${updates.join(', ')} WHERE id = ? RETURNING *`,
      values
    );

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Update member error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete/deactivate library member
export const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    const activeBorrowings = await query(
      'SELECT COUNT(*) AS count FROM library_borrowings WHERE member_id = ? AND status = ?',
      [id, 'issued']
    );

    if (parseInt(activeBorrowings[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate member with active borrowings'
      });
    }

    await query('UPDATE library_members SET status = ? WHERE id = ?', ['inactive', id]);

    res.json({ success: true, message: 'Member deactivated successfully' });
  } catch (error) {
    logger.error('Delete member error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get book categories
export const getCategories = async (req, res) => {
  try {
    const result = await query(`
      SELECT category, COUNT(*) AS count
      FROM library_books
      WHERE is_active = TRUE AND category IS NOT NULL
      GROUP BY category
      ORDER BY category
    `);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Barcode/QR code search
export const searchByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;

    const result = await query(
      `SELECT * FROM library_books
       WHERE is_active = TRUE
       AND (isbn = ? OR keywords ILIKE ?)
       LIMIT 1`,
      [barcode, `%${barcode}%`]
    );

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    res.json({ success: true, data: result[0] });
  } catch (error) {
    logger.error('Search by barcode error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

