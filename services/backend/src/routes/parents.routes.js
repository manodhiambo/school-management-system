import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';

const router = express.Router();

// Get all parents - returns array directly
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
      data: parents
    });
  } catch (error) {
    logger.error('Get parents error:', error);
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
    logger.error('Get parent error:', error);
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
    logger.error('Get parent error:', error);
    res.status(500).json({ success: false, message: 'Error fetching parent' });
  }
});

// Create parent
router.post('/', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { 
      email, password, firstName, lastName, relationship,
      occupation, phonePrimary, phoneSecondary,
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
        parentId, userId, firstName, lastName, relationship || 'guardian',
        occupation || null, phonePrimary || null, phoneSecondary || null,
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
    logger.error('Create parent error:', error);
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
    logger.error('Link student error:', error);
    res.status(500).json({ success: false, message: 'Error linking student' });
  }
});

// Update parent
router.put('/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { 
      firstName, lastName, relationship,
      occupation, phonePrimary, phoneSecondary,
      address, city, state, pincode
    } = req.body;

    await query(
      `UPDATE parents SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        relationship = COALESCE($3, relationship),
        occupation = COALESCE($4, occupation),
        phone_primary = COALESCE($5, phone_primary),
        phone_secondary = COALESCE($6, phone_secondary),
        address = COALESCE($7, address),
        city = COALESCE($8, city),
        state = COALESCE($9, state),
        pincode = COALESCE($10, pincode),
        updated_at = NOW()
       WHERE id = $11`,
      [
        firstName, lastName, relationship,
        occupation, phonePrimary, phoneSecondary,
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
    logger.error('Update parent error:', error);
    res.status(500).json({ success: false, message: 'Error updating parent' });
  }
});

// Delete parent
router.delete('/:id', authenticate, requireRole(['admin']), async (req, res) => {
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
    logger.error('Delete parent error:', error);
    res.status(500).json({ success: false, message: 'Error deleting parent' });
  }
});

export default router;

// Unlink student from parent
router.delete('/:id/unlink-student/:studentId', authenticate, async (req, res) => {
  try {
    const { id: parentId, studentId } = req.params;
    
    await query(
      'DELETE FROM parent_students WHERE parent_id = $1 AND student_id = $2',
      [parentId, studentId]
    );

    res.json({
      success: true,
      message: 'Student unlinked successfully'
    });
  } catch (error) {
    logger.error('Unlink student error:', error);
    res.status(500).json({ success: false, message: 'Error unlinking student' });
  }
});
