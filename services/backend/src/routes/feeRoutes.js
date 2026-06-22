import express from 'express';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

router.use(authenticate);
router.use(requireModule('finance'));
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
    // isActive='all' → no filter; default → only active
    if (isActive !== 'all') {
      const activeFilter = isActive !== undefined ? isActive === 'true' : true;
      sql += ` AND fs.is_active = $${paramIndex}`;
      params.push(activeFilter); paramIndex++;
    }

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

    const newStructure = await query('SELECT * FROM fee_structure WHERE id = $1 AND tenant_id = $2', [structureId, tid]);

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

    const updated = await query('SELECT * FROM fee_structure WHERE id = $1 AND tenant_id = $2', [req.params.id, tid]);

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
      WHERE fi.tenant_id = $1
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
      `SELECT fi.*, s.first_name, s.last_name, s.admission_number, c.name as class_name
       FROM fee_invoices fi
       JOIN students s ON fi.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE fi.id = $1 AND fi.tenant_id = $2`,
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

    // Load fee structures — only active ones for this tenant
    // Inactive structures are shown in the modal for reference but must not generate invoices
    const placeholders = fee_structure_ids.map((_, i) => `$${i + 2}`).join(',');
    const allSelectedStructures = await query(
      `SELECT fs.*, ef.student_id AS extra_fee_student_id, ef.class_id AS extra_fee_class_id
       FROM fee_structure fs
       LEFT JOIN extra_fees ef ON ef.id = fs.extra_fee_id AND ef.tenant_id = $1
       WHERE fs.id IN (${placeholders}) AND fs.tenant_id = $1`,
      [tid, ...fee_structure_ids]
    );
    const inactiveSkipped = allSelectedStructures.filter(s => !s.is_active).map(s => s.name);
    const structures = allSelectedStructures.filter(s => s.is_active);

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

    // Load transport assignments — keyed by student_id (tenant-scoped)
    const transportMap = {};
    const transportRows = await query(
      `SELECT st.student_id, st.route_id, r.term_fee, r.monthly_fee, r.route_name
       FROM student_transport st
       JOIN transport_routes r ON r.id = st.route_id AND r.tenant_id = $1
       WHERE st.tenant_id = $1 AND st.is_active = TRUE`,
      [tid]
    );
    for (const t of transportRows) transportMap[t.student_id] = t;

    // Load existing invoices for duplicate detection — covers fee_structure_id and extra_fee_id
    const existingInvoices = await query(
      `SELECT student_id, fee_structure_id, extra_fee_id, term, academic_year
       FROM fee_invoices
       WHERE tenant_id = $1 AND status NOT IN ('cancelled')`,
      [tid]
    );
    const existingSet = new Set([
      ...existingInvoices
        .filter(r => r.fee_structure_id)
        .map(r => `${r.student_id}|fs:${r.fee_structure_id}|${r.term||''}|${r.academic_year||''}`),
      ...existingInvoices
        .filter(r => r.extra_fee_id)
        .map(r => `${r.student_id}|ef:${r.extra_fee_id}|${r.term||''}|${r.academic_year||''}`),
    ]);

    const summary = { created: [], skipped: [], errors: [] };

    for (const struct of structures) {
      // Extra-fee-linked structures: only assign to students matching the specific extra fee scope
      // (extra_fee student_id scope is handled by class_id on the structure; if student_id-scoped,
      // the extra fee has no class_id and applies to all — use extra_fee_id guard)
      for (const student of allStudents) {
        // If fee structure is tied to a specific class, only students in that class get it
        if (struct.class_id && student.class_id !== struct.class_id) {
          summary.skipped.push({ student_id: student.id, fee: struct.name, reason: 'class_mismatch' });
          continue;
        }
        // Extra-fee-linked: if the original extra fee is student-scoped, only that student gets it
        if (struct.extra_fee_id) {
          if (struct.extra_fee_student_id && struct.extra_fee_student_id !== student.id) {
            summary.skipped.push({ student_id: student.id, fee: struct.name, reason: 'student_mismatch' });
            continue;
          }
          // extra_fee_class_id already handled by struct.class_id above, but guard anyway
          if (!struct.extra_fee_student_id && struct.extra_fee_class_id && student.class_id !== struct.extra_fee_class_id) {
            summary.skipped.push({ student_id: student.id, fee: struct.name, reason: 'class_mismatch' });
            continue;
          }
        }
        // Filter by student_type
        if (struct.student_type !== 'all' && student.student_type !== struct.student_type) {
          summary.skipped.push({ student_id: student.id, fee: struct.name, reason: 'student_type_mismatch' });
          continue;
        }
        // Transport fee: check actual route assignment (not the stale uses_transport flag)
        if (struct.is_transport_fee) {
          if (!transportMap[student.id]) {
            summary.skipped.push({ student_id: student.id, fee: struct.name, reason: 'no_transport' });
            continue;
          }
          // Route-specific: only for students on that exact route
          if (struct.route_id && transportMap[student.id].route_id !== struct.route_id) {
            summary.skipped.push({ student_id: student.id, fee: struct.name, reason: 'route_mismatch' });
            continue;
          }
        }

        // Duplicate check — skip if invoice already exists for this student + structure + term + year
        const dupKey = `${student.id}|fs:${struct.id}|${term || ''}|${academic_year || ''}`;
        if (existingSet.has(dupKey)) {
          summary.skipped.push({ student_id: student.id, fee: struct.name, reason: 'already_invoiced' });
          continue;
        }

        // Determine amount — use route's term_fee for transport fees
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
            // Add to existing set so subsequent structures in the same run don't re-duplicate
            existingSet.add(dupKey);
            summary.created.push({ student_id: student.id, name: `${student.first_name} ${student.last_name}`, fee: struct.name, amount });
          } catch (err) {
            summary.errors.push({ student_id: student.id, fee: struct.name, error: err.message });
          }
        } else {
          // For dry_run, also track duplicates that would happen within this run
          existingSet.add(dupKey);
          summary.created.push({ student_id: student.id, name: `${student.first_name} ${student.last_name}`, class_name: student.class_name, fee: struct.name, amount, student_type: student.student_type });
        }
      }
    }

    if (inactiveSkipped.length) {
      summary.skipped.push(...inactiveSkipped.map(name => ({ fee: name, reason: 'inactive_structure' })));
    }
    res.json({
      success: true,
      dry_run: !!dry_run,
      message: dry_run ? `Preview: ${summary.created.length} invoices would be created` : `${summary.created.length} invoices created, ${summary.errors.length} errors`,
      data: summary,
      inactive_skipped: inactiveSkipped,
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
      SELECT fp.*, fi.invoice_number, s.first_name, s.last_name, s.admission_number
      FROM fee_payments fp
      LEFT JOIN fee_invoices fi ON fp.invoice_id = fi.id
      LEFT JOIN students s ON COALESCE(fp.student_id, fi.student_id) = s.id
      WHERE fp.tenant_id = $1
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
      transaction_id, transactionId, remarks, payment_date, paymentDate
    } = req.body;

    const actualInvoiceId = invoice_id || invoiceId;
    const actualStudentId = student_id || studentId;
    // Normalize payment method — 'bank_transfer' maps to DB-accepted value if needed
    const rawMethod = payment_method || paymentMethod || 'cash';
    const actualPaymentMethod = rawMethod;  // DB now accepts bank_transfer via migration 038
    const actualTransactionId = transaction_id || transactionId;
    const actualPaymentDate = payment_date || paymentDate || null;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    if (!actualInvoiceId && !actualStudentId) {
      return res.status(400).json({ success: false, message: 'Invoice ID or Student ID is required' });
    }

    const paymentId = uuidv4();
    const receiptNumber = 'RCP-' + Date.now().toString(36).toUpperCase();

    if (!actualInvoiceId && actualStudentId) {
      // Student-only payment (no invoice) — general credit on account
      await query(
        `INSERT INTO fee_payments (id, student_id, amount, payment_method, transaction_id, remarks, status, payment_date, receipt_number, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, 'success', COALESCE($7::timestamptz, NOW()), $8, $9)`,
        [paymentId, actualStudentId, amount, actualPaymentMethod, actualTransactionId, remarks, actualPaymentDate, receiptNumber, tid]
      );
      return res.json({ success: true, message: 'Payment recorded successfully', data: { id: paymentId } });
    }

    // Verify invoice belongs to this tenant before recording
    const invCheck = await query(
      'SELECT id, student_id FROM fee_invoices WHERE id = $1 AND tenant_id = $2',
      [actualInvoiceId, tid]
    );
    if (invCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invStudentId = actualStudentId || invCheck[0].student_id;

    await query(
      `INSERT INTO fee_payments (id, invoice_id, student_id, amount, payment_method, transaction_id, remarks, status, payment_date, receipt_number, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'success', COALESCE($8::timestamptz, NOW()), $9, $10)`,
      [paymentId, actualInvoiceId, invStudentId, amount, actualPaymentMethod, actualTransactionId, remarks, actualPaymentDate, receiptNumber, tid]
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
       WHERE id = $2 AND tenant_id = $3`,
      [amount, actualInvoiceId, tid]
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
      JOIN fee_invoices fi ON s.id = fi.student_id AND fi.tenant_id = $1
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

// Get student fee account — full ledger with expected fees
router.get('/student/:studentId', async (req, res) => {
  try {
    const { role, id: callerId } = req.user;
    const { academic_year, term } = req.query;
    const year = academic_year || new Date().getFullYear().toString();

    let std, tid;

    if (role === 'parent') {
      // For parents: resolve student AND verify ownership in one query.
      // We use the parents table tenant_id (not users.tenant_id which may be null
      // for legacy parent accounts created before tenant_id was stored on users).
      const parentStudentRows = await query(
        `SELECT s.*, c.name AS class_name, c.education_level, p.tenant_id AS resolved_tenant_id
         FROM parent_students ps
         JOIN parents p ON p.id = ps.parent_id
         JOIN students s ON s.id = ps.student_id
         LEFT JOIN classes c ON c.id = s.class_id
         WHERE ps.student_id = $1 AND p.user_id = $2`,
        [req.params.studentId, callerId]
      );
      if (!parentStudentRows.length) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      std = parentStudentRows[0];
      tid = std.resolved_tenant_id;
    } else {
      // Non-parent roles: use JWT tenant_id directly
      tid = req.user.tenant_id;
      const studentRows = await query(
        `SELECT s.*, c.name AS class_name, c.education_level
         FROM students s
         LEFT JOIN classes c ON c.id = s.class_id
         WHERE (s.id = $1 OR s.user_id = $1) AND s.tenant_id = $2`,
        [req.params.studentId, tid]
      );
      if (!studentRows.length) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }
      std = studentRows[0];
    }

    // Full invoice list — exclude cancelled invoices so they never appear in statements or PDFs
    const invoices = await query(`
      SELECT fi.*, fs.name AS structure_name
      FROM fee_invoices fi
      LEFT JOIN fee_structure fs ON fi.fee_structure_id = fs.id
      WHERE fi.student_id = $1 AND fi.tenant_id = $2
        AND fi.status NOT IN ('cancelled')
      ORDER BY fi.created_at DESC
    `, [std.id, tid]);

    // Full payment list with method/reference
    const payments = await query(`
      SELECT fp.*, fi.invoice_number
      FROM fee_payments fp
      LEFT JOIN fee_invoices fi ON fp.invoice_id = fi.id
      WHERE (fi.student_id = $1 OR fp.student_id = $1) AND fp.tenant_id = $2
      ORDER BY fp.payment_date DESC
    `, [std.id, tid]);

    // Expected fee structures — transport fees only if student is on that route;
    // extra_fee_id structures excluded (already covered by the extra_fees query below).
    // DISTINCT ON (fs.name) prevents double-rows when both class-specific and global structures match.
    const structures = await query(`
      SELECT DISTINCT ON (fs.name) fs.*, c.name AS class_name
      FROM fee_structure fs
      LEFT JOIN classes c ON c.id = fs.class_id
      WHERE fs.tenant_id = $1 AND fs.is_active = true
        AND (fs.class_id = $2 OR fs.class_id IS NULL)
        AND (fs.student_type = 'all' OR fs.student_type = $3)
        AND fs.academic_year = $4
        AND fs.extra_fee_id IS NULL
        AND (
          fs.is_transport_fee = FALSE
          OR (
            fs.is_transport_fee = TRUE
            AND EXISTS (
              SELECT 1 FROM student_transport st
              WHERE st.student_id = $5 AND st.route_id = fs.route_id
                AND st.is_active = TRUE AND st.tenant_id = $1
            )
          )
        )
      ORDER BY fs.name, fs.class_id NULLS LAST
    `, [tid, std.class_id, std.student_type || 'all', year, std.id]);

    // Extra fees
    const extraFees = await query(`
      SELECT ef.*, c.name AS class_name
      FROM extra_fees ef
      LEFT JOIN classes c ON c.id = ef.class_id
      WHERE ef.tenant_id = $1 AND ef.is_active = true
        AND (ef.student_id = $2 OR (ef.class_id = $3 AND ef.student_id IS NULL) OR (ef.class_id IS NULL AND ef.student_id IS NULL))
        AND (ef.term IS NULL OR ef.term = $4)
        AND (ef.academic_year IS NULL OR ef.academic_year = $5)
      ORDER BY ef.name
    `, [tid, std.id, std.class_id, term || null, term ? year : null]);

    const totalExpected = structures.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
                        + extraFees.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const totalInvoiced = invoices.reduce((s, r) => s + parseFloat(r.net_amount || 0), 0);
    const totalPaid     = invoices.reduce((s, r) => s + parseFloat(r.paid_amount || 0), 0);
    const totalBalance  = invoices.reduce((s, r) => s + parseFloat(r.balance_amount || 0), 0);

    res.json({
      success: true,
      data: {
        student: std,
        invoices,   // raw — all fields intact (net_amount, paid_amount, balance_amount, description, term, status…)
        payments,
        structures,
        extra_fees: extraFees,
        summary: { total_expected: totalExpected, total_invoiced: totalInvoiced, total_paid: totalPaid, total_balance: totalBalance }
      }
    });
  } catch (error) {
    logger.error('Get student fee account error:', error);
    res.status(500).json({ success: false, message: 'Error fetching fee account' });
  }
});

// Get a single payment receipt — used for print/share after recording
router.get('/receipt/:paymentId', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(`
      SELECT fp.*,
             fi.invoice_number, fi.description AS invoice_description,
             fi.net_amount AS invoice_amount, fi.balance_amount AS invoice_balance,
             fi.term, fi.academic_year,
             s.first_name, s.last_name, s.admission_number,
             c.name AS class_name
      FROM fee_payments fp
      LEFT JOIN fee_invoices fi ON fp.invoice_id = fi.id
      LEFT JOIN students s ON COALESCE(fp.student_id, fi.student_id) = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE fp.id = $1 AND fp.tenant_id = $2
    `, [req.params.paymentId, tid]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Receipt not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error('Get receipt error:', error);
    res.status(500).json({ success: false, message: 'Error fetching receipt' });
  }
});

// ============== PARENT PAYMENT REQUESTS ==============
// Parents submit payment proof → admin confirms or rejects → balance updated on confirm

// POST /fee/payment-request — parent submits payment proof for an invoice
router.post('/payment-request', async (req, res) => {
  try {
    const { role, id: callerId } = req.user;
    if (!['parent', 'student'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Only parents can submit payment requests' });
    }

    const { invoiceId, amount, paymentMethod, transactionRef, parentMessage } = req.body;
    if (!invoiceId || !amount || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'invoiceId, amount, and paymentMethod are required' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    // Verify invoice exists and parent owns it (via parent-student link)
    const invRows = await query(
      `SELECT fi.*, s.tenant_id AS student_tenant_id, p.tenant_id AS parent_tenant_id
       FROM fee_invoices fi
       JOIN students s ON s.id = fi.student_id
       JOIN parent_students ps ON ps.student_id = s.id
       JOIN parents p ON p.id = ps.parent_id
       WHERE fi.id = $1 AND p.user_id = $2 AND fi.status != 'paid'`,
      [invoiceId, callerId]
    );
    if (!invRows.length) {
      return res.status(404).json({ success: false, message: 'Invoice not found or already paid' });
    }
    const inv = invRows[0];
    const tid = inv.parent_tenant_id || inv.student_tenant_id;

    // Check no other pending_confirmation exists for the same invoice
    const existingPending = await query(
      `SELECT id FROM fee_payments WHERE invoice_id = $1 AND status = 'pending_confirmation' AND tenant_id = $2`,
      [invoiceId, tid]
    );
    if (existingPending.length) {
      return res.status(409).json({ success: false, message: 'A payment request is already pending for this invoice. Please wait for admin confirmation.' });
    }

    const paymentId = uuidv4();
    const receiptNumber = 'REQ-' + Date.now().toString(36).toUpperCase();
    await query(
      `INSERT INTO fee_payments
         (id, invoice_id, student_id, amount, payment_method, transaction_id,
          remarks, status, payment_date, receipt_number, tenant_id,
          submitted_by, parent_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_confirmation', NOW(), $8, $9, $10, $11)`,
      [paymentId, invoiceId, inv.student_id, parsedAmount,
       paymentMethod, transactionRef || null,
       parentMessage || null, receiptNumber, tid, callerId, parentMessage || null]
    );

    res.status(201).json({
      success: true,
      message: 'Payment request submitted. Admin will verify and confirm your payment.',
      data: { id: paymentId, receipt_number: receiptNumber }
    });
  } catch (error) {
    logger.error('Submit payment request error:', error);
    res.status(500).json({ success: false, message: 'Error submitting payment request' });
  }
});

// GET /fee/payment-requests — admin sees all pending payment confirmations
router.get('/payment-requests', requireRole(['admin', 'finance_officer']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status = 'pending_confirmation' } = req.query;
    const rows = await query(
      `SELECT fp.*,
              fi.invoice_number, fi.description AS invoice_description,
              fi.net_amount AS invoice_amount, fi.balance_amount AS invoice_balance,
              fi.term, fi.academic_year,
              s.first_name, s.last_name, s.admission_number,
              c.name AS class_name,
              NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), '') AS parent_name,
              u.email AS parent_email
       FROM fee_payments fp
       JOIN fee_invoices fi ON fi.id = fp.invoice_id
       JOIN students s ON s.id = fi.student_id
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN users u ON u.id = fp.submitted_by
       WHERE fp.tenant_id = $1 AND fp.status = $2
       ORDER BY fp.payment_date DESC`,
      [tid, status]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Get payment requests error:', error);
    res.status(500).json({ success: false, message: 'Error fetching payment requests' });
  }
});

// GET /fee/payment-requests/count — badge count for admin dashboard
router.get('/payment-requests/count', requireRole(['admin', 'finance_officer']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT COUNT(*) AS count FROM fee_payments WHERE tenant_id = $1 AND status = 'pending_confirmation'`,
      [tid]
    );
    res.json({ success: true, data: { count: parseInt(rows[0].count, 10) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error' });
  }
});

// PUT /fee/payment-requests/:id/confirm — admin confirms payment and updates invoice
router.put('/payment-requests/:id/confirm', requireRole(['admin', 'finance_officer']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { confirmationNote } = req.body;

    const payments = await query(
      `SELECT fp.*, fi.net_amount, fi.paid_amount AS inv_paid, fi.balance_amount AS inv_balance
       FROM fee_payments fp
       JOIN fee_invoices fi ON fi.id = fp.invoice_id
       WHERE fp.id = $1 AND fp.tenant_id = $2 AND fp.status = 'pending_confirmation'`,
      [req.params.id, tid]
    );
    if (!payments.length) {
      return res.status(404).json({ success: false, message: 'Payment request not found or already processed' });
    }
    const p = payments[0];

    // Confirm the payment
    await query(
      `UPDATE fee_payments
       SET status = 'success', confirmed_by = $1, confirmation_note = $2, updated_at = NOW()
       WHERE id = $3`,
      [req.user.id, confirmationNote || null, p.id]
    );

    // Update invoice balance
    const newPaid = parseFloat(p.inv_paid || 0) + parseFloat(p.amount);
    const newBalance = parseFloat(p.net_amount) - newPaid;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';
    await query(
      `UPDATE fee_invoices
       SET paid_amount = $1, balance_amount = $2, status = $3, updated_at = NOW()
       WHERE id = $4 AND tenant_id = $5`,
      [newPaid, Math.max(0, newBalance), newStatus, p.invoice_id, tid]
    );

    res.json({ success: true, message: 'Payment confirmed and invoice updated' });
  } catch (error) {
    logger.error('Confirm payment request error:', error);
    res.status(500).json({ success: false, message: 'Error confirming payment' });
  }
});

// PUT /fee/payment-requests/:id/reject — admin rejects with reason
router.put('/payment-requests/:id/reject', requireRole(['admin', 'finance_officer']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { confirmationNote } = req.body;

    const payments = await query(
      `SELECT id FROM fee_payments WHERE id = $1 AND tenant_id = $2 AND status = 'pending_confirmation'`,
      [req.params.id, tid]
    );
    if (!payments.length) {
      return res.status(404).json({ success: false, message: 'Payment request not found or already processed' });
    }

    await query(
      `UPDATE fee_payments
       SET status = 'rejected', confirmed_by = $1, confirmation_note = $2, updated_at = NOW()
       WHERE id = $3`,
      [req.user.id, confirmationNote || 'Rejected by admin', req.params.id]
    );

    res.json({ success: true, message: 'Payment request rejected' });
  } catch (error) {
    logger.error('Reject payment request error:', error);
    res.status(500).json({ success: false, message: 'Error rejecting payment request' });
  }
});

// GET /fee/my-payment-requests/:studentId — parent sees their own submissions for a student
router.get('/my-payment-requests/:studentId', async (req, res) => {
  try {
    const { role, id: callerId } = req.user;
    if (role !== 'parent') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    // Verify parent owns this student
    const access = await query(
      `SELECT p.tenant_id FROM parent_students ps JOIN parents p ON p.id = ps.parent_id
       WHERE ps.student_id = $1 AND p.user_id = $2`,
      [req.params.studentId, callerId]
    );
    if (!access.length) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const tid = access[0].tenant_id;
    const rows = await query(
      `SELECT fp.*, fi.invoice_number, fi.description AS invoice_description
       FROM fee_payments fp
       JOIN fee_invoices fi ON fi.id = fp.invoice_id
       WHERE fp.student_id = $1 AND fp.tenant_id = $2
         AND fp.status IN ('pending_confirmation', 'rejected')
       ORDER BY fp.payment_date DESC`,
      [req.params.studentId, tid]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error' });
  }
});

// ============== DELETE INVOICE ==============

router.delete('/invoice/:id', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const inv = await query(
      'SELECT id FROM fee_invoices WHERE id = $1 AND tenant_id = $2',
      [req.params.id, tid]
    );
    if (!inv.length) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    // Remove linked payments first then the invoice
    await query('DELETE FROM fee_payments WHERE invoice_id = $1', [req.params.id]);
    await query('DELETE FROM fee_invoices WHERE id = $1 AND tenant_id = $2', [req.params.id, tid]);
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error) {
    logger.error('Delete invoice error:', error);
    res.status(500).json({ success: false, message: 'Error deleting invoice' });
  }
});

// ============== DELETE PAYMENT ==============
// Reverses the payment amount on the linked invoice then removes the record

router.delete('/payment/:id', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;

    const payments = await query(
      'SELECT * FROM fee_payments WHERE id = $1 AND tenant_id = $2',
      [req.params.id, tid]
    );
    if (!payments.length) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    const payment = payments[0];

    // If linked to an invoice, reverse the paid amount and recalculate balance
    if (payment.invoice_id) {
      await query(
        `UPDATE fee_invoices
         SET paid_amount = GREATEST(0, COALESCE(paid_amount, 0) - $1),
             balance_amount = LEAST(net_amount, COALESCE(balance_amount, net_amount) + $1),
             status = CASE
               WHEN (COALESCE(paid_amount, 0) - $1) <= 0 THEN 'pending'
               WHEN (COALESCE(paid_amount, 0) - $1) < net_amount THEN 'partial'
               ELSE status
             END,
             updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3`,
        [payment.amount, payment.invoice_id, tid]
      );
    }

    await query('DELETE FROM fee_payments WHERE id = $1 AND tenant_id = $2', [req.params.id, tid]);
    res.json({ success: true, message: 'Payment deleted and invoice balance reversed' });
  } catch (error) {
    logger.error('Delete payment error:', error);
    res.status(500).json({ success: false, message: 'Error deleting payment' });
  }
});

// ============== EXPECTED FEES FOR A STUDENT ==============
// Returns the fee structures that apply to the student's class + any student-level extra fees

router.get('/expected/:studentId', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { academic_year, term } = req.query;
    const year = academic_year || new Date().getFullYear().toString();

    // Resolve student
    const studentRows = await query(
      `SELECT s.*, c.name AS class_name, c.education_level
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE (s.id = $1 OR s.user_id = $1) AND s.tenant_id = $2`,
      [req.params.studentId, tid]
    );
    if (!studentRows.length) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const std = studentRows[0];

    // Fee structures for this class — transport fees only if student is on that route;
    // extra_fee_id structures excluded (covered by extra_fees query below).
    // DISTINCT ON (fs.name) prevents duplicate rows when both a class-specific and a
    // global (class_id IS NULL) structure have the same name — class-specific wins.
    const structures = await query(
      `SELECT DISTINCT ON (fs.name) fs.*, c.name AS class_name
       FROM fee_structure fs
       LEFT JOIN classes c ON c.id = fs.class_id
       WHERE fs.tenant_id = $1 AND fs.is_active = true
         AND (fs.class_id = $2 OR fs.class_id IS NULL)
         AND (fs.student_type = 'all' OR fs.student_type = $3)
         AND fs.academic_year = $4
         AND fs.extra_fee_id IS NULL
         AND (
           fs.is_transport_fee = FALSE
           OR (
             fs.is_transport_fee = TRUE
             AND EXISTS (
               SELECT 1 FROM student_transport st
               WHERE st.student_id = $5 AND st.route_id = fs.route_id
                 AND st.is_active = TRUE AND st.tenant_id = $1
             )
           )
         )
       ORDER BY fs.name, fs.class_id NULLS LAST`,
      [tid, std.class_id, std.student_type || 'all', year, std.id]
    );

    // Extra fees for this student's class and/or this specific student
    const extraRows = await query(
      `SELECT ef.*, c.name AS class_name
       FROM extra_fees ef
       LEFT JOIN classes c ON c.id = ef.class_id
       WHERE ef.tenant_id = $1 AND ef.is_active = true
         AND (
           ef.student_id = $2
           OR (ef.class_id = $3 AND ef.student_id IS NULL)
           OR (ef.class_id IS NULL AND ef.student_id IS NULL)
         )
         AND (ef.term IS NULL OR ef.term = $4)
         AND (ef.academic_year IS NULL OR ef.academic_year = $5)
       ORDER BY ef.name`,
      [tid, std.id, std.class_id, term || null, term ? year : null]
    );

    const totalExpected =
      structures.reduce((s, r) => s + parseFloat(r.amount || 0), 0) +
      extraRows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);

    res.json({
      success: true,
      data: { student: std, structures, extra_fees: extraRows, total_expected: totalExpected }
    });
  } catch (error) {
    logger.error('Get expected fees error:', error);
    res.status(500).json({ success: false, message: 'Error fetching expected fees' });
  }
});

// ============== STUDENTS FEE SUMMARY ==============
// All students with their invoiced / paid / balance totals — for the fee management table

router.get('/students-summary', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { search, classId } = req.query;

    let sql = `
      SELECT s.id, s.first_name, s.last_name, s.admission_number,
             s.class_id, s.student_type,
             c.name AS class_name, c.education_level,
             COALESCE(SUM(fi.net_amount),     0)::numeric AS total_invoiced,
             COALESCE(SUM(fi.paid_amount),    0)::numeric AS total_paid,
             COALESCE(SUM(fi.balance_amount), 0)::numeric AS total_balance,
             COUNT(fi.id)::int                            AS invoice_count
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN fee_invoices fi
             ON fi.student_id = s.id AND fi.tenant_id = $1
             AND fi.status NOT IN ('cancelled')
      WHERE s.tenant_id = $1 AND s.status = 'active'
    `;
    const params = [tid];
    let pi = 2;

    if (search) {
      sql += ` AND (s.first_name ILIKE $${pi} OR s.last_name ILIKE $${pi} OR s.admission_number ILIKE $${pi})`;
      params.push(`%${search}%`); pi++;
    }
    if (classId) {
      sql += ` AND s.class_id = $${pi++}`;
      params.push(classId);
    }

    sql += ` GROUP BY s.id, s.first_name, s.last_name, s.admission_number,
                      s.class_id, s.student_type, c.name, c.education_level
             ORDER BY c.name, s.first_name`;

    const students = await query(sql, params);
    res.json({ success: true, data: students });
  } catch (error) {
    logger.error('Get students summary error:', error);
    res.status(500).json({ success: false, message: 'Error fetching students summary' });
  }
});

// ============== GENERATE INVOICE FOR STUDENT FROM FEE STRUCTURES ==============

router.post('/invoice/generate-for-student', requireRole(['admin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { student_id, academic_year, term, due_date } = req.body;
    if (!student_id) return res.status(400).json({ success: false, message: 'student_id required' });

    const year = academic_year || new Date().getFullYear().toString();

    // Get student
    const stdRows = await query(
      'SELECT * FROM students WHERE id = $1 AND tenant_id = $2',
      [student_id, tid]
    );
    if (!stdRows.length) return res.status(404).json({ success: false, message: 'Student not found' });
    const std = stdRows[0];

    // Student's transport assignment (for transport fee filtering)
    const transportRows = await query(
      `SELECT st.route_id, r.term_fee FROM student_transport st
       JOIN transport_routes r ON r.id = st.route_id AND r.tenant_id = $1
       WHERE st.student_id = $2 AND st.is_active = TRUE AND st.tenant_id = $1`,
      [tid, std.id]
    );
    const studentRoute = transportRows[0] || null;

    // Combined query: regular fee structures + extra-fee-linked structures.
    // Extra-fee structures (extra_fee_id IS NOT NULL) are included here so that invoice
    // generation uses fee_structure_id for ALL invoices — consistent with bulk-smart.
    // Student-scoped extra fees are guarded by ef.student_id check.
    // DISTINCT ON (fs.name) prevents double-billing when both class-specific and
    // global structures have the same name — class-specific wins.
    const structures = await query(
      `SELECT DISTINCT ON (fs.name) fs.*, ef.student_id AS extra_fee_student_id, ef.id AS linked_extra_fee_id
       FROM fee_structure fs
       LEFT JOIN extra_fees ef ON ef.id = fs.extra_fee_id AND ef.tenant_id = $1
       WHERE fs.tenant_id = $1 AND fs.is_active = true
         AND (fs.class_id = $2 OR fs.class_id IS NULL)
         AND (fs.student_type = 'all' OR fs.student_type = $3)
         AND fs.academic_year = $4
         AND (
           fs.is_transport_fee = FALSE
           OR (
             fs.is_transport_fee = TRUE
             AND EXISTS (
               SELECT 1 FROM student_transport st
               WHERE st.student_id = $5 AND st.route_id = fs.route_id
                 AND st.is_active = TRUE AND st.tenant_id = $1
             )
           )
         )
         AND (
           fs.extra_fee_id IS NULL
           OR (
             fs.extra_fee_id IS NOT NULL
             AND (ef.student_id IS NULL OR ef.student_id = $5)
           )
         )
       ORDER BY fs.name, fs.class_id NULLS LAST, fs.extra_fee_id NULLS FIRST`,
      [tid, std.class_id, std.student_type || 'all', year, std.id]
    );

    if (!structures.length) {
      return res.status(400).json({ success: false, message: 'No applicable fee structures found for this student' });
    }

    // Existing invoice keys — use both fee_structure_id and extra_fee_id so old invoices
    // (created before this unification) are also detected as duplicates.
    const existingInvRows = await query(
      `SELECT fi.fee_structure_id, fi.extra_fee_id, fi.term, fi.academic_year
       FROM fee_invoices fi
       WHERE fi.student_id=$1 AND fi.tenant_id=$2 AND fi.status!='cancelled'`,
      [std.id, tid]
    );
    const existingSet = new Set([
      ...existingInvRows
        .filter(r => r.fee_structure_id)
        .map(r => `fs:${r.fee_structure_id}|${r.term||''}|${r.academic_year||''}`),
      ...existingInvRows
        .filter(r => r.extra_fee_id)
        .map(r => `ef:${r.extra_fee_id}|${r.term||''}|${r.academic_year||''}`),
    ]);

    const created = [];
    const skipped = [];

    // Generate one invoice per fee structure (includes extra-fee-linked structures)
    for (const struct of structures) {
      const dupKey = `fs:${struct.id}|${term||''}|${year}`;
      // Also check old-style ef: key for backward compat with invoices created before unification
      const altDupKey = struct.linked_extra_fee_id
        ? `ef:${struct.linked_extra_fee_id}|${term||''}|${year}` : null;
      if (existingSet.has(dupKey) || (altDupKey && existingSet.has(altDupKey))) {
        skipped.push(struct.name); continue;
      }
      const amount = struct.is_transport_fee && studentRoute
        ? (parseFloat(studentRoute.term_fee) || parseFloat(struct.amount))
        : parseFloat(struct.amount);
      const invoiceId = uuidv4();
      const invoiceNumber = `INV${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth()+1).toString().padStart(2,'0')}${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`;
      await query(
        `INSERT INTO fee_invoices (id, invoice_number, student_id, total_amount, net_amount, balance_amount,
           due_date, status, tenant_id, description, fee_structure_id, term, academic_year)
         VALUES ($1,$2,$3,$4,$4,$4,$5,'pending',$6,$7,$8,$9,$10)`,
        [invoiceId, invoiceNumber, std.id, amount, due_date||null, tid, struct.name, struct.id, term||null, year]
      );
      existingSet.add(dupKey);
      if (altDupKey) existingSet.add(altDupKey);
      created.push({ invoice_number: invoiceNumber, description: struct.name, amount });
    }

    const totalAmount = created.reduce((s, r) => s + r.amount, 0);
    res.status(201).json({
      success: true,
      message: `${created.length} invoice(s) generated${skipped.length ? `, ${skipped.length} skipped (already invoiced)` : ''}`,
      data: { created, skipped, total_amount: totalAmount }
    });
  } catch (error) {
    logger.error('Generate invoice for student error:', error);
    res.status(500).json({ success: false, message: 'Error generating invoice' });
  }
});

// ============================================================
// FINANCIAL REPORT ENDPOINTS
// ============================================================

// Filtered fee summary (academic_year + optional term + optional class_id)
router.get('/report/summary', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { academic_year, term, class_id } = req.query;
    const year = academic_year || new Date().getFullYear().toString();

    let sql = `
      SELECT
        COALESCE(SUM(fi.net_amount),     0)::numeric AS total_invoiced,
        COALESCE(SUM(fi.paid_amount),    0)::numeric AS total_collected,
        COALESCE(SUM(fi.balance_amount), 0)::numeric AS total_outstanding,
        COUNT(fi.id)::int                            AS total_invoices,
        COUNT(DISTINCT fi.student_id)::int           AS students_invoiced,
        COUNT(CASE WHEN fi.status = 'paid'    THEN 1 END)::int AS paid_count,
        COUNT(CASE WHEN fi.status = 'pending' THEN 1 END)::int AS pending_count,
        COUNT(CASE WHEN fi.status = 'partial' THEN 1 END)::int AS partial_count,
        COUNT(CASE WHEN fi.status = 'overdue' THEN 1 END)::int AS overdue_count
      FROM fee_invoices fi
      JOIN students s ON s.id = fi.student_id AND s.tenant_id = $1
      WHERE fi.tenant_id = $1 AND fi.status NOT IN ('cancelled')
        AND fi.academic_year = $2`;
    const params = [tid, year];
    let pi = 3;

    if (term)     { sql += ` AND fi.term = $${pi}`;      params.push(term);     pi++; }
    if (class_id) { sql += ` AND s.class_id = $${pi}`;  params.push(class_id); pi++; }

    const rows = await query(sql, params);
    res.json({ success: true, data: rows[0] || {} });
  } catch (error) {
    logger.error('Report summary error:', error);
    res.status(500).json({ success: false, message: 'Error generating report summary' });
  }
});

// Fee collection breakdown by class
router.get('/report/collection-by-class', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { academic_year, term } = req.query;
    const year = academic_year || new Date().getFullYear().toString();

    let sql = `
      SELECT
        c.id          AS class_id,
        c.name        AS class_name,
        c.education_level,
        COUNT(DISTINCT s.id)::int                    AS total_students,
        COUNT(fi.id)::int                            AS invoice_count,
        COALESCE(SUM(fi.net_amount),     0)::numeric AS invoiced,
        COALESCE(SUM(fi.paid_amount),    0)::numeric AS collected,
        COALESCE(SUM(fi.balance_amount), 0)::numeric AS outstanding,
        COUNT(CASE WHEN fi.status = 'paid' THEN 1 END)::int AS paid_count
      FROM classes c
      LEFT JOIN students s ON s.class_id = c.id AND s.tenant_id = $1 AND s.status = 'active'
      LEFT JOIN fee_invoices fi
             ON fi.student_id = s.id AND fi.tenant_id = $1
            AND fi.status NOT IN ('cancelled')
            AND fi.academic_year = $2`;
    const params = [tid, year];
    let pi = 3;

    if (term) { sql += ` AND fi.term = $${pi}`; params.push(term); pi++; }

    sql += `
      WHERE c.tenant_id = $1
      GROUP BY c.id, c.name, c.education_level
      ORDER BY c.name`;

    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Collection by class report error:', error);
    res.status(500).json({ success: false, message: 'Error generating class collection report' });
  }
});

// Payment method breakdown
router.get('/report/payment-methods', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { date_from, date_to } = req.query;

    let sql = `
      SELECT
        COALESCE(fp.payment_method, 'cash') AS payment_method,
        COUNT(*)::int                        AS count,
        COALESCE(SUM(fp.amount), 0)::numeric AS total
      FROM fee_payments fp
      WHERE fp.tenant_id = $1 AND fp.status = 'success'`;
    const params = [tid];
    let pi = 2;

    if (date_from) { sql += ` AND fp.payment_date >= $${pi}`; params.push(date_from); pi++; }
    if (date_to)   { sql += ` AND fp.payment_date <= $${pi}`; params.push(date_to);   pi++; }

    sql += ` GROUP BY fp.payment_method ORDER BY total DESC`;

    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Payment methods report error:', error);
    res.status(500).json({ success: false, message: 'Error generating payment methods report' });
  }
});

// Monthly collection trend (last N months)
router.get('/report/monthly-trend', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const months = Math.min(parseInt(req.query.months || '12'), 36);

    const rows = await query(`
      SELECT
        TO_CHAR(fp.payment_date, 'YYYY-MM')  AS month,
        TO_CHAR(fp.payment_date, 'Mon YYYY') AS month_label,
        COALESCE(SUM(fp.amount), 0)::numeric AS collected,
        COUNT(*)::int                         AS transactions
      FROM fee_payments fp
      WHERE fp.tenant_id = $1
        AND fp.status = 'success'
        AND fp.payment_date >= (CURRENT_DATE - ($2 || ' months')::INTERVAL)
      GROUP BY TO_CHAR(fp.payment_date, 'YYYY-MM'), TO_CHAR(fp.payment_date, 'Mon YYYY')
      ORDER BY month
    `, [tid, months]);

    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Monthly trend report error:', error);
    res.status(500).json({ success: false, message: 'Error generating monthly trend report' });
  }
});

// Detailed defaulters list with class info (more fields than /defaulters)
router.get('/report/defaulters', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { class_id, academic_year, term } = req.query;
    const year = academic_year || new Date().getFullYear().toString();

    let sql = `
      SELECT s.id, s.first_name, s.last_name, s.admission_number,
             c.name AS class_name, s.student_type,
             COALESCE(SUM(fi.net_amount),     0)::numeric AS total_invoiced,
             COALESCE(SUM(fi.paid_amount),    0)::numeric AS total_paid,
             COALESCE(SUM(fi.balance_amount), 0)::numeric AS total_due,
             COUNT(fi.id)::int AS invoice_count,
             MIN(fi.due_date)  AS earliest_due
      FROM students s
      JOIN fee_invoices fi ON fi.student_id = s.id AND fi.tenant_id = $1
        AND fi.balance_amount > 0 AND fi.status NOT IN ('paid','cancelled')
        AND fi.academic_year = $2
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.tenant_id = $1 AND s.status = 'active'`;
    const params = [tid, year];
    let pi = 3;

    if (term)     { sql += ` AND fi.term = $${pi}`;    params.push(term);     pi++; }
    if (class_id) { sql += ` AND s.class_id = $${pi}`; params.push(class_id); pi++; }

    sql += `
      GROUP BY s.id, s.first_name, s.last_name, s.admission_number, c.name, s.student_type
      ORDER BY total_due DESC`;

    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Report defaulters error:', error);
    res.status(500).json({ success: false, message: 'Error generating defaulters report' });
  }
});

// ─── M-Pesa STK Push ─────────────────────────────────────────────────────────

async function getMpesaToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error('M-Pesa credentials not configured');
  const credentials = Buffer.from(`${key}:${secret}`).toString('base64');
  const resp = await fetch(
    'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: `Basic ${credentials}` } }
  );
  if (!resp.ok) throw new Error(`M-Pesa auth failed: ${resp.status}`);
  const json = await resp.json();
  return json.access_token;
}

function normalizeMpesaPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1);
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.length === 9) return '254' + digits;
  throw new Error('Invalid phone number format. Use 07XXXXXXXX or 254XXXXXXXXX');
}

// POST /api/v1/fee/mpesa/pay — initiate STK push for a fee invoice
router.post('/mpesa/pay', async (req, res) => {
  try {
    if (!['parent', 'admin', 'finance_officer'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { invoiceId, phoneNumber, amount } = req.body;
    if (!invoiceId || !phoneNumber || !amount) {
      return res.status(400).json({ success: false, message: 'invoiceId, phoneNumber, and amount are required' });
    }
    const parsedAmount = Math.ceil(parseFloat(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL || `${process.env.BACKEND_URL || ''}/api/v1/fee/mpesa/callback`;

    if (!shortcode || !passkey) {
      return res.status(503).json({ success: false, message: 'M-Pesa is not configured on this server. Please contact the school administrator.' });
    }

    // Verify the invoice belongs to this tenant and is payable
    const tid = req.user.tenant_id;
    const invoiceRows = await query(
      `SELECT fi.*, s.first_name || ' ' || s.last_name AS student_name
       FROM fee_invoices fi
       JOIN students s ON s.id = fi.student_id
       WHERE fi.id = $1 AND fi.tenant_id = $2 AND fi.status != 'paid'`,
      [invoiceId, tid]
    );
    if (!invoiceRows.length) {
      return res.status(404).json({ success: false, message: 'Invoice not found or already paid' });
    }

    // Parents may only pay for their own children's invoices
    if (req.user.role === 'parent') {
      const access = await query(
        `SELECT 1 FROM parent_students ps
         JOIN parents p ON p.id = ps.parent_id
         WHERE ps.student_id = $1 AND p.user_id = $2`,
        [invoiceRows[0].student_id, req.user.id]
      );
      if (!access.length) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }
    const invoice = invoiceRows[0];
    const balance = parseFloat(invoice.balance_amount || invoice.net_amount || invoice.amount || 0);
    if (parsedAmount > balance) {
      return res.status(400).json({ success: false, message: `Amount exceeds balance due (KES ${balance.toLocaleString()})` });
    }

    const phone = normalizeMpesaPhone(String(phoneNumber));
    const token = await getMpesaToken();

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    const stkBody = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: parsedAmount,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: invoice.invoice_number || invoiceId.slice(0, 12),
      TransactionDesc: `School fees - ${invoice.student_name || 'Student'}`,
    };

    const stkResp = await fetch(
      'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(stkBody),
      }
    );
    const stkJson = await stkResp.json();

    if (stkJson.ResponseCode === '0') {
      // Store pending transaction reference
      await query(
        `UPDATE fee_invoices SET metadata = COALESCE(metadata, '{}'::jsonb) ||
           jsonb_build_object('mpesa_checkout_id', $1::text, 'mpesa_initiated_at', NOW()::text, 'mpesa_amount', $3::numeric)
         WHERE id = $2`,
        [stkJson.CheckoutRequestID, invoiceId, parsedAmount]
      ).catch(() => {}); // non-fatal
      return res.json({
        success: true,
        message: 'Payment request sent to your phone. Enter your M-Pesa PIN to complete.',
        checkout_request_id: stkJson.CheckoutRequestID,
      });
    }

    logger.warn('M-Pesa STK push rejected:', stkJson);
    res.status(502).json({
      success: false,
      message: stkJson.errorMessage || stkJson.CustomerMessage || 'M-Pesa request failed. Please try again.',
    });
  } catch (err) {
    logger.error('M-Pesa pay error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to initiate M-Pesa payment' });
  }
});

// GET /api/v1/fee/mpesa/status/:checkoutRequestId — poll STK status
router.get('/mpesa/status/:checkoutRequestId', async (req, res) => {
  try {
    if (!['parent', 'admin', 'finance_officer'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    if (!shortcode || !passkey) {
      return res.status(503).json({ success: false, message: 'M-Pesa not configured' });
    }
    const token = await getMpesaToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
    const qResp = await fetch(
      'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ BusinessShortCode: shortcode, Password: password, Timestamp: timestamp, CheckoutRequestID: req.params.checkoutRequestId }),
      }
    );
    const json = await qResp.json();
    res.json({ success: true, data: json });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/fee/mpesa/student/:studentId — M-Pesa transaction history for a student
router.get('/mpesa/student/:studentId', async (req, res) => {
  try {
    if (!['parent', 'admin', 'finance_officer'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT fp.* FROM fee_payments fp
       WHERE fp.student_id = $1 AND fp.tenant_id = $2 AND fp.payment_method = 'mpesa'
       ORDER BY fp.payment_date DESC`,
      [req.params.studentId, tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
