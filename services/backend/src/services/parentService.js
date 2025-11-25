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
      idNumber
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
        phone_primary, phone_secondary, email_secondary, id_number
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
        idNumber || null
      ]
    );

    // Link parent to students if studentIds provided
    if (parentData.studentIds && Array.isArray(parentData.studentIds) && parentData.studentIds.length > 0) {
      for (const studentId of parentData.studentIds) {
        const linkId = uuidv4();
        await query(
          `INSERT INTO parent_students (id, parent_id, student_id, relationship, is_primary_contact, receive_notifications)
           VALUES (?, ?, ?, ?, TRUE, TRUE)`,
          [linkId, parentId, studentId, relationship]
        );
      }
      logger.info(`Parent ${parentId} linked to ${parentData.studentIds.length} student(s)`);
    }

    logger.info(`Parent created: ${email}`);

    return await this.getParentById(parentId);
  }

  // Get parent by parent.id
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
        ps.id as link_id,
        ps.relationship,
        ps.is_primary_contact,
        ps.can_pickup,
        ps.receive_notifications,
        s.id as student_id,
        s.id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.roll_number,
        s.status,
        s.profile_photo_url,
        s.date_of_birth,
        s.gender,
        c.id as class_id,
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

  // NEW: Get parent by user_id (for logged in parent users)
  async getParentByUserId(userId) {
    const results = await query(
      `SELECT
        p.*,
        u.email,
        u.last_login
       FROM parents p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.user_id = ?`,
      [userId]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Parent profile not found for this user');
    }

    const parent = results[0];

    // Get linked children with more details
    const children = await query(
      `SELECT
        ps.id as link_id,
        ps.relationship,
        ps.is_primary_contact,
        ps.can_pickup,
        ps.receive_notifications,
        s.id as student_id,
        s.id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.roll_number,
        s.status,
        s.profile_photo_url,
        s.date_of_birth,
        s.gender,
        c.id as class_id,
        c.name as class_name,
        c.section as section_name
       FROM parent_students ps
       JOIN students s ON ps.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE ps.parent_id = ?`,
      [parent.id]
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
    const allowedSortColumns = ['created_at', 'first_name', 'last_name', 'city'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    sql += ` ORDER BY p.${safeSortBy} ${safeSortOrder}`;
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
    // Check if parent exists
    await this.getParentById(id);

    const fieldMapping = {
      firstName: 'first_name',
      lastName: 'last_name',
      phonePrimary: 'phone_primary',
      phoneSecondary: 'phone_secondary',
      emailSecondary: 'email_secondary',
      idNumber: 'id_number',
      annualIncome: 'annual_income',
      profilePhotoUrl: 'profile_photo_url'
    };

    const updates = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && key !== 'studentIds') {
        const dbKey = fieldMapping[key] || key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        updates.push(`${dbKey} = ?`);
        values.push(updateData[key] === '' ? null : updateData[key]);
      }
    });

    if (updates.length > 0) {
      values.push(id);
      await query(
        `UPDATE parents SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );
    }

    // Handle student links if provided
    if (updateData.studentIds && Array.isArray(updateData.studentIds)) {
      // Remove existing links
      await query('DELETE FROM parent_students WHERE parent_id = ?', [id]);
      
      // Add new links
      for (const studentId of updateData.studentIds) {
        const linkId = uuidv4();
        await query(
          `INSERT INTO parent_students (id, parent_id, student_id, is_primary_contact, receive_notifications)
           VALUES (?, ?, ?, TRUE, TRUE)`,
          [linkId, id, studentId]
        );
      }
    }

    return await this.getParentById(id);
  }

  async deleteParent(id) {
    const parent = await this.getParentById(id);

    // Delete parent-student links first
    await query('DELETE FROM parent_students WHERE parent_id = ?', [id]);
    
    // Delete parent record
    await query('DELETE FROM parents WHERE id = ?', [id]);
    
    // Delete user account
    await query('DELETE FROM users WHERE id = ?', [parent.user_id]);

    return { message: 'Parent deleted successfully' };
  }

  async linkStudent(parentId, studentId, relationship = 'guardian', isPrimaryContact = false, canPickup = true) {
    // Verify parent exists
    await this.getParentById(parentId);

    // Check if link already exists
    const existingLink = await query(
      'SELECT id FROM parent_students WHERE parent_id = ? AND student_id = ?',
      [parentId, studentId]
    );

    if (existingLink.length > 0) {
      throw new ApiError(400, 'Student is already linked to this parent');
    }

    const linkId = uuidv4();
    await query(
      `INSERT INTO parent_students (id, parent_id, student_id, relationship, is_primary_contact, can_pickup, receive_notifications)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [linkId, parentId, studentId, relationship, isPrimaryContact, canPickup]
    );

    logger.info(`Student ${studentId} linked to parent ${parentId}`);

    return await this.getParentById(parentId);
  }

  async unlinkStudent(parentId, studentId) {
    const result = await query(
      'DELETE FROM parent_students WHERE parent_id = ? AND student_id = ?',
      [parentId, studentId]
    );

    if (result.affectedRows === 0) {
      throw new ApiError(404, 'Link not found');
    }

    logger.info(`Student ${studentId} unlinked from parent ${parentId}`);

    return { message: 'Student unlinked successfully' };
  }

  async updateStudentLink(parentId, studentId, updateData) {
    const { isPrimaryContact, canPickup, receiveNotifications } = updateData;

    const updates = [];
    const values = [];

    if (isPrimaryContact !== undefined) {
      updates.push('is_primary_contact = ?');
      values.push(isPrimaryContact);
    }
    if (canPickup !== undefined) {
      updates.push('can_pickup = ?');
      values.push(canPickup);
    }
    if (receiveNotifications !== undefined) {
      updates.push('receive_notifications = ?');
      values.push(receiveNotifications);
    }

    if (updates.length === 0) {
      throw new ApiError(400, 'No fields to update');
    }

    values.push(parentId, studentId);

    const result = await query(
      `UPDATE parent_students SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE parent_id = ? AND student_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      throw new ApiError(404, 'Link not found');
    }

    return await this.getParentById(parentId);
  }

  async getChildren(parentId) {
    const children = await query(
      `SELECT
        ps.id as link_id,
        ps.relationship,
        ps.is_primary_contact,
        ps.can_pickup,
        ps.receive_notifications,
        s.*,
        c.name as class_name,
        c.section as section_name
       FROM parent_students ps
       JOIN students s ON ps.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE ps.parent_id = ?`,
      [parentId]
    );

    return children;
  }

  async getChildAttendance(parentId, studentId, filters = {}) {
    // Verify parent has access to this student
    const link = await query(
      'SELECT id FROM parent_students WHERE parent_id = ? AND student_id = ?',
      [parentId, studentId]
    );

    if (link.length === 0) {
      throw new ApiError(403, 'You do not have access to this student');
    }

    let sql = `
      SELECT 
        a.*,
        s.first_name,
        s.last_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.student_id = ?
    `;
    const params = [studentId];

    if (filters.startDate) {
      sql += ' AND a.date >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      sql += ' AND a.date <= ?';
      params.push(filters.endDate);
    }

    sql += ' ORDER BY a.date DESC LIMIT 100';

    const attendance = await query(sql, params);

    // Calculate summary
    const summary = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
      FROM attendance
      WHERE student_id = ?
    `, [studentId]);

    return {
      records: attendance,
      summary: summary[0] || { total: 0, present: 0, absent: 0, late: 0 }
    };
  }

  async getChildAcademicReport(parentId, studentId, filters = {}) {
    // Verify parent has access to this student
    const link = await query(
      'SELECT id FROM parent_students WHERE parent_id = ? AND student_id = ?',
      [parentId, studentId]
    );

    if (link.length === 0) {
      throw new ApiError(403, 'You do not have access to this student');
    }

    const results = await query(`
      SELECT 
        er.*,
        e.name as exam_name,
        e.exam_type,
        sub.name as subject_name
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      LEFT JOIN subjects sub ON er.subject_id = sub.id
      WHERE er.student_id = ?
      ORDER BY e.start_date DESC
    `, [studentId]);

    return results;
  }

  async getChildFees(parentId, studentId) {
    // Verify parent has access to this student
    const link = await query(
      'SELECT id FROM parent_students WHERE parent_id = ? AND student_id = ?',
      [parentId, studentId]
    );

    if (link.length === 0) {
      throw new ApiError(403, 'You do not have access to this student');
    }

    const feeAccount = await query(`
      SELECT * FROM fee_accounts WHERE student_id = ?
    `, [studentId]);

    const invoices = await query(`
      SELECT * FROM fee_invoices WHERE student_id = ? ORDER BY due_date DESC
    `, [studentId]);

    const payments = await query(`
      SELECT * FROM fee_payments WHERE student_id = ? ORDER BY payment_date DESC
    `, [studentId]);

    return {
      account: feeAccount[0] || null,
      invoices,
      payments
    };
  }

  async getPaymentHistory(parentId) {
    const parent = await this.getParentById(parentId);
    
    // Get all children's student IDs
    const childIds = parent.children.map(c => c.student_id || c.id);
    
    if (childIds.length === 0) {
      return [];
    }

    const placeholders = childIds.map(() => '?').join(',');
    const payments = await query(`
      SELECT 
        fp.*,
        s.first_name,
        s.last_name
      FROM fee_payments fp
      JOIN students s ON fp.student_id = s.id
      WHERE fp.student_id IN (${placeholders})
      ORDER BY fp.payment_date DESC
    `, childIds);

    return payments;
  }

  async getNotifications(parentId, filters = {}) {
    const parent = await this.getParentById(parentId);

    let sql = `
      SELECT * FROM notifications 
      WHERE user_id = ?
    `;
    const params = [parent.user_id];

    if (filters.isRead !== undefined) {
      sql += ' AND is_read = ?';
      params.push(filters.isRead);
    }

    if (filters.type) {
      sql += ' AND type = ?';
      params.push(filters.type);
    }

    sql += ' ORDER BY created_at DESC';
    sql += ` LIMIT ${parseInt(filters.limit) || 50}`;

    const notifications = await query(sql, params);
    return notifications;
  }

  async markNotificationAsRead(parentId, notificationId) {
    const parent = await this.getParentById(parentId);

    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, parent.user_id]
    );

    return { message: 'Notification marked as read' };
  }

  async getMessages(parentId, filters = {}) {
    const parent = await this.getParentById(parentId);

    const messages = await query(`
      SELECT 
        m.*,
        u.email as sender_email
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.recipient_id = ?
      ORDER BY m.created_at DESC
      LIMIT ?
    `, [parent.user_id, parseInt(filters.limit) || 50]);

    return messages;
  }

  async getParentDashboard(parentId) {
    const parent = await this.getParentById(parentId);
    
    const childIds = parent.children.map(c => c.student_id || c.id);
    
    let totalFees = 0;
    let paidFees = 0;
    let pendingFees = 0;
    let attendanceSummary = { present: 0, absent: 0, late: 0, total: 0 };

    if (childIds.length > 0) {
      const placeholders = childIds.map(() => '?').join(',');
      
      // Get fee summary
      const feeSummary = await query(`
        SELECT 
          COALESCE(SUM(total_amount), 0) as total,
          COALESCE(SUM(paid_amount), 0) as paid,
          COALESCE(SUM(balance), 0) as pending
        FROM fee_accounts 
        WHERE student_id IN (${placeholders})
      `, childIds);

      if (feeSummary[0]) {
        totalFees = parseFloat(feeSummary[0].total) || 0;
        paidFees = parseFloat(feeSummary[0].paid) || 0;
        pendingFees = parseFloat(feeSummary[0].pending) || 0;
      }

      // Get attendance summary (last 30 days)
      const attendanceData = await query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
        FROM attendance
        WHERE student_id IN (${placeholders})
        AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `, childIds);

      if (attendanceData[0]) {
        attendanceSummary = attendanceData[0];
      }
    }

    // Get unread notifications count
    const notifCount = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [parent.user_id]
    );

    return {
      parent: {
        id: parent.id,
        first_name: parent.first_name,
        last_name: parent.last_name,
        email: parent.email
      },
      children: parent.children,
      childrenCount: parent.children.length,
      fees: {
        total: totalFees,
        paid: paidFees,
        pending: pendingFees
      },
      attendance: attendanceSummary,
      unreadNotifications: notifCount[0]?.count || 0
    };
  }

  async getParentStatistics() {
    const stats = await query(`
      SELECT
        COUNT(DISTINCT p.id) as total_parents,
        COUNT(DISTINCT ps.parent_id) as parents_with_children,
        COUNT(DISTINCT ps.student_id) as linked_students
      FROM parents p
      LEFT JOIN parent_students ps ON p.id = ps.parent_id
    `);

    const avgChildren = await query(`
      SELECT AVG(child_count) as avg_children
      FROM (
        SELECT parent_id, COUNT(*) as child_count
        FROM parent_students
        GROUP BY parent_id
      ) as counts
    `);

    return {
      total_parents: stats[0]?.total_parents || 0,
      parents_with_children: stats[0]?.parents_with_children || 0,
      linked_students: stats[0]?.linked_students || 0,
      avg_children_per_parent: parseFloat(avgChildren[0]?.avg_children || 0).toFixed(1)
    };
  }
}

export default new ParentService();
