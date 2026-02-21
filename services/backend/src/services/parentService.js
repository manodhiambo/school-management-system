import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class ParentService {
  async createParent(data, tenantId) {
    const {
      email, password, firstName, lastName, relationship,
      occupation, phonePrimary, phoneSecondary, address,
      city, state, pincode, studentIds
    } = data;

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.length > 0) {
      throw new ApiError(400, 'Email already registered');
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password || 'parent123', 10);

    await query(
      `INSERT INTO users (id, email, password, role, tenant_id, is_active, is_verified)
       VALUES ($1, $2, $3, 'parent', $4, true, true)`,
      [userId, email, hashedPassword, tenantId]
    );

    const parentId = uuidv4();
    await query(
      `INSERT INTO parents (
        id, user_id, first_name, last_name, relationship,
        occupation, phone_primary, phone_secondary, address,
        city, state, pincode, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        parentId, userId, firstName, lastName, relationship || 'guardian',
        occupation || null, phonePrimary || null, phoneSecondary || null,
        address || null, city || null, state || null, pincode || null, tenantId
      ]
    );

    if (studentIds && studentIds.length > 0) {
      for (const studentId of studentIds) {
        await this.linkStudent(parentId, studentId, relationship);
      }
    }

    logger.info(`Parent created: ${firstName} ${lastName}`);
    return await this.getParentById(parentId, tenantId);
  }

  async getParents(filters = {}, pagination = {}, tenantId) {
    const { search, relationship } = filters;
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT p.*, u.email, u.is_active,
        (SELECT COUNT(*) FROM parent_students ps WHERE ps.parent_id = p.id) as children_count
      FROM parents p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

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

  async getParentById(id, tenantId) {
    const results = await query(
      `SELECT p.*, u.email, u.is_active
       FROM parents p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = $1${tenantId ? ' AND p.tenant_id = $2' : ''}`,
      tenantId ? [id, tenantId] : [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Parent not found');
    }

    return results[0];
  }

  async getParentByUserId(userId, tenantId) {
    const results = await query(
      `SELECT p.*, u.email, u.is_active
       FROM parents p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1${tenantId ? ' AND p.tenant_id = $2' : ''}`,
      tenantId ? [userId, tenantId] : [userId]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Parent not found');
    }

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

  async updateParent(id, data, tenantId) {
    await this.getParentById(id, tenantId);

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

    return await this.getParentById(id, tenantId);
  }

  async deleteParent(id, tenantId) {
    const parent = await this.getParentById(id, tenantId);

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

  async updateStudentLink(parentId, studentId, data) {
    await query(
      `UPDATE parent_students SET
        is_primary_contact = COALESCE($1, is_primary_contact),
        updated_at = NOW()
       WHERE parent_id = $2 AND student_id = $3`,
      [data.isPrimaryContact, parentId, studentId]
    );
    return { message: 'Student link updated' };
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

  async getChildAttendance(parentId, studentId, filters) {
    return await query(
      `SELECT * FROM attendance WHERE student_id = $1 ORDER BY date DESC LIMIT 30`,
      [studentId]
    );
  }

  async getChildAcademicReport(parentId, studentId, filters) {
    return await query(
      `SELECT er.*, e.name as exam_name, s.name as subject_name
       FROM exam_results er
       JOIN exams e ON er.exam_id = e.id
       LEFT JOIN subjects s ON er.subject_id = s.id
       WHERE er.student_id = $1
       ORDER BY e.start_date DESC`,
      [studentId]
    );
  }

  async getChildFees(parentId, studentId) {
    const invoices = await query(
      'SELECT * FROM fee_invoices WHERE student_id = $1 ORDER BY created_at DESC',
      [studentId]
    );
    return { invoices };
  }

  async getPaymentHistory(parentId) {
    const parent = await this.getParentById(parentId);
    const children = await this.getChildren(parentId);
    if (children.length === 0) return [];

    const studentIds = children.map(c => c.id);
    return await query(
      `SELECT fp.* FROM fee_payments fp
       JOIN fee_invoices fi ON fp.invoice_id = fi.id
       WHERE fi.student_id = ANY($1)
       ORDER BY fp.payment_date DESC`,
      [studentIds]
    );
  }

  async getNotifications(parentId, filters) {
    return [];
  }

  async markNotificationAsRead(parentId, notificationId) {
    return { message: 'Notification marked as read' };
  }

  async getMessages(parentId, filters) {
    return [];
  }

  async getParentDashboard(parentId) {
    const parent = await this.getParentById(parentId);
    const children = await this.getChildren(parentId);
    return { parent, children };
  }

  async getParentStatistics(tenantId) {
    const stats = await query(
      `SELECT COUNT(*) as total FROM parents${tenantId ? ' WHERE tenant_id = $1' : ''}`,
      tenantId ? [tenantId] : []
    );
    return stats[0];
  }
}

export default new ParentService();
