import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class FeeService {
  // ==================== FEE STRUCTURE ====================
  async createFeeStructure(feeData) {
    const {
      classId,
      name,
      description,
      amount,
      frequency,
      dueDay,
      lateFeeAmount,
      lateFeePerDay,
      gracePeriodDays,
      isMandatory,
      academicYear
    } = feeData;

    const feeId = uuidv4();
    await query(
      `INSERT INTO fee_structure (
        id, class_id, name, description, amount, frequency,
        due_day, late_fee_amount, late_fee_per_day, grace_period_days,
        is_mandatory, is_active, academic_year
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
      [
        feeId, classId || null, name, description || null, amount, frequency,
        dueDay || 10, lateFeeAmount || 0, lateFeePerDay || 0, gracePeriodDays || 0,
        isMandatory !== false, academicYear
      ]
    );

    logger.info(`Fee structure created: ${name}`);
    return await this.getFeeStructureById(feeId);
  }

  async getFeeStructureById(id) {
    const results = await query(
      `SELECT fs.*, c.name as class_name, c.section as section_name
       FROM fee_structure fs
       LEFT JOIN classes c ON fs.class_id = c.id
       WHERE fs.id = ?`,
      [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Fee structure not found');
    }
    return results[0];
  }

  async getFeeStructures(filters = {}) {
    const { classId, academicYear, isActive } = filters;
    let whereConditions = [];
    let queryParams = [];

    if (classId) {
      whereConditions.push('fs.class_id = ?');
      queryParams.push(classId);
    }
    if (academicYear) {
      whereConditions.push('fs.academic_year = ?');
      queryParams.push(academicYear);
    }
    if (isActive !== undefined) {
      whereConditions.push('fs.is_active = ?');
      queryParams.push(isActive);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    return await query(
      `SELECT fs.*, c.name as class_name, c.section as section_name
       FROM fee_structure fs
       LEFT JOIN classes c ON fs.class_id = c.id
       ${whereClause}
       ORDER BY fs.name`,
      queryParams
    );
  }

  async updateFeeStructure(id, updateData) {
    await this.getFeeStructureById(id);
    const updateFields = [];
    const updateValues = [];

    const fieldMap = {
      name: 'name',
      description: 'description',
      amount: 'amount',
      frequency: 'frequency',
      dueDay: 'due_day',
      lateFeeAmount: 'late_fee_amount',
      lateFeePerDay: 'late_fee_per_day',
      gracePeriodDays: 'grace_period_days',
      isMandatory: 'is_mandatory',
      isActive: 'is_active'
    };

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && fieldMap[key]) {
        updateFields.push(`${fieldMap[key]} = ?`);
        updateValues.push(updateData[key]);
      }
    });

    if (updateFields.length === 0) {
      return await this.getFeeStructureById(id);
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    await query(
      `UPDATE fee_structure SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    logger.info(`Fee structure updated: ${id}`);
    return await this.getFeeStructureById(id);
  }

  // ==================== FEE DISCOUNTS ====================
  async createDiscount(discountData) {
    const { name, type, value, applicableTo, description } = discountData;
    const discountId = uuidv4();
    
    await query(
      `INSERT INTO fee_discounts (id, name, type, value, applicable_to, description, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [discountId, name, type, value, applicableTo || 'all', description || null]
    );

    logger.info(`Fee discount created: ${name}`);
    const results = await query('SELECT * FROM fee_discounts WHERE id = ?', [discountId]);
    return results[0];
  }

  async applyDiscountToStudent(studentId, discountId, appliedBy, reason, validFrom, validUntil) {
    const assignmentId = uuidv4();
    await query(
      `INSERT INTO student_fee_discounts (id, student_id, discount_id, applied_by, reason, valid_from, valid_until)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [assignmentId, studentId, discountId, appliedBy, reason || null, validFrom || null, validUntil || null]
    );

    logger.info(`Discount applied to student ${studentId}`);
    const results = await query('SELECT * FROM student_fee_discounts WHERE id = ?', [assignmentId]);
    return results[0];
  }

  // ==================== FEE INVOICES ====================
  async generateInvoice(studentId, month, createdBy) {
    const students = await query('SELECT * FROM students WHERE id = ?', [studentId]);
    if (students.length === 0) {
      throw new ApiError(404, 'Student not found');
    }

    const student = students[0];
    const existing = await query(
      'SELECT * FROM fee_invoices WHERE student_id = ? AND month = ?',
      [studentId, month]
    );

    if (existing.length > 0) {
      throw new ApiError(400, 'Invoice already exists for this month');
    }

    const feeStructures = await query(
      `SELECT * FROM fee_structure
       WHERE (class_id = ? OR class_id IS NULL) AND is_active = TRUE`,
      [student.class_id]
    );

    let totalAmount = 0;
    for (const fee of feeStructures) {
      totalAmount += parseFloat(fee.amount);
    }

    const invoiceNumber = await this.generateInvoiceNumber();
    const dueDate = new Date(month);
    dueDate.setDate(10);

    const invoiceId = uuidv4();
    await query(
      `INSERT INTO fee_invoices (
        id, student_id, invoice_number, month, total_amount,
        discount_amount, late_fee_amount, tax_amount, net_amount,
        paid_amount, balance_amount, due_date, status, created_by
      ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, 0, ?, ?, 'pending', ?)`,
      [invoiceId, studentId, invoiceNumber, month, totalAmount, totalAmount, totalAmount, dueDate, createdBy]
    );

    logger.info(`Invoice generated: ${invoiceNumber}`);
    return await this.getInvoiceById(invoiceId);
  }

  async generateBulkInvoices(data, createdBy) {
    const { class_id, fee_type, amount, due_date, academic_year, description } = data;

    let studentsQuery = `SELECT id, first_name, last_name, admission_number, class_id FROM students WHERE status = 'active'`;
    const queryParams = [];

    if (class_id && class_id !== '') {
      studentsQuery += ' AND class_id = ?';
      queryParams.push(class_id);
    }

    const students = await query(studentsQuery, queryParams);

    if (students.length === 0) {
      throw new ApiError(404, 'No active students found');
    }

    const invoicesCreated = [];
    const errors = [];

    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');

    const lastInvoice = await query(
      `SELECT invoice_number FROM fee_invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1`,
      [`INV${year}${month}%`]
    );

    let sequence = 1;
    if (lastInvoice.length > 0) {
      sequence = parseInt(lastInvoice[0].invoice_number.slice(-4)) + 1;
    }

    const invoiceDescription = description || `${fee_type.charAt(0).toUpperCase() + fee_type.slice(1)} Fee - ${academic_year}`;

    for (const student of students) {
      try {
        const invoiceId = uuidv4();
        const invoiceNumber = `INV${year}${month}${sequence.toString().padStart(4, '0')}`;

        await query(
          `INSERT INTO fee_invoices (
            id, student_id, invoice_number, month, total_amount,
            discount_amount, late_fee_amount, tax_amount, net_amount,
            paid_amount, balance_amount, due_date, status, created_by
          ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, 0, ?, ?, 'pending', ?)`,
          [invoiceId, student.id, invoiceNumber, due_date, amount, amount, amount, due_date, createdBy]
        );

        invoicesCreated.push({
          id: invoiceId,
          invoice_number: invoiceNumber,
          student_name: `${student.first_name} ${student.last_name}`,
          amount: amount
        });

        sequence++;
      } catch (err) {
        errors.push({
          student: `${student.first_name} ${student.last_name}`,
          error: err.message
        });
      }
    }

    logger.info(`Bulk invoices generated: ${invoicesCreated.length} created, ${errors.length} errors`);

    return {
      total_students: students.length,
      invoices_created: invoicesCreated.length,
      errors_count: errors.length,
      invoices: invoicesCreated,
      errors: errors
    };
  }

  async generateInvoiceNumber() {
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');

    const results = await query(
      `SELECT invoice_number FROM fee_invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1`,
      [`INV${year}${month}%`]
    );

    let sequence = 1;
    if (results.length > 0) {
      sequence = parseInt(results[0].invoice_number.slice(-4)) + 1;
    }

    return `INV${year}${month}${sequence.toString().padStart(4, '0')}`;
  }

  async getInvoiceById(id) {
    const results = await query(
      `SELECT fi.*, s.first_name, s.last_name, s.admission_number,
              c.name as class_name, c.section as section_name
       FROM fee_invoices fi
       JOIN students s ON fi.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE fi.id = ?`,
      [id]
    );

    if (results.length === 0) {
      throw new ApiError(404, 'Invoice not found');
    }

    const invoice = results[0];
    invoice.items = await query('SELECT * FROM fee_invoice_items WHERE invoice_id = ?', [id]);
    return invoice;
  }

  async getInvoices(filters = {}) {
    const { studentId, status, month, startDate, endDate } = filters;
    let whereConditions = [];
    let queryParams = [];

    if (studentId) {
      whereConditions.push('fi.student_id = ?');
      queryParams.push(studentId);
    }
    if (status) {
      whereConditions.push('fi.status = ?');
      queryParams.push(status);
    }
    if (month) {
      whereConditions.push('fi.month = ?');
      queryParams.push(month);
    }
    if (startDate && endDate) {
      whereConditions.push('fi.month BETWEEN ? AND ?');
      queryParams.push(startDate, endDate);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    return await query(
      `SELECT fi.*, s.first_name, s.last_name, s.admission_number,
              c.name as class_name, c.section as section_name
       FROM fee_invoices fi
       JOIN students s ON fi.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       ${whereClause}
       ORDER BY fi.created_at DESC`,
      queryParams
    );
  }

  // ==================== PAYMENTS ====================
  async recordPayment(paymentData) {
    const { invoiceId, paymentMethod, transactionId, amount, collectedBy, bankName, chequeNumber, chequeDate, remarks } = paymentData;

    const invoice = await this.getInvoiceById(invoiceId);
    if (invoice.status === 'paid') {
      throw new ApiError(400, 'Invoice is already paid');
    }

    const receiptNumber = await this.generateReceiptNumber();
    const paymentId = uuidv4();

    await query(
      `INSERT INTO fee_payments (
        id, invoice_id, receipt_number, payment_method, transaction_id,
        amount, collected_by, bank_name, cheque_number, cheque_date, remarks, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'success')`,
      [paymentId, invoiceId, receiptNumber, paymentMethod, transactionId || null,
       amount, collectedBy, bankName || null, chequeNumber || null, chequeDate || null, remarks || null]
    );

    const newPaidAmount = parseFloat(invoice.paid_amount) + parseFloat(amount);
    const newBalanceAmount = parseFloat(invoice.net_amount) - newPaidAmount;
    const newStatus = newBalanceAmount <= 0 ? 'paid' : 'partial';

    await query(
      `UPDATE fee_invoices SET paid_amount = ?, balance_amount = ?, status = ?, updated_at = NOW() WHERE id = ?`,
      [newPaidAmount, Math.max(0, newBalanceAmount), newStatus, invoiceId]
    );

    logger.info(`Payment recorded: ${receiptNumber}`);
    const results = await query('SELECT * FROM fee_payments WHERE id = ?', [paymentId]);
    return results[0];
  }

  async generateReceiptNumber() {
    const year = new Date().getFullYear().toString().slice(-2);
    const results = await query(
      `SELECT receipt_number FROM fee_payments WHERE receipt_number LIKE ? ORDER BY receipt_number DESC LIMIT 1`,
      [`REC${year}%`]
    );

    let sequence = 1;
    if (results.length > 0) {
      sequence = parseInt(results[0].receipt_number.slice(-6)) + 1;
    }

    return `REC${year}${sequence.toString().padStart(6, '0')}`;
  }

  async getPayments(filters = {}) {
    const { invoiceId, studentId, paymentMethod, startDate, endDate } = filters;
    let whereConditions = [];
    let queryParams = [];

    if (invoiceId) {
      whereConditions.push('fp.invoice_id = ?');
      queryParams.push(invoiceId);
    }
    if (studentId) {
      whereConditions.push('fi.student_id = ?');
      queryParams.push(studentId);
    }
    if (paymentMethod) {
      whereConditions.push('fp.payment_method = ?');
      queryParams.push(paymentMethod);
    }
    if (startDate && endDate) {
      whereConditions.push('DATE(fp.payment_date) BETWEEN ? AND ?');
      queryParams.push(startDate, endDate);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    return await query(
      `SELECT fp.*, fi.invoice_number, fi.month,
              s.first_name, s.last_name, s.admission_number,
              u.email as collected_by_email
       FROM fee_payments fp
       JOIN fee_invoices fi ON fp.invoice_id = fi.id
       JOIN students s ON fi.student_id = s.id
       LEFT JOIN users u ON fp.collected_by = u.id
       ${whereClause}
       ORDER BY fp.payment_date DESC`,
      queryParams
    );
  }

  // ==================== DEFAULTERS ====================
  async getDefaulters(filters = {}) {
    const { classId, threshold = 0 } = filters;
    let whereConditions = ['fi.status IN ("pending", "partial", "overdue")'];
    let queryParams = [];

    if (classId) {
      whereConditions.push('s.class_id = ?');
      queryParams.push(classId);
    }

    return await query(
      `SELECT s.id, s.first_name, s.last_name, s.admission_number, s.roll_number,
              c.name as class_name, c.section as section_name,
              SUM(fi.balance_amount) as total_due,
              COUNT(fi.id) as pending_invoices,
              p.first_name as parent_first_name, p.last_name as parent_last_name,
              p.phone_primary as parent_phone
       FROM students s
       JOIN fee_invoices fi ON s.id = fi.student_id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN parents p ON s.parent_id = p.id
       WHERE ${whereConditions.join(' AND ')}
       GROUP BY s.id
       HAVING total_due > ?
       ORDER BY total_due DESC`,
      [...queryParams, threshold]
    );
  }

  // ==================== STATISTICS ====================
  async getFeeStatistics(filters = {}) {
    const { classId, startDate, endDate } = filters;
    let whereConditions = [];
    let queryParams = [];

    if (classId) {
      whereConditions.push('s.class_id = ?');
      queryParams.push(classId);
    }
    if (startDate && endDate) {
      whereConditions.push('fi.month BETWEEN ? AND ?');
      queryParams.push(startDate, endDate);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const stats = await query(
      `SELECT
        COUNT(DISTINCT fi.id) as total_invoices,
        COALESCE(SUM(fi.net_amount), 0) as total_amount,
        COALESCE(SUM(fi.paid_amount), 0) as total_collected,
        COALESCE(SUM(fi.balance_amount), 0) as total_pending,
        SUM(CASE WHEN fi.status = 'paid' THEN 1 ELSE 0 END) as paid_invoices,
        SUM(CASE WHEN fi.status IN ('pending', 'partial') THEN 1 ELSE 0 END) as pending_invoices,
        SUM(CASE WHEN fi.status = 'overdue' THEN 1 ELSE 0 END) as overdue_invoices,
        ROUND(SUM(fi.paid_amount) * 100.0 / NULLIF(SUM(fi.net_amount), 0), 2) as collection_percentage
       FROM fee_invoices fi
       JOIN students s ON fi.student_id = s.id
       ${whereClause}`,
      queryParams
    );

    return stats[0];
  }

  async getStudentFeeAccount(studentId) {
    const invoices = await query(
      `SELECT fi.id, fi.invoice_number, fi.month, fi.due_date, fi.total_amount,
              fi.discount_amount, fi.net_amount, fi.paid_amount, fi.balance_amount,
              fi.status, fi.created_at,
              CONCAT('Term ', MONTH(fi.month)) as description
       FROM fee_invoices fi
       WHERE fi.student_id = ?
       ORDER BY fi.due_date DESC`,
      [studentId]
    );

    const payments = await query(
      `SELECT fp.id, fp.amount, fp.payment_method, fp.transaction_id,
              fp.payment_date, fp.created_at, fi.invoice_number, 'Payment' as description
       FROM fee_payments fp
       JOIN fee_invoices fi ON fp.invoice_id = fi.id
       WHERE fi.student_id = ?
       ORDER BY fp.payment_date DESC`,
      [studentId]
    );

    const totals = await query(
      `SELECT COALESCE(SUM(net_amount), 0) as total_fees,
              COALESCE(SUM(paid_amount), 0) as paid,
              COALESCE(SUM(balance_amount), 0) as pending
       FROM fee_invoices WHERE student_id = ?`,
      [studentId]
    );

    return {
      total_fees: totals[0]?.total_fees || 0,
      paid: totals[0]?.paid || 0,
      pending: totals[0]?.pending || 0,
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        description: inv.description,
        due_date: inv.due_date,
        amount: parseFloat(inv.net_amount),
        paid_amount: parseFloat(inv.paid_amount),
        balance: parseFloat(inv.balance_amount),
        status: inv.status
      })),
      payment_history: payments.map(pay => ({
        id: pay.id,
        amount: parseFloat(pay.amount),
        payment_method: pay.payment_method,
        transaction_id: pay.transaction_id,
        payment_date: pay.payment_date,
        description: pay.description
      }))
    };
  }
}

export default new FeeService();
