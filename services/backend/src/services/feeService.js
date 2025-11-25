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
        feeId, classId, name, description, amount, frequency,
        dueDay, lateFeeAmount, lateFeePerDay, gracePeriodDays,
        isMandatory, academicYear
      ]
    );

    logger.info(`Fee structure created: ${name}`);

    return await this.getFeeStructureById(feeId);
  }

  async getFeeStructureById(id) {
    const results = await query(
      `SELECT 
        fs.*,
        c.name as class_name,
        c.section as section_name
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

    const feeStructures = await query(
      `SELECT 
        fs.*,
        c.name as class_name,
        c.section as section_name
       FROM fee_structure fs
       LEFT JOIN classes c ON fs.class_id = c.id
       ${whereClause}
       ORDER BY fs.name`,
      queryParams
    );

    return feeStructures;
  }

  async updateFeeStructure(id, updateData) {
    await this.getFeeStructureById(id);

    const {
      name,
      description,
      amount,
      frequency,
      dueDay,
      lateFeeAmount,
      lateFeePerDay,
      gracePeriodDays,
      isMandatory,
      isActive
    } = updateData;

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (amount !== undefined) {
      updateFields.push('amount = ?');
      updateValues.push(amount);
    }
    if (frequency !== undefined) {
      updateFields.push('frequency = ?');
      updateValues.push(frequency);
    }
    if (dueDay !== undefined) {
      updateFields.push('due_day = ?');
      updateValues.push(dueDay);
    }
    if (lateFeeAmount !== undefined) {
      updateFields.push('late_fee_amount = ?');
      updateValues.push(lateFeeAmount);
    }
    if (lateFeePerDay !== undefined) {
      updateFields.push('late_fee_per_day = ?');
      updateValues.push(lateFeePerDay);
    }
    if (gracePeriodDays !== undefined) {
      updateFields.push('grace_period_days = ?');
      updateValues.push(gracePeriodDays);
    }
    if (isMandatory !== undefined) {
      updateFields.push('is_mandatory = ?');
      updateValues.push(isMandatory);
    }
    if (isActive !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(isActive);
    }

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
      [discountId, name, type, value, applicableTo, description]
    );

    logger.info(`Fee discount created: ${name}`);

    return await query('SELECT * FROM fee_discounts WHERE id = ?', [discountId]);
  }

  async applyDiscountToStudent(studentId, discountId, appliedBy, reason, validFrom, validUntil) {
    const assignmentId = uuidv4();
    await query(
      `INSERT INTO student_fee_discounts (id, student_id, discount_id, applied_by, reason, valid_from, valid_until)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [assignmentId, studentId, discountId, appliedBy, reason, validFrom, validUntil]
    );

    logger.info(`Discount applied to student ${studentId}`);

    return await query('SELECT * FROM student_fee_discounts WHERE id = ?', [assignmentId]);
  }

  // ==================== FEE INVOICES ====================
  async generateInvoice(studentId, month, createdBy) {
    // Get student details
    const students = await query(
      'SELECT * FROM students WHERE id = ?',
      [studentId]
    );

    if (students.length === 0) {
      throw new ApiError(404, 'Student not found');
    }

    const student = students[0];

    // Check if invoice already exists
    const existing = await query(
      'SELECT * FROM fee_invoices WHERE student_id = ? AND month = ?',
      [studentId, month]
    );

    if (existing.length > 0) {
      throw new ApiError(400, 'Invoice already exists for this month');
    }

    // Get fee structures for student's class
    const feeStructures = await query(
      `SELECT * FROM fee_structure 
       WHERE (class_id = ? OR class_id IS NULL) 
       AND is_active = TRUE`,
      [student.class_id]
    );

    // Calculate total amount
    let totalAmount = 0;
    const invoiceItems = [];

    for (const fee of feeStructures) {
      totalAmount += parseFloat(fee.amount);
      invoiceItems.push({
        feeStructureId: fee.id,
        description: fee.name,
        amount: fee.amount
      });
    }

    // Get applicable discounts
    const discounts = await query(
      `SELECT 
        fd.type,
        fd.value
       FROM student_fee_discounts sfd
       JOIN fee_discounts fd ON sfd.discount_id = fd.id
       WHERE sfd.student_id = ? 
       AND (sfd.valid_from IS NULL OR sfd.valid_from <= ?)
       AND (sfd.valid_until IS NULL OR sfd.valid_until >= ?)
       AND fd.is_active = TRUE`,
      [studentId, month, month]
    );

    let discountAmount = 0;
    for (const discount of discounts) {
      if (discount.type === 'percentage') {
        discountAmount += (totalAmount * discount.value) / 100;
      } else {
        discountAmount += discount.value;
      }
    }

    // Calculate late fee (if applicable)
    const dueDate = new Date(month);
    dueDate.setDate(10); // Default due day
    let lateFeeAmount = 0;

    // Tax calculation (example: 0%)
    const taxAmount = 0;

    const netAmount = totalAmount - discountAmount + lateFeeAmount + taxAmount;

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Create invoice
    const invoiceId = uuidv4();
    await query(
      `INSERT INTO fee_invoices (
        id, student_id, invoice_number, month, total_amount,
        discount_amount, late_fee_amount, tax_amount, net_amount,
        paid_amount, balance_amount, due_date, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending', ?)`,
      [
        invoiceId, studentId, invoiceNumber, month, totalAmount,
        discountAmount, lateFeeAmount, taxAmount, netAmount,
        netAmount, dueDate, createdBy
      ]
    );

    // Create invoice items
    for (const item of invoiceItems) {
      const itemId = uuidv4();
      await query(
        `INSERT INTO fee_invoice_items (id, invoice_id, fee_structure_id, description, amount)
         VALUES (?, ?, ?, ?, ?)`,
        [itemId, invoiceId, item.feeStructureId, item.description, item.amount]
      );
    }

    logger.info(`Invoice generated: ${invoiceNumber}`);

    return await this.getInvoiceById(invoiceId);
  }

  async generateInvoiceNumber() {
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');

    const results = await query(
      `SELECT invoice_number FROM fee_invoices 
       WHERE invoice_number LIKE ? 
       ORDER BY invoice_number DESC LIMIT 1`,
      [`INV${year}${month}%`]
    );

    let sequence = 1;
    if (results.length > 0) {
      const lastNumber = results[0].invoice_number;
      sequence = parseInt(lastNumber.slice(-4)) + 1;
    }

    return `INV${year}${month}${sequence.toString().padStart(4, '0')}`;
  }

  async getInvoiceById(id) {
    const results = await query(
      `SELECT 
        fi.*,
        s.first_name,
        s.last_name,
        s.admission_number,
        c.name as class_name,
        c.section as section_name
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

    // Get invoice items
    const items = await query(
      'SELECT * FROM fee_invoice_items WHERE invoice_id = ?',
      [id]
    );

    invoice.items = items;

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

    const invoices = await query(
      `SELECT 
        fi.*,
        s.first_name,
        s.last_name,
        s.admission_number,
        c.name as class_name,
        c.section as section_name
       FROM fee_invoices fi
       JOIN students s ON fi.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       ${whereClause}
       ORDER BY fi.month DESC`,
      queryParams
    );

    return invoices;
  }

  // ==================== PAYMENTS ====================
  async recordPayment(paymentData) {
    const {
      invoiceId,
      paymentMethod,
      transactionId,
      amount,
      collectedBy,
      bankName,
      chequeNumber,
      chequeDate,
      remarks
    } = paymentData;

    // Get invoice
    const invoice = await this.getInvoiceById(invoiceId);

    if (invoice.status === 'paid') {
      throw new ApiError(400, 'Invoice is already paid');
    }

    // Generate receipt number
    const receiptNumber = await this.generateReceiptNumber();

    // Create payment record
    const paymentId = uuidv4();
    await query(
      `INSERT INTO fee_payments (
        id, invoice_id, receipt_number, payment_method, transaction_id,
        amount, collected_by, bank_name, cheque_number, cheque_date, remarks, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'success')`,
      [
        paymentId, invoiceId, receiptNumber, paymentMethod, transactionId,
        amount, collectedBy, bankName, chequeNumber, chequeDate, remarks
      ]
    );

    // Update invoice
    const newPaidAmount = parseFloat(invoice.paid_amount) + parseFloat(amount);
    const newBalanceAmount = parseFloat(invoice.net_amount) - newPaidAmount;
    const newStatus = newBalanceAmount <= 0 ? 'paid' : 'partial';

    await query(
      `UPDATE fee_invoices 
       SET paid_amount = ?, balance_amount = ?, status = ?, updated_at = NOW()
       WHERE id = ?`,
      [newPaidAmount, newBalanceAmount, newStatus, invoiceId]
    );

    logger.info(`Payment recorded: ${receiptNumber}`);

    return await query('SELECT * FROM fee_payments WHERE id = ?', [paymentId]);
  }

  async generateReceiptNumber() {
    const year = new Date().getFullYear().toString().slice(-2);
    
    const results = await query(
      `SELECT receipt_number FROM fee_payments 
       WHERE receipt_number LIKE ? 
       ORDER BY receipt_number DESC LIMIT 1`,
      [`REC${year}%`]
    );

    let sequence = 1;
    if (results.length > 0) {
      const lastNumber = results[0].receipt_number;
      sequence = parseInt(lastNumber.slice(-6)) + 1;
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

    const payments = await query(
      `SELECT 
        fp.*,
        fi.invoice_number,
        fi.month,
        s.first_name,
        s.last_name,
        s.admission_number,
        u.email as collected_by_email
       FROM fee_payments fp
       JOIN fee_invoices fi ON fp.invoice_id = fi.id
       JOIN students s ON fi.student_id = s.id
       LEFT JOIN users u ON fp.collected_by = u.id
       ${whereClause}
       ORDER BY fp.payment_date DESC`,
      queryParams
    );

    return payments;
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

    const whereClause = whereConditions.join(' AND ');

    const defaulters = await query(
      `SELECT 
        s.id,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.roll_number,
        c.name as class_name,
        c.section as section_name,
        SUM(fi.balance_amount) as total_due,
        COUNT(fi.id) as pending_invoices,
        p.first_name as parent_first_name,
        p.last_name as parent_last_name,
        p.phone_primary as parent_phone
       FROM students s
       JOIN fee_invoices fi ON s.id = fi.student_id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN parents p ON s.parent_id = p.id
       WHERE ${whereClause}
       GROUP BY s.id
       HAVING total_due > ?
       ORDER BY total_due DESC`,
      [...queryParams, threshold]
    );

    return defaulters;
  }

  // ==================== STATISTICS ====================
  async getFeeStatistics(filters = {}) {
    const { classId, startDate, endDate, academicYear } = filters;

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
        SUM(fi.net_amount) as total_amount,
        SUM(fi.paid_amount) as total_collected,
        SUM(fi.balance_amount) as total_pending,
        SUM(CASE WHEN fi.status = 'paid' THEN 1 ELSE 0 END) as paid_invoices,
        SUM(CASE WHEN fi.status = 'pending' THEN 1 ELSE 0 END) as pending_invoices,
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
    // Get all invoices for the student
    const invoices = await query(
      `SELECT 
        fi.id,
        fi.invoice_number,
        fi.month,
        fi.due_date,
        fi.total_amount,
        fi.discount_amount,
        fi.net_amount,
        fi.paid_amount,
        fi.balance_amount,
        fi.status,
        
        fi.created_at,
        CONCAT('Term ', MONTH(fi.month)) as description,
        CASE 
          WHEN fi.status = 'paid' THEN fi.month
          ELSE NULL
        END as term
       FROM fee_invoices fi
       WHERE fi.student_id = ?
       ORDER BY fi.due_date DESC`,
      [studentId]
    );

    // Get payment history
    const payments = await query(
      `SELECT 
        fp.id,
        fp.amount,
        fp.payment_method,
        fp.transaction_id,
        fp.payment_date,
        fp.created_at,
        fi.invoice_number,
        'Payment' as description
       FROM fee_payments fp
       JOIN fee_invoices fi ON fp.invoice_id = fi.id
       WHERE fi.student_id = ?
       ORDER BY fp.payment_date DESC`,
      [studentId]
    );

    // Calculate totals
    const totals = await query(
      `SELECT 
        SUM(net_amount) as total_fees,
        SUM(paid_amount) as paid,
        SUM(balance_amount) as pending
       FROM fee_invoices
       WHERE student_id = ?`,
      [studentId]
    );

    return {
      total_fees: totals[0]?.total_fees || 0,
      paid: totals[0]?.paid || 0,
      pending: totals[0]?.pending || 0,
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        description: inv.description || inv.fee_structure_name,
        term: inv.term,
        due_date: inv.due_date,
        amount: parseFloat(inv.net_amount),
        paid_amount: parseFloat(inv.paid_amount),
        balance: parseFloat(inv.balance_amount),
        status: inv.status,
        payment_date: inv.payment_date
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
