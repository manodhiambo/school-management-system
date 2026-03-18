import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

router.use(authenticate);
router.use(tenantContext);
router.use(requireActiveTenant);

// ============== FEE STRUCTURE ROUTES ==============

// Get all fee structures
router.get('/structure', async (req, res) => {
  try {
    const { classId, frequency, isActive, student_type, is_transport_fee } = req.query;
    const tid = req.user.tenant_id;

    let sql = `
      SELECT fs.*, c.name as class_name, tr.route_name
      FROM fee_structure fs
      LEFT JOIN classes c ON fs.class_id = c.id
      LEFT JOIN transport_routes tr ON fs.route_id = tr.id
      WHERE fs.tenant_id = $1
    `;
    const params = [tid];
    let paramIndex = 2;

    if (classId) {
      sql += ` AND fs.class_id = $${paramIndex}`;
      params.push(classId); paramIndex++;
    }
    if (frequency) {
      sql += ` AND fs.frequency = $${paramIndex}`;
      params.push(frequency); paramIndex++;
    }
    // Default: only show active structures
    const activeFilter = isActive !== undefined ? isActive === 'true' : true;
    sql += ` AND fs.is_active = $${paramIndex}`;
    params.push(activeFilter); paramIndex++;

    if (student_type) {
      sql += ` AND (fs.student_type = $${paramIndex} OR fs.student_type = 'all')`;
      params.push(student_type); paramIndex++;
    }
    if (is_transport_fee !== undefined) {
      sql += ` AND fs.is_transport_fee = $${paramIndex}`;
      params.push(is_transport_fee === 'true'); paramIndex++;
    }

    sql += ' ORDER BY fs.student_type, fs.is_transport_fee, fs.name';

    const structures = await query(sql, params);
    res.json({ success: true, data: structures });
  } catch (error) {
    logger.error('Get fee structures error:', error);
    res.status(500).json({ success: false, message: 'Error fetching fee structures' });
  }
});

// Get single fee structure
router.get('/structure/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const structures = await query(
      `SELECT fs.*, c.name as class_name
       FROM fee_structure fs
       LEFT JOIN classes c ON fs.class_id = c.id
       WHERE fs.id = $1 AND fs.tenant_id = $2`,
      [req.params.id, tid]
    );

    if (structures.length === 0) {
      return res.status(404).json({ success: false, message: 'Fee structure not found' });
    }

    res.json({ success: true, data: structures[0] });
  } catch (error) {
    logger.error('Get fee structure error:', error);
    res.status(500).json({ success: false, message: 'Error fetching fee structure' });
  }
});

// Create fee structure
router.post('/structure', requireRole(['admin']), async (req, res) => {
  try {
    logger.info('Create fee structure:', JSON.stringify(req.body));
    const tid = req.user.tenant_id;

    const {
      name, amount, frequency, description, due_day, dueDay,
      class_id, classId, academic_year, academicYear,
      is_mandatory, isMandatory, late_fee_amount, lateFeeAmount,
      late_fee_per_day, lateFeePerDay, grace_period_days, gracePeriodDays,
      student_type, is_transport_fee, route_id
    } = req.body;

    if (!name || !amount || !frequency) {
      return res.status(400).json({
        success: false,
        message: 'Name, amount, and frequency are required'
      });
    }

    const validFrequencies = ['monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time'];
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`
      });
    }

    const structureId = uuidv4();

    await query(
      `INSERT INTO fee_structure (
        id, name, amount, frequency, description, due_day,
        class_id, academic_year, is_mandatory,
        late_fee_amount, late_fee_per_day, grace_period_days,
        student_type, is_transport_fee, route_id, tenant_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        structureId, name, amount, frequency, description || null,
        due_day || dueDay || 15, class_id || classId || null,
        academic_year || academicYear || new Date().getFullYear().toString(),
        is_mandatory ?? isMandatory ?? true,
        late_fee_amount || lateFeeAmount || 0,
        late_fee_per_day || lateFeePerDay || 0,
        grace_period_days || gracePeriodDays || 0,
        student_type || 'all',
        is_transport_fee ?? false,
        route_id || null,
        tid
      ]
    );

    const newStructure = await query('SELECT * FROM fee_structure WHERE id = $1', [structureId]);

    res.status(201).json({
      success: true,
      message: 'Fee structure created successfully',
      data: newStructure[0]
    });
  } catch (error) {
    logger.error('Create fee structure error:', error);
    res.status(500).json({ success: false, message: 'Error creating fee structure' });
  }
});

// Update fee structure
router.put('/structure/:id', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const {
      name, amount, frequency, description, due_day, dueDay,
      class_id, classId, academic_year, academicYear,
      is_mandatory, isMandatory, is_active, isActive,
      late_fee_amount, lateFeeAmount, late_fee_per_day, lateFeePerDay,
      grace_period_days, gracePeriodDays,
      student_type, is_transport_fee, route_id
    } = req.body;

    if (frequency) {
      const validFrequencies = ['monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time'];
      if (!validFrequencies.includes(frequency)) {
        return res.status(400).json({
          success: false,
          message: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`
        });
      }
    }

    await query(
      `UPDATE fee_structure SET
        name = COALESCE($1, name),
        amount = COALESCE($2, amount),
        frequency = COALESCE($3, frequency),
        description = COALESCE($4, description),
        due_day = COALESCE($5, due_day),
        class_id = COALESCE($6, class_id),
        academic_year = COALESCE($7, academic_year),
        is_mandatory = COALESCE($8, is_mandatory),
        is_active = COALESCE($9, is_active),
        late_fee_amount = COALESCE($10, late_fee_amount),
        late_fee_per_day = COALESCE($11, late_fee_per_day),
        grace_period_days = COALESCE($12, grace_period_days),
        student_type = COALESCE($13, student_type),
        is_transport_fee = COALESCE($14, is_transport_fee),
        route_id = $15,
        updated_at = NOW()
       WHERE id = $16 AND tenant_id = $17`,
      [
        name, amount, frequency, description,
        due_day || dueDay, class_id || classId,
        academic_year || academicYear, is_mandatory ?? isMandatory,
        is_active ?? isActive, late_fee_amount || lateFeeAmount,
        late_fee_per_day || lateFeePerDay, grace_period_days || gracePeriodDays,
        student_type || null, is_transport_fee ?? null,
        route_id || null,
        req.params.id, tid
      ]
    );

    const updated = await query('SELECT * FROM fee_structure WHERE id = $1', [req.params.id]);

    res.json({
      success: true,
      message: 'Fee structure updated successfully',
      data: updated[0]
    });
  } catch (error) {
    logger.error('Update fee structure error:', error);
    res.status(500).json({ success: false, message: 'Error updating fee structure' });
  }
});

// Deactivate fee structure (soft)
router.put('/structure/:id/deactivate', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    await query(
      'UPDATE fee_structure SET is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
      [req.params.id, tid]
    );
    res.json({ success: true, message: 'Fee structure deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deactivating fee structure' });
  }
});

// Delete fee structure (hard delete)
router.delete('/structure/:id', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    await query(
      'DELETE FROM fee_structure WHERE id = $1 AND tenant_id = $2',
      [req.params.id, tid]
    );
    res.json({ success: true, message: 'Fee structure deleted successfully' });
  } catch (error) {
    logger.error('Delete fee structure error:', error);
    res.status(500).json({ success: false, message: 'Error deleting fee structure' });
  }
});

// ============== FEE INVOICE ROUTES ==============

// Get fee invoices
router.get('/invoice', async (req, res) => {
  try {
    const { studentId, status, classId } = req.query;
    const tid = req.user.tenant_id;

    let sql = `
      SELECT fi.*, s.first_name, s.last_name, s.admission_number, c.name as class_name
      FROM fee_invoices fi
      JOIN students s ON fi.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.tenant_id = $1
    `;
    const params = [tid];
    let paramIndex = 2;

    if (studentId) {
      sql += ` AND fi.student_id = $${paramIndex}`;
      params.push(studentId);
      paramIndex++;
    }

    if (status) {
      sql += ` AND fi.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (classId) {
      sql += ` AND s.class_id = $${paramIndex}`;
      params.push(classId);
      paramIndex++;
    }

    sql += ' ORDER BY fi.created_at DESC';

    const invoices = await query(sql, params);
    res.json({ success: true, data: invoices });
  } catch (error) {
    logger.error('Get fee invoices error:', error);
    res.status(500).json({ success: false, message: 'Error fetching invoices' });
  }
});

// Get single invoice
router.get('/invoice/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const invoices = await query(
      `SELECT fi.*, s.first_name, s.last_name, s.admission_number
       FROM fee_invoices fi
       JOIN students s ON fi.student_id = s.id
       WHERE fi.id = $1 AND s.tenant_id = $2`,
      [req.params.id, tid]
    );

    if (invoices.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, data: invoices[0] });
  } catch (error) {
    logger.error('Get invoice error:', error);
    res.status(500).json({ success: false, message: 'Error fetching invoice' });
  }
});

// Create single invoice
router.post('/invoice', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const {
      student_id, studentId,
      total_amount, totalAmount, amount,
      discount_amount, discountAmount, discount,
      due_date, dueDate, status
    } = req.body;

    const actualStudentId = student_id || studentId;
    const actualTotalAmount = total_amount || totalAmount || amount;
    const actualDiscount = discount_amount || discountAmount || discount || 0;
    const actualNetAmount = actualTotalAmount - actualDiscount;
    const actualDueDate = due_date || dueDate;

    if (!actualStudentId || !actualTotalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and amount are required'
      });
    }

    const invoiceId = uuidv4();
    const invoiceNumber = `INV${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    await query(
      `INSERT INTO fee_invoices (
        id, invoice_number, student_id, total_amount,
        discount_amount, net_amount, balance_amount, due_date, status, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9)`,
      [
        invoiceId, invoiceNumber, actualStudentId, actualTotalAmount,
        actualDiscount, actualNetAmount, actualDueDate,
        status || 'pending', tid
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Invoice created',
      data: { id: invoiceId, invoice_number: invoiceNumber }
    });
  } catch (error) {
    logger.error('Create invoice error:', error);
    res.status(500).json({ success: false, message: 'Error creating invoice' });
  }
});

// Bulk create invoices
router.post('/invoice/bulk', requireRole(['admin']), async (req, res) => {
  try {
    logger.info('Bulk invoice request:', JSON.stringify(req.body));
    const tid = req.user.tenant_id;

    const { studentIds, student_ids, feeStructureId, fee_structure_id, dueDate, due_date, term, academic_year } = req.body;

    const actualStudentIds = studentIds || student_ids;
    const actualFeeStructureId = feeStructureId || fee_structure_id;
    const actualDueDate = dueDate || due_date || null;

    if (!actualStudentIds || !Array.isArray(actualStudentIds) || actualStudentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Student IDs array is required' });
    }

    if (!actualFeeStructureId) {
      return res.status(400).json({ success: false, message: 'Fee structure ID is required' });
    }

    const structures = await query(
      'SELECT * FROM fee_structure WHERE id = $1 AND tenant_id = $2',
      [actualFeeStructureId, tid]
    );
    if (structures.length === 0) {
      return res.status(404).json({ success: false, message: 'Fee structure not found' });
    }

    const structure = structures[0];
    const created = [];
    const errors = [];

    for (const studentId of actualStudentIds) {
      try {
        const invoiceId = uuidv4();
        const invoiceNumber = `INV${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

        await query(
          `INSERT INTO fee_invoices (
            id, invoice_number, student_id, total_amount,
            net_amount, balance_amount, due_date, status, tenant_id, description, fee_structure_id,
            term, academic_year
          ) VALUES ($1, $2, $3, $4, $4, $4, $5, 'pending', $6, $7, $8, $9, $10)`,
          [invoiceId, invoiceNumber, studentId, structure.amount, actualDueDate, tid, structure.name, structure.id, term || null, academic_year || null]
        );

        created.push({ studentId, invoiceId, invoiceNumber });
      } catch (err) {
        logger.error('Error creating invoice for student', studentId, err.message);
        errors.push({ studentId, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `${created.length} invoices created`,
      data: { created, errors }
    });
  } catch (error) {
    logger.error('Bulk create invoices error:', error);
    res.status(500).json({ success: false, message: 'Error creating invoices' });
  }
});

// Smart bulk generate — respects student_type and transport assignments
// POST /fee/invoice/bulk-smart
router.post('/invoice/bulk-smart', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { class_ids, fee_structure_ids, due_date, term, academic_year, dry_run } = req.body;
    // term and academic_year are now saved to fee_invoices for proper report-card filtering

    if (!fee_structure_ids?.length) {
      return res.status(400).json({ success: false, message: 'Select at least one fee structure' });
    }

    // Load fee structures
    const placeholders = fee_structure_ids.map((_, i) => `$${i + 2}`).join(',');
    const structures = await query(
      `SELECT * FROM fee_structure WHERE id IN (${placeholders}) AND tenant_id = $1`,
      [tid, ...fee_structure_ids]
    );

    // Load students (filter by class_ids if given)
    let studentSql = `SELECT s.id, s.first_name, s.last_name, s.admission_number,
      s.student_type, s.uses_transport, s.class_id, c.name as class_name
      FROM students s LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.tenant_id = $1 AND s.status = 'active'`;
    const studentParams = [tid];
    if (class_ids?.length) {
      studentSql += ` AND s.class_id = ANY($2::uuid[])`;
      studentParams.push(class_ids);
    }
    const allStudents = await query(studentSql, studentParams);

    // Load transport assignments
    const transportMap = {};
    const transportRows = await query(
      `SELECT st.student_id, st.route_id, r.term_fee, r.monthly_fee, r.route_name
       FROM student_transport st
       JOIN transport_routes r ON r.id = st.route_id
       WHERE st.tenant_id = $1 AND st.is_active = TRUE`,
      [tid]
    );
    for (const t of transportRows) transportMap[t.student_id] = t;

    const summary = { created: [], skipped: [], errors: [] };

    for (const struct of structures) {
      for (const student of allStudents) {
        // Filter by student_type
        if (struct.student_type !== 'all' && student.student_type !== struct.student_type) {
          summary.skipped.push({ student_id: student.id, fee: struct.name, reason: 'student_type_mismatch' });
          continue;
        }
        // Transport fee: only for students who use school transport
        if (struct.is_transport_fee && !student.uses_transport) {
          summary.skipped.push({ student_id: student.id, fee: struct.name, reason: 'no_transport' });
          continue;
        }
        // Route-specific transport: only for students on that route
        if (struct.is_transport_fee && struct.route_id && transportMap[student.id]?.route_id !== struct.route_id) {
          summary.skipped.push({ student_id: student.id, fee: struct.name, reason: 'route_mismatch' });
          continue;
        }

        // Determine amount — use route fee if transport fee and route has term_fee
        let amount = parseFloat(struct.amount);
        if (struct.is_transport_fee && transportMap[student.id]) {
          const tf = parseFloat(transportMap[student.id].term_fee);
          if (tf > 0) amount = tf;
        }

        if (!dry_run) {
          try {
            const invoiceId = uuidv4();
            const invoiceNumber = `INV${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
            await query(
              `INSERT INTO fee_invoices (id, invoice_number, student_id, total_amount, net_amount, balance_amount, due_date, status, tenant_id, description, fee_structure_id, term, academic_year)
               VALUES ($1,$2,$3,$4,$4,$4,$5,'pending',$6,$7,$8,$9,$10)`,
              [invoiceId, invoiceNumber, student.id, amount, due_date || null, tid, struct.name, struct.id, term || null, academic_year || null]
            );
            summary.created.push({ student_id: student.id, name: `${student.first_name} ${student.last_name}`, fee: struct.name, amount });
          } catch (err) {
            summary.errors.push({ student_id: student.id, fee: struct.name, error: err.message });
          }
        } else {
          summary.created.push({ student_id: student.id, name: `${student.first_name} ${student.last_name}`, class_name: student.class_name, fee: struct.name, amount, student_type: student.student_type });
        }
      }
    }

    res.json({
      success: true,
      dry_run: !!dry_run,
      message: dry_run ? `Preview: ${summary.created.length} invoices would be created` : `${summary.created.length} invoices created, ${summary.errors.length} errors`,
      data: summary
    });
  } catch (error) {
    logger.error('Smart bulk invoice error:', error);
    res.status(500).json({ success: false, message: 'Error generating invoices' });
  }
});

// ============== FEE PAYMENT ROUTES ==============

// Get fee payments
router.get('/payment', async (req, res) => {
  try {
    const { studentId, invoiceId } = req.query;
    const tid = req.user.tenant_id;

    let sql = `
      SELECT fp.*, fi.invoice_number, s.first_name, s.last_name
      FROM fee_payments fp
      LEFT JOIN fee_invoices fi ON fp.invoice_id = fi.id
      LEFT JOIN students s ON COALESCE(fp.student_id, fi.student_id) = s.id
      WHERE s.tenant_id = $1
    `;
    const params = [tid];
    let paramIndex = 2;

    if (studentId) {
      sql += ` AND (fp.student_id = $${paramIndex} OR fi.student_id = $${paramIndex})`;
      params.push(studentId);
      paramIndex++;
    }

    if (invoiceId) {
      sql += ` AND fp.invoice_id = $${paramIndex}`;
      params.push(invoiceId);
      paramIndex++;
    }

    sql += ' ORDER BY fp.payment_date DESC';

    const payments = await query(sql, params);
    res.json({ success: true, data: payments });
  } catch (error) {
    logger.error('Get payments error:', error);
    res.status(500).json({ success: false, message: 'Error fetching payments' });
  }
});

// Record payment
router.post('/payment', async (req, res) => {
  try {
    logger.info('Record payment request:', JSON.stringify(req.body));
    const tid = req.user.tenant_id;

    const {
      invoice_id, invoiceId, student_id, studentId,
      amount, payment_method, paymentMethod,
      transaction_id, transactionId, remarks
    } = req.body;

    const actualInvoiceId = invoice_id || invoiceId;
    const actualStudentId = student_id || studentId;
    const actualPaymentMethod = payment_method || paymentMethod || 'cash';
    const actualTransactionId = transaction_id || transactionId;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    const paymentId = uuidv4();

    if (!actualInvoiceId && actualStudentId) {
      await query(
        `INSERT INTO fee_payments (id, student_id, amount, payment_method, transaction_id, remarks, status, payment_date, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, 'success', NOW(), $7)`,
        [paymentId, actualStudentId, amount, actualPaymentMethod, actualTransactionId, remarks, tid]
      );

      return res.json({ success: true, message: 'Payment recorded successfully', data: { id: paymentId } });
    }

    if (!actualInvoiceId) {
      return res.status(400).json({ success: false, message: 'Invoice ID or Student ID is required' });
    }

    await query(
      `INSERT INTO fee_payments (id, invoice_id, amount, payment_method, transaction_id, remarks, status, payment_date, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'success', NOW(), $7)`,
      [paymentId, actualInvoiceId, amount, actualPaymentMethod, actualTransactionId, remarks, tid]
    );

    await query(
      `UPDATE fee_invoices
       SET paid_amount = COALESCE(paid_amount, 0) + $1,
           balance_amount = net_amount - (COALESCE(paid_amount, 0) + $1),
           status = CASE
             WHEN net_amount <= (COALESCE(paid_amount, 0) + $1) THEN 'paid'
             ELSE 'partial'
           END,
           updated_at = NOW()
       WHERE id = $2`,
      [amount, actualInvoiceId]
    );

    res.json({ success: true, message: 'Payment recorded successfully', data: { id: paymentId } });
  } catch (error) {
    logger.error('Record payment error:', error);
    res.status(500).json({ success: false, message: 'Error recording payment' });
  }
});

// ============== STATISTICS ROUTES ==============

// Get fee statistics
router.get('/statistics', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const stats = await query(`
      SELECT
        COALESCE(SUM(net_amount), 0)::numeric as total_amount,
        COALESCE(SUM(paid_amount), 0)::numeric as total_collected,
        COALESCE(SUM(balance_amount), 0)::numeric as total_pending,
        COUNT(*)::int as total_invoices,
        COUNT(CASE WHEN status = 'paid' THEN 1 END)::int as paid_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending_count,
        COUNT(CASE WHEN status = 'partial' THEN 1 END)::int as partial_count,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END)::int as overdue_count
      FROM fee_invoices
      WHERE tenant_id = $1
    `, [tid]);
    res.json({ success: true, data: stats[0] || {} });
  } catch (error) {
    logger.error('Get fee statistics error:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
});

// Get fee defaulters
router.get('/defaulters', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const defaulters = await query(`
      SELECT s.id, s.first_name, s.last_name, s.admission_number, c.name as class_name,
        COALESCE(SUM(fi.balance_amount), 0)::numeric as total_due,
        COUNT(fi.id)::int as pending_invoices
      FROM students s
      JOIN fee_invoices fi ON s.id = fi.student_id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.tenant_id = $1 AND fi.balance_amount > 0
      GROUP BY s.id, s.first_name, s.last_name, s.admission_number, c.name
      ORDER BY total_due DESC
    `, [tid]);
    res.json({ success: true, data: defaulters });
  } catch (error) {
    logger.error('Get defaulters error:', error);
    res.status(500).json({ success: false, message: 'Error fetching defaulters' });
  }
});

// Get student fee account
router.get('/student/:studentId', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const studentId = req.params.studentId;

    const student = await query(
      'SELECT id FROM students WHERE (id = $1 OR user_id = $1) AND tenant_id = $2',
      [studentId, tid]
    );

    const actualStudentId = student.length > 0 ? student[0].id : studentId;

    const invoices = await query(
      'SELECT * FROM fee_invoices WHERE student_id = $1 AND tenant_id = $2 ORDER BY created_at DESC',
      [actualStudentId, tid]
    );

    const payments = await query(`
      SELECT fp.* FROM fee_payments fp
      LEFT JOIN fee_invoices fi ON fp.invoice_id = fi.id
      WHERE (fi.student_id = $1 OR fp.student_id = $1) AND fp.tenant_id = $2
      ORDER BY fp.payment_date DESC
    `, [actualStudentId, tid]);

    const summary = await query(`
      SELECT
        COALESCE(SUM(total_amount), 0)::numeric as total_amount,
        COALESCE(SUM(total_amount - balance_amount), 0)::numeric as total_paid,
        COALESCE(SUM(balance_amount), 0)::numeric as total_balance
      FROM fee_invoices WHERE student_id = $1 AND tenant_id = $2
    `, [actualStudentId, tid]);

    res.json({
      success: true,
      data: {
        total_fees: summary[0]?.total_amount || 0,
        paid: summary[0]?.total_paid || 0,
        pending: summary[0]?.total_balance || 0,
        invoices: invoices.map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          amount: inv.total_amount,
          paid: parseFloat(inv.total_amount) - parseFloat(inv.balance_amount),
          balance: inv.balance_amount,
          due_date: inv.due_date,
          status: inv.status,
          description: inv.description || `Invoice ${inv.invoice_number}`
        })),
        payments
      }
    });
  } catch (error) {
    logger.error('Get student fee account error:', error);
    res.status(500).json({ success: false, message: 'Error fetching fee account' });
  }
});

export default router;
