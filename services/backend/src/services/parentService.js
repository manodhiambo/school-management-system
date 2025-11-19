import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import passwordService from './passwordService.js';

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
        parentId, userId, firstName, lastName, relationship,
        occupation, annualIncome, education,
        address, city, state, pincode,
        phonePrimary, phoneSecondary, emailSecondary, aadharNumber
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

    if (hasChildren !== undefined) {
      if (hasChildren) {
        whereConditions.push('EXISTS (SELECT 1 FROM parent_students ps WHERE ps.parent_id = p.id)');
      } else {
        whereConditions.push('NOT EXISTS (SELECT 1 FROM parent_students ps WHERE ps.parent_id = p.id)');
      }
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM parents p
      LEFT JOIN users u ON p.user_id = u.id
      ${whereClause}
    `;

    const countResults = await query(countQuery, queryParams);
    const total = countResults[0].total;

    // Get parents
    const parentsQuery = `
      SELECT 
        p.*,
        u.email,
        (SELECT COUNT(*) FROM parent_students ps WHERE ps.parent_id = p.id) as children_count
      FROM parents p
      LEFT JOIN users u ON p.user_id = u.id
      ${whereClause}
      ORDER BY p.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);
    const parents = await query(parentsQuery, queryParams);

    return {
      parents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateParent(id, updateData) {
    await this.getParentById(id);

    const {
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
      aadharNumber,
      profilePhotoUrl
    } = updateData;

    const updateFields = [];
    const updateValues = [];

    if (firstName !== undefined) {
      updateFields.push('first_name = ?');
      updateValues.push(firstName);
    }
    if (lastName !== undefined) {
      updateFields.push('last_name = ?');
      updateValues.push(lastName);
    }
    if (relationship !== undefined) {
      updateFields.push('relationship = ?');
      updateValues.push(relationship);
    }
    if (occupation !== undefined) {
      updateFields.push('occupation = ?');
      updateValues.push(occupation);
    }
    if (annualIncome !== undefined) {
      updateFields.push('annual_income = ?');
      updateValues.push(annualIncome);
    }
    if (education !== undefined) {
      updateFields.push('education = ?');
      updateValues.push(education);
    }
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(address);
    }
    if (city !== undefined) {
      updateFields.push('city = ?');
      updateValues.push(city);
    }
    if (state !== undefined) {
      updateFields.push('state = ?');
      updateValues.push(state);
    }
    if (pincode !== undefined) {
      updateFields.push('pincode = ?');
      updateValues.push(pincode);
    }
    if (phonePrimary !== undefined) {
      updateFields.push('phone_primary = ?');
      updateValues.push(phonePrimary);
    }
    if (phoneSecondary !== undefined) {
      updateFields.push('phone_secondary = ?');
      updateValues.push(phoneSecondary);
    }
    if (emailSecondary !== undefined) {
      updateFields.push('email_secondary = ?');
      updateValues.push(emailSecondary);
    }
    if (aadharNumber !== undefined) {
      updateFields.push('aadhar_number = ?');
      updateValues.push(aadharNumber);
    }
    if (profilePhotoUrl !== undefined) {
      updateFields.push('profile_photo_url = ?');
      updateValues.push(profilePhotoUrl);
    }

    if (updateFields.length === 0) {
      return await this.getParentById(id);
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    await query(
      `UPDATE parents SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    logger.info(`Parent updated: ${id}`);

    return await this.getParentById(id);
  }

  async linkStudent(parentId, studentId, relationship, isPrimaryContact = false, canPickup = false) {
    // Check if parent exists
    await this.getParentById(parentId);

    // Check if student exists
    const students = await query(
      'SELECT * FROM students WHERE id = ?',
      [studentId]
    );

    if (students.length === 0) {
      throw new ApiError(404, 'Student not found');
    }

    // Check if link already exists
    const existing = await query(
      'SELECT * FROM parent_students WHERE parent_id = ? AND student_id = ?',
      [parentId, studentId]
    );

    if (existing.length > 0) {
      throw new ApiError(400, 'Student already linked to this parent');
    }

    // Create link
    const linkId = uuidv4();
    await query(
      `INSERT INTO parent_students 
       (id, parent_id, student_id, relationship, is_primary_contact, can_pickup, receive_notifications)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [linkId, parentId, studentId, relationship, isPrimaryContact, canPickup]
    );

    // Update student's parent_id if this is primary contact
    if (isPrimaryContact) {
      await query(
        'UPDATE students SET parent_id = ? WHERE id = ?',
        [parentId, studentId]
      );

      // Remove primary contact from other parents for this student
      await query(
        'UPDATE parent_students SET is_primary_contact = FALSE WHERE student_id = ? AND parent_id != ?',
        [studentId, parentId]
      );
    }

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

    // Update student's parent_id if this was the primary parent
    await query(
      'UPDATE students SET parent_id = NULL WHERE id = ? AND parent_id = ?',
      [studentId, parentId]
    );

    logger.info(`Student ${studentId} unlinked from parent ${parentId}`);

    return { message: 'Student unlinked successfully' };
  }

  async updateStudentLink(parentId, studentId, updateData) {
    const { isPrimaryContact, canPickup, receiveNotifications } = updateData;

    const updateFields = [];
    const updateValues = [];

    if (isPrimaryContact !== undefined) {
      updateFields.push('is_primary_contact = ?');
      updateValues.push(isPrimaryContact);

      if (isPrimaryContact) {
        // Update student's primary parent
        await query(
          'UPDATE students SET parent_id = ? WHERE id = ?',
          [parentId, studentId]
        );

        // Remove primary from others
        await query(
          'UPDATE parent_students SET is_primary_contact = FALSE WHERE student_id = ? AND parent_id != ?',
          [studentId, parentId]
        );
      }
    }

    if (canPickup !== undefined) {
      updateFields.push('can_pickup = ?');
      updateValues.push(canPickup);
    }

    if (receiveNotifications !== undefined) {
      updateFields.push('receive_notifications = ?');
      updateValues.push(receiveNotifications);
    }

    if (updateFields.length === 0) {
      return { message: 'No updates to apply' };
    }

    updateValues.push(parentId, studentId);

    const result = await query(
      `UPDATE parent_students SET ${updateFields.join(', ')} 
       WHERE parent_id = ? AND student_id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      throw new ApiError(404, 'Link not found');
    }

    logger.info(`Updated link between parent ${parentId} and student ${studentId}`);

    return await this.getParentById(parentId);
  }

  async getChildren(parentId) {
    const children = await query(
      `SELECT 
        ps.*,
        s.id as student_id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.roll_number,
        s.date_of_birth,
        s.gender,
        s.blood_group,
        s.status,
        s.profile_photo_url,
        c.name as class_name,
        c.section as section_name,
        c.id as class_id
       FROM parent_students ps
       JOIN students s ON ps.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE ps.parent_id = ?
       ORDER BY s.first_name`,
      [parentId]
    );

    return children;
  }

  async getChildAttendance(parentId, studentId, filters = {}) {
    // Verify parent-student relationship
    const link = await query(
      'SELECT * FROM parent_students WHERE parent_id = ? AND student_id = ?',
      [parentId, studentId]
    );

    if (link.length === 0) {
      throw new ApiError(403, 'Not authorized to view this student\'s attendance');
    }

    const { startDate, endDate, month } = filters;

    let whereConditions = ['student_id = ?'];
    let queryParams = [studentId];

    if (startDate && endDate) {
      whereConditions.push('date BETWEEN ? AND ?');
      queryParams.push(startDate, endDate);
    } else if (month) {
      whereConditions.push('DATE_FORMAT(date, "%Y-%m") = ?');
      queryParams.push(month);
    }

    const attendance = await query(
      `SELECT * FROM attendance 
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY date DESC`,
      queryParams
    );

    // Get summary
    const summary = await query(
      `SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
        ROUND(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as attendance_percentage
       FROM attendance
       WHERE ${whereConditions.join(' AND ')}`,
      queryParams
    );

    return {
      attendance,
      summary: summary[0]
    };
  }

  async getChildAcademicReport(parentId, studentId, filters = {}) {
    // Verify relationship
    const link = await query(
      'SELECT * FROM parent_students WHERE parent_id = ? AND student_id = ?',
      [parentId, studentId]
    );

    if (link.length === 0) {
      throw new ApiError(403, 'Not authorized to view this student\'s academic report');
    }

    const { session, examId } = filters;

    let whereConditions = ['er.student_id = ?'];
    let queryParams = [studentId];

    if (session) {
      whereConditions.push('e.session = ?');
      queryParams.push(session);
    }

    if (examId) {
      whereConditions.push('er.exam_id = ?');
      queryParams.push(examId);
    }

    const results = await query(
      `SELECT 
        er.*,
        e.name as exam_name,
        e.type as exam_type,
        e.max_marks,
        e.passing_marks,
        s.name as subject_name,
        s.code as subject_code
       FROM exam_results er
       JOIN exams e ON er.exam_id = e.id
       JOIN subjects s ON er.subject_id = s.id
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY e.start_date DESC, s.name`,
      queryParams
    );

    return results;
  }

  async getChildFees(parentId, studentId) {
    // Verify relationship
    const link = await query(
      'SELECT * FROM parent_students WHERE parent_id = ? AND student_id = ?',
      [parentId, studentId]
    );

    if (link.length === 0) {
      throw new ApiError(403, 'Not authorized to view this student\'s fees');
    }

    // Get invoices
    const invoices = await query(
      `SELECT * FROM fee_invoices 
       WHERE student_id = ?
       ORDER BY month DESC`,
      [studentId]
    );

    // Get payments
    const payments = await query(
      `SELECT fp.*, fi.invoice_number
       FROM fee_payments fp
       JOIN fee_invoices fi ON fp.invoice_id = fi.id
       WHERE fi.student_id = ?
       ORDER BY fp.payment_date DESC`,
      [studentId]
    );

    // Get summary
    const summary = await query(
      `SELECT 
        SUM(net_amount) as total_amount,
        SUM(paid_amount) as total_paid,
        SUM(balance_amount) as total_balance,
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_invoices
       FROM fee_invoices
       WHERE student_id = ?`,
      [studentId]
    );

    return {
      invoices,
      payments,
      summary: summary[0]
    };
  }

  async getPaymentHistory(parentId) {
    // Get all payments for all children
    const payments = await query(
      `SELECT 
        fp.*,
        fi.invoice_number,
        fi.month,
        s.first_name,
        s.last_name,
        s.admission_number
       FROM fee_payments fp
       JOIN fee_invoices fi ON fp.invoice_id = fi.id
       JOIN students s ON fi.student_id = s.id
       JOIN parent_students ps ON s.id = ps.student_id
       WHERE ps.parent_id = ?
       ORDER BY fp.payment_date DESC`,
      [parentId]
    );

    return payments;
  }

  async getNotifications(parentId, filters = {}) {
    const { isRead, type, limit = 50 } = filters;

    let whereConditions = ['n.user_id = (SELECT user_id FROM parents WHERE id = ?)'];
    let queryParams = [parentId];

    if (isRead !== undefined) {
      whereConditions.push('n.is_read = ?');
      queryParams.push(isRead);
    }

    if (type) {
      whereConditions.push('n.type = ?');
      queryParams.push(type);
    }

    const notifications = await query(
      `SELECT * FROM notifications n
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY n.created_at DESC
       LIMIT ?`,
      [...queryParams, limit]
    );

    return notifications;
  }

  async markNotificationAsRead(parentId, notificationId) {
    const parent = await this.getParentById(parentId);

    await query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?',
      [notificationId, parent.user_id]
    );

    return { message: 'Notification marked as read' };
  }

  async getMessages(parentId, filters = {}) {
    const { limit = 50 } = filters;
    const parent = await this.getParentById(parentId);

    const messages = await query(
      `SELECT 
        m.*,
        u.email as sender_email
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.recipient_id = ? OR m.recipient_role = 'parent' OR m.recipient_role = 'all'
       ORDER BY m.created_at DESC
       LIMIT ?`,
      [parent.user_id, limit]
    );

    return messages;
  }

  async getParentDashboard(parentId) {
    const parent = await this.getParentById(parentId);

    // Get children summary
    const childrenSummary = await query(
      `SELECT 
        s.id,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.profile_photo_url,
        c.name as class_name,
        c.section as section_name,
        (SELECT COUNT(*) FROM attendance a 
         WHERE a.student_id = s.id 
         AND a.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         AND a.status = 'present') as present_days_30,
        (SELECT COUNT(*) FROM attendance a 
         WHERE a.student_id = s.id 
         AND a.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as total_days_30,
        (SELECT SUM(balance_amount) FROM fee_invoices fi 
         WHERE fi.student_id = s.id AND fi.status != 'paid') as pending_fees
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       JOIN parent_students ps ON s.id = ps.student_id
       WHERE ps.parent_id = ?`,
      [parentId]
    );

    // Get recent notifications
    const recentNotifications = await query(
      `SELECT * FROM notifications
       WHERE user_id = ? AND is_read = FALSE
       ORDER BY created_at DESC
       LIMIT 5`,
      [parent.user_id]
    );

    // Get upcoming PTMs
    const upcomingPTMs = await query(
      `SELECT 
        ptm.*,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        s.first_name as student_first_name,
        s.last_name as student_last_name
       FROM parent_teacher_meetings ptm
       JOIN teachers t ON ptm.teacher_id = t.id
       JOIN students s ON ptm.student_id = s.id
       WHERE ptm.parent_id = ? 
       AND ptm.meeting_date >= CURDATE()
       AND ptm.status IN ('scheduled', 'confirmed')
       ORDER BY ptm.meeting_date, ptm.start_time
       LIMIT 5`,
      [parentId]
    );

    return {
      parent: {
        id: parent.id,
        name: `${parent.first_name} ${parent.last_name}`,
        email: parent.email,
        phone: parent.phone_primary
      },
      children: childrenSummary,
      recentNotifications,
      upcomingPTMs
    };
  }

  async getParentStatistics() {
    const stats = await query(
      `SELECT 
        COUNT(*) as total_parents,
        SUM(CASE WHEN relationship = 'father' THEN 1 ELSE 0 END) as fathers,
        SUM(CASE WHEN relationship = 'mother' THEN 1 ELSE 0 END) as mothers,
        SUM(CASE WHEN relationship = 'guardian' THEN 1 ELSE 0 END) as guardians,
        AVG(annual_income) as avg_income
       FROM parents`
    );

    return stats[0];
  }

  async deleteParent(id) {
    const parent = await this.getParentById(id);

    // Check if parent has children
    if (parent.children && parent.children.length > 0) {
      throw new ApiError(400, 'Cannot delete parent with linked children. Please unlink all children first.');
    }

    // Delete parent record
    await query('DELETE FROM parents WHERE id = ?', [id]);

    // Deactivate user account
    await query(
      'UPDATE users SET is_active = FALSE WHERE id = ?',
      [parent.user_id]
    );

    logger.info(`Parent deleted: ${id}`);

    return { message: 'Parent deleted successfully' };
  }
}

export default new ParentService();
