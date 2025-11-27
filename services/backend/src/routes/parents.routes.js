import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get all parents
router.get('/', authenticate, async (req, res) => {
  try {
    const parents = await query(`
      SELECT p.*, u.email, u.is_active,
        (SELECT COUNT(*) FROM parent_students ps WHERE ps.parent_id = p.id) as children_count
      FROM parents p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.first_name, p.last_name
    `);
    res.json({
      success: true,
      data: { parents }
    });
  } catch (error) {
    console.error('Get parents error:', error);
    res.status(500).json({ success: false, message: 'Error fetching parents' });
  }
});

// Get parent by user ID
router.get('/by-user/:userId', authenticate, async (req, res) => {
  try {
    const parents = await query(`
      SELECT p.*, u.email
      FROM parents p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1
    `, [req.params.userId]);
    
    if (parents.length === 0) {
      return res.status(404).json({ success: false, message: 'Parent not found' });
    }

    // Get children
    const children = await query(`
      SELECT s.*, c.name as class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      JOIN parent_students ps ON s.id = ps.student_id
      WHERE ps.parent_id = $1
    `, [parents[0].id]);

    res.json({ 
      success: true, 
      data: { ...parents[0], children } 
    });
  } catch (error) {
    console.error('Get parent error:', error);
    res.status(500).json({ success: false, message: 'Error fetching parent' });
  }
});

// Get single parent
router.get('/:id', authenticate, async (req, res) => {
  try {
    const parents = await query(`
      SELECT p.*, u.email
      FROM parents p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [req.params.id]);
    
    if (parents.length === 0) {
      return res.status(404).json({ success: false, message: 'Parent not found' });
    }
    res.json({ success: true, data: parents[0] });
  } catch (error) {
    console.error('Get parent error:', error);
    res.status(500).json({ success: false, message: 'Error fetching parent' });
  }
});

// Create parent
router.post('/', authenticate, async (req, res) => {
  try {
    const { 
      email, password, first_name, last_name, relationship,
      occupation, phone_primary, phone_secondary,
      address, city, state, pincode, studentIds
    } = req.body;

    // Check if email exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create user
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password || 'parent123', 10);
    
    await query(
      `INSERT INTO users (id, email, password, role, is_active, is_verified)
       VALUES ($1, $2, $3, 'parent', true, true)`,
      [userId, email, hashedPassword]
    );

    // Create parent
    const parentId = uuidv4();
    await query(
      `INSERT INTO parents (
        id, user_id, first_name, last_name, relationship,
        occupation, phone_primary, phone_secondary,
        address, city, state, pincode
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        parentId, userId, first_name, last_name, relationship || 'guardian',
        occupation || null, phone_primary || null, phone_secondary || null,
        address || null, city || null, state || null, pincode || null
      ]
    );

    // Link students if provided
    if (studentIds && studentIds.length > 0) {
      for (const studentId of studentIds) {
        const linkId = uuidv4();
        await query(
          `INSERT INTO parent_students (id, parent_id, student_id, relationship)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [linkId, parentId, studentId, relationship || 'guardian']
        );
      }
    }

    const newParent = await query(`
      SELECT p.*, u.email
      FROM parents p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [parentId]);

    res.status(201).json({
      success: true,
      message: 'Parent created successfully',
      data: newParent[0]
    });
  } catch (error) {
    console.error('Create parent error:', error);
    res.status(500).json({ success: false, message: 'Error creating parent' });
  }
});

// Link student to parent
router.post('/:id/link-student', authenticate, async (req, res) => {
  try {
    const { studentId, relationship } = req.body;
    const parentId = req.params.id;
    
    const linkId = uuidv4();
    await query(
      `INSERT INTO parent_students (id, parent_id, student_id, relationship)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [linkId, parentId, studentId, relationship || 'guardian']
    );

    res.json({
      success: true,
      message: 'Student linked successfully'
    });
  } catch (error) {
    console.error('Link student error:', error);
    res.status(500).json({ success: false, message: 'Error linking student' });
  }
});

// Update parent
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { 
      first_name, last_name, relationship,
      occupation, phone_primary, phone_secondary,
      address, city, state, pincode
    } = req.body;

    await query(
      `UPDATE parents SET
        first_name = $1, last_name = $2, relationship = $3,
        occupation = $4, phone_primary = $5, phone_secondary = $6,
        address = $7, city = $8, state = $9, pincode = $10, updated_at = NOW()
       WHERE id = $11`,
      [
        first_name, last_name, relationship,
        occupation, phone_primary, phone_secondary,
        address, city, state, pincode, req.params.id
      ]
    );

    const updated = await query(`
      SELECT p.*, u.email
      FROM parents p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [req.params.id]);

    res.json({
      success: true,
      message: 'Parent updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Update parent error:', error);
    res.status(500).json({ success: false, message: 'Error updating parent' });
  }
});

// Delete parent
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const parent = await query('SELECT user_id FROM parents WHERE id = $1', [req.params.id]);
    if (parent.length > 0 && parent[0].user_id) {
      await query('DELETE FROM users WHERE id = $1', [parent[0].user_id]);
    }
    await query('DELETE FROM parents WHERE id = $1', [req.params.id]);
    res.json({
      success: true,
      message: 'Parent deleted successfully'
    });
  } catch (error) {
    console.error('Delete parent error:', error);
    res.status(500).json({ success: false, message: 'Error deleting parent' });
  }
});

export default router;
