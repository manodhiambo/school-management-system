import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

// Get fee structures
router.get('/structure', authenticate, async (req, res) => {
  try {
    const structures = await query('SELECT * FROM fee_structure ORDER BY name');
    res.json({ success: true, data: structures });
  } catch (error) {
    logger.error('Get fee structures error:', error);
    res.status(500).json({ success: false, message: 'Error fetching fee structures' });
  }
});

// Create fee structure
router.post('/structure', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { name, amount, frequency, description, due_day } = req.body;
    const structureId = uuidv4();
    
    await query(
      `INSERT INTO fee_structure (id, name, amount, frequency, description, due_day)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [structureId, name, amount, frequency || 'monthly', description, due_day || 1]
    );
    
    res.status(201).json({ success: true, message: 'Fee structure created' });
  } catch (error) {
    logger.error('Create fee structure error:', error);
    res.status(500).json({ success: false, message: 'Error creating fee structure' });
  }
});

// Get fee invoices
router.get('/invoice', authenticate, async (req, res) => {
  try {
    const { studentId, status } = req.query;
    
    let sql = `
      SELECT fi.*, s.first_name, s.last_name, s.admission_number, c.name as class_name
      FROM fee_invoices fi
      JOIN students s ON fi.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

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

    sql += ' ORDER BY fi.created_at DESC';

    const invoices = await query(sql, params);
    res.json({ success: true, data: invoices });
  } catch (error) {
    logger.error('Get fee invoices error:', error);
    res.status(500).json({ success: false, message: 'Error fetching invoices' });
  }
});

// Get single invoice
router.get('/invoice/:id', authenticate, async (req, res) => {
  try {
    const invoices = await query(
      `SELECT fi.*, s.first_name, s.last_name, s.admission_number
       FROM fee_invoices fi
       JOIN students s ON fi.student_id = s.id
       WHERE fi.id = $1`,
      [req.params.id]
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

// Create invoice
router.post('/invoice', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { student_id, description, gross_amount, discount, net_amount, due_date, status } = req.body;
    
    const invoiceId = uuidv4();
    const invoiceNumber = `INV-${Date.now()}`;
    
    await query(
      `INSERT INTO fee_invoices (id, invoice_number, student_id, description, gross_amount, discount_amount, net_amount, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [invoiceId, invoiceNumber, student_id, description, gross_amount, discount || 0, net_amount || gross_amount, due_date, status || 'pending']
    );
    
    res.status(201).json({ success: true, message: 'Invoice created', data: { id: invoiceId } });
  } catch (error) {
    logger.error('Create invoice error:', error);
    res.status(500).json({ success: false, message: 'Error creating invoice' });
  }
});

// Bulk create invoices
router.post('/invoice/bulk', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { studentIds, feeStructureId, description, dueDate } = req.body;
    
    // Get fee structure
    const structures = await query('SELECT * FROM fee_structure WHERE id = $1', [feeStructureId]);
    if (structures.length === 0) {
      return res.status(404).json({ success: false, message: 'Fee structure not found' });
    }
    
    const structure = structures[0];
    const created = [];
    
    for (const studentId of studentIds) {
      const invoiceId = uuidv4();
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await query(
        `INSERT INTO fee_invoices (id, invoice_number, student_id, description, gross_amount, net_amount, due_date, status)
         VALUES ($1, $2, $3, $4, $5, $5, $6, 'pending')`,
        [invoiceId, invoiceNumber, studentId, description || structure.name, structure.amount, dueDate]
      );
      
      created.push(invoiceId);
    }
    
    res.json({ success: true, message: `${created.length} invoices created` });
  } catch (error) {
    logger.error('Bulk create invoices error:', error);
    res.status(500).json({ success: false, message: 'Error creating invoices' });
  }
});

// Get fee payments
router.get('/payment', authenticate, async (req, res) => {
  try {
    const payments = await query(`
      SELECT fp.*, fi.invoice_number, s.first_name, s.last_name
      FROM fee_payments fp
      JOIN fee_invoices fi ON fp.invoice_id = fi.id
      JOIN students s ON fi.student_id = s.id
      ORDER BY fp.payment_date DESC
    `);
    res.json({ success: true, data: payments });
  } catch (error) {
    logger.error('Get payments error:', error);
    res.status(500).json({ success: false, message: 'Error fetching payments' });
  }
});

// Record payment
router.post('/payment', authenticate, async (req, res) => {
  try {
    const { invoice_id, amount, payment_method, transaction_id, remarks } = req.body;
    
    const paymentId = uuidv4();
    
    await query(
      `INSERT INTO fee_payments (id, invoice_id, amount, payment_method, transaction_id, remarks, status, payment_date)
       VALUES ($1, $2, $3, $4, $5, $6, 'success', NOW())`,
      [paymentId, invoice_id, amount, payment_method || 'cash', transaction_id, remarks]
    );
    
    // Update invoice
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
      [amount, invoice_id]
    );
    
    res.json({ success: true, message: 'Payment recorded successfully' });
  } catch (error) {
    logger.error('Record payment error:', error);
    res.status(500).json({ success: false, message: 'Error recording payment' });
  }
});

// Get fee statistics
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        COALESCE(SUM(net_amount), 0) as total_amount,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(balance_amount), 0) as total_pending,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count
      FROM fee_invoices
    `);
    res.json({ success: true, data: stats[0] || {} });
  } catch (error) {
    logger.error('Get fee statistics error:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
});

// Get fee defaulters
router.get('/defaulters', authenticate, async (req, res) => {
  try {
    const defaulters = await query(`
      SELECT s.id, s.first_name, s.last_name, s.admission_number, c.name as class_name,
        COALESCE(SUM(fi.balance_amount), 0) as total_due
      FROM students s
      JOIN fee_invoices fi ON s.id = fi.student_id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE fi.balance_amount > 0
      GROUP BY s.id, s.first_name, s.last_name, s.admission_number, c.name
      ORDER BY total_due DESC
    `);
    res.json({ success: true, data: defaulters });
  } catch (error) {
    logger.error('Get defaulters error:', error);
    res.status(500).json({ success: false, message: 'Error fetching defaulters' });
  }
});

// Get student fee account
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const invoices = await query(
      'SELECT * FROM fee_invoices WHERE student_id = $1 ORDER BY created_at DESC',
      [req.params.studentId]
    );
    
    const payments = await query(`
      SELECT fp.* FROM fee_payments fp
      JOIN fee_invoices fi ON fp.invoice_id = fi.id
      WHERE fi.student_id = $1
      ORDER BY fp.payment_date DESC
    `, [req.params.studentId]);
    
    const summary = await query(`
      SELECT
        COALESCE(SUM(net_amount), 0) as total_amount,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(balance_amount), 0) as total_balance
      FROM fee_invoices WHERE student_id = $1
    `, [req.params.studentId]);
    
    res.json({
      success: true,
      data: {
        invoices,
        payments,
        summary: summary[0] || {}
      }
    });
  } catch (error) {
    logger.error('Get student fee account error:', error);
    res.status(500).json({ success: false, message: 'Error fetching fee account' });
  }
});

export default router;
