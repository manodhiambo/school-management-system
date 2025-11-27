import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class ParentService {
  async createParent(data) {
    const {
      email, password, firstName, lastName, relationship,
      occupation, phonePrimary, phoneSecondary, address,
      city, state, pincode, studentIds
    } = data;

    // Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.length > 0) {
      throw new ApiError(400, 'Email already registered');
    }

    // Create user account
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password || 'parent123', 10);
    
    await query(
      `INSERT INTO users (id, email, password, role, is_active, is_verified)
       VALUES ($1, $2, $3, 'parent', true, true)`,
      [userId, email, hashedPassword]
    );

    // Create parent profile
    const parentId = uuidv4();
    await query(
      `INSERT INTO parents (
        id, user_id, first_name, last_name, relationship,
        occupation, phone_primary, phone_secondary, address,
        city, state, pincode
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
        await this.linkStudent(parentId, studentId, relationship);
      }
    }

    logger.info(`Parent created: ${firstName} ${lastName}`);
    return await this.getParentById(parentId);
  }

  async getParents(filters = {}, pagination = {}) {
    const { search, relationship } = filters;
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT p.*, u.email, u.is_active,
        (SELECT COUNT(*) FROM parent_students ps WHERE ps.parent_id = p.id) as children_count
      FROM parents p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND (p.first_name ILIKE $${paramIndex} OR p.last_name ILIKE $${paramIndex} OR p.phone_primary ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (relationship) {
      sql += ` AND p.relationship = $${paramIndex}`;
      params.push(relationship);
      paramIndex++;
    }

    sql += ' ORDER BY p.created_at DESC';
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const parents = await query(sql, params);

    return {
      parents,
      pagination: { page, limit }
    };
  }

  async getParentById(id) {
    const results = await query(
      `SELECT p.*, u.email, u.is_active
       FROM parents p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Parent not found');
    }

    return results[0];
  }

  async getParentByUserId(userId) {
    const results = await query(
      `SELECT p.*, u.email, u.is_active
       FROM parents p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1`,
      [userId]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Parent not found');
    }

    // Get children
    const children = await query(
      `SELECT s.*, c.name as class_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       JOIN parent_students ps ON s.id = ps.student_id
       WHERE ps.parent_id = $1`,
      [results[0].id]
    );

    return {
      ...results[0],
      children
    };
  }

  async updateParent(id, data) {
    await this.getParentById(id);

    const updates = [];
    const values = [];
    let paramIndex = 1;

    const fieldMap = {
      firstName: 'first_name',
      lastName: 'last_name',
      relationship: 'relationship',
      occupation: 'occupation',
      phonePrimary: 'phone_primary',
      phoneSecondary: 'phone_secondary',
      address: 'address',
      city: 'city',
      state: 'state',
      pincode: 'pincode'
    };

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && fieldMap[key]) {
        updates.push(`${fieldMap[key]} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    });

    if (updates.length > 0) {
      values.push(id);
      await query(
        `UPDATE parents SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
        values
      );
    }

    return await this.getParentById(id);
  }

  async deleteParent(id) {
    const parent = await this.getParentById(id);
    
    if (parent.user_id) {
      await query('DELETE FROM users WHERE id = $1', [parent.user_id]);
    }
    
    await query('DELETE FROM parents WHERE id = $1', [id]);
    return { message: 'Parent deleted successfully' };
  }

  async linkStudent(parentId, studentId, relationship) {
    const linkId = uuidv4();
    await query(
      `INSERT INTO parent_students (id, parent_id, student_id, relationship, is_primary_contact)
       VALUES ($1, $2, $3, $4, false)
       ON CONFLICT (parent_id, student_id) DO NOTHING`,
      [linkId, parentId, studentId, relationship || 'guardian']
    );
    return { message: 'Student linked successfully' };
  }

  async unlinkStudent(parentId, studentId) {
    await query(
      'DELETE FROM parent_students WHERE parent_id = $1 AND student_id = $2',
      [parentId, studentId]
    );
    return { message: 'Student unlinked successfully' };
  }

  async getChildren(parentId) {
    return await query(
      `SELECT s.*, c.name as class_name, ps.relationship, ps.is_primary_contact
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       JOIN parent_students ps ON s.id = ps.student_id
       WHERE ps.parent_id = $1`,
      [parentId]
    );
  }

  async getStatistics() {
    const stats = await query(`
      SELECT COUNT(*) as total FROM parents
    `);
    return stats[0];
  }
}

export default new ParentService();
