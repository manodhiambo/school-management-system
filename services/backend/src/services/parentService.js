import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import passwordService from './passwordService.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class ParentService {
  async createParent(parentData) {
    const {
      email,
      password,
      firstName,
      lastName,
      relationship,
      occupation,
      annualIncome,
      education,
      address,
      city,
      state,
      pincode,
      phonePrimary,
      phoneSecondary,
      emailSecondary,
      aadharNumber
    } = parentData;

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
       VALUES (?, ?, ?, 'parent', TRUE)`,
      [userId, email, hashedPassword]
    );

    // Create parent record
    const parentId = uuidv4();
    await query(
      `INSERT INTO parents (
        id, user_id, first_name, last_name, relationship,
        occupation, annual_income, education,
        address, city, state, pincode,
        phone_primary, phone_secondary, email_secondary, aadhar_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parentId,
        userId,
        firstName,
        lastName,
        relationship,
        occupation || null,
        annualIncome || null,
        education || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        phonePrimary,
        phoneSecondary || null,
        emailSecondary || null,
        aadharNumber || null
      ]
    );

    logger.info(`Parent created: ${email}`);

    return await this.getParentById(parentId);
  }

  async getParentById(id) {
    const results = await query(
      `SELECT
        p.*,
        u.email,
        u.last_login
       FROM parents p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Parent not found');
    }

    const parent = results[0];

    // Get linked children
    const children = await query(
      `SELECT
        ps.*,
        s.id as student_id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.roll_number,
        s.status,
        s.profile_photo_url,
        c.name as class_name,
        c.section as section_name
       FROM parent_students ps
       JOIN students s ON ps.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE ps.parent_id = ?`,
      [id]
    );

    parent.children = children;

    return parent;
  }

  async getParents(filters = {}, pagination = {}) {
    const {
      search,
      relationship,
      city,
      hasChildren
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = pagination;

    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push(
        '(p.first_name LIKE ? OR p.last_name LIKE ? OR p.phone_primary LIKE ? OR u.email LIKE ?)'
      );
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (relationship) {
      whereConditions.push('p.relationship = ?');
      queryParams.push(relationship);
    }

    if (city) {
      whereConditions.push('p.city = ?');
      queryParams.push(city);
    }

    let sql = `
      SELECT
        p.*,
        u.email,
        u.is_active,
        COUNT(DISTINCT ps.student_id) as children_count
      FROM parents p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN parent_students ps ON p.id = ps.parent_id
    `;

    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }

    sql += ' GROUP BY p.id';

    if (hasChildren !== undefined) {
      sql += hasChildren ? ' HAVING children_count > 0' : ' HAVING children_count = 0';
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) as temp`;
    const countResult = await query(countSql, queryParams);
    const total = countResult[0]?.total || 0;

    // Add sorting and pagination
    sql += ` ORDER BY p.${sortBy} ${sortOrder}`;
    sql += ` LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    const parents = await query(sql, queryParams);

    return {
      parents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateParent(id, updateData) {
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
      `UPDATE parents SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    return await this.getParentById(id);
  }

  async deleteParent(id) {
    const parent = await this.getParentById(id);

    await query('DELETE FROM parents WHERE id = ?', [id]);
    await query('DELETE FROM users WHERE id = ?', [parent.user_id]);

    return { message: 'Parent deleted successfully' };
  }

  async linkStudent(parentId, studentId) {
    const linkId = uuidv4();
    
    await query(
      'INSERT INTO parent_students (id, parent_id, student_id) VALUES (?, ?, ?)',
      [linkId, parentId, studentId]
    );

    logger.info(`Student ${studentId} linked to parent ${parentId}`);

    return { message: 'Student linked successfully' };
  }

  async unlinkStudent(parentId, studentId) {
    await query(
      'DELETE FROM parent_students WHERE parent_id = ? AND student_id = ?',
      [parentId, studentId]
    );

    logger.info(`Student ${studentId} unlinked from parent ${parentId}`);

    return { message: 'Student unlinked successfully' };
  }

  async getStatistics() {
    const stats = await query(`
      SELECT
        COUNT(*) as total_parents,
        COUNT(DISTINCT ps.parent_id) as parents_with_children,
        AVG(child_count) as avg_children_per_parent
      FROM parents p
      LEFT JOIN (
        SELECT parent_id, COUNT(*) as child_count
        FROM parent_students
        GROUP BY parent_id
      ) ps ON p.id = ps.parent_id
    `);

    return stats[0] || {};
  }
}

export default new ParentService();
