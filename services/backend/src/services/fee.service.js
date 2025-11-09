const { query, transaction } = require('../config/database');
const EmailService = require('../services/email.service');
const SMSService = require('../services/sms.service');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { z } = require('zod');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const feeStructureSchema = z.object({
  class_id: z.string().uuid(),
  name: z.string().min(1),
  amount: z.coerce.number().min(0),
  frequency: z.enum(['monthly', 'quarterly', 'half_yearly', 'yearly']),
  due_day: z.coerce.number().min(1).max(31).default(10),
  late_fee_amount: z.coerce.number().min(0).default(0),
  late_fee_per_day: z.coerce.number().min(0).default(0)
});

const paymentSchema = z.object({
  invoice_id: z.string().uuid(),
  payment_method: z.enum(['cash', 'cheque', 'card', 'upi', 'net_banking', 'wallet']),
  amount: z.coerce.number().min(0),
  transaction_id: z.string().optional(),
  gateway_response: z.object({}).optional().nullable()
});

class FeeService {
  static async createFeeStructure(feeData) {
    const validatedData = feeStructureSchema.parse(feeData);

    const [result] = await query(
      `INSERT INTO fee_structure 
       (id, class_id, name, amount, frequency, due_day, late_fee_amount, late_fee_per_day)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
      [
        validatedData.class_id,
        validatedData.name,
        validatedData.amount,
        validatedData.frequency,
        validatedData.due_day,
        validatedData.late_fee_amount,
        validatedData.late_fee_per_day
      ]
    );

    logger.info(`Fee structure created: ${validatedData.name}`);
    
    return { feeStructureId: result.insertId };
  }

  static async getFeeStructure(filters = {}) {
    let whereConditions = ['is_active = TRUE'];
    let params = [];

    if (filters.classId) {
      whereConditions.push('fs.class_id = ?');
      params.push(filters.classId);
    }

    const whereClause = whereConditions.join(' AND ');

    const [structures] = await query(
      `SELECT 
        fs.*,
        c.name as class_name
      FROM fee_structure fs
      LEFT JOIN classes c ON fs.class_id = c.id
      WHERE ${whereClause}
      ORDER BY c.numeric_value, fs.name`,
      params
    );

    return structures;
  }

  static async getStudentFeeAccount(studentId) {
    const [invoices] = await query(
      `SELECT 
        fi.*,
        SUM(fp.amount) as paid_amount,
        COUNT(fp.id) as payment_count,
        c.name as class_name
      FROM fee_invoices fi
      LEFT JOIN fee_payments fp ON fi.id = fp.invoice_id
      JOIN students s ON fi.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE fi.student_id = ?
      GROUP BY fi.id
      ORDER BY fi.month DESC`,
      [studentId]
    );

    // Calculate pending amount
    const invoicesWithBalance = invoices.map(invoice => {
      const paidAmount = parseFloat(invoice.paid_amount) || 0;
      const netAmount = parseFloat(invoice.net_amount);
      const pendingAmount = netAmount - paidAmount;
      
      return {
        ...invoice,
        paid_amount: paidAmount,
        pending_amount: pendingAmount,
        status: pendingAmount <= 0 ? 'paid' : invoice.status
      };
    });

    return invoicesWithBalance;
  }

  static async generateInvoices() {
    return transaction(async (connection) => {
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const dueDay = currentDate.getDate();

      // Get all active fee structures
      const [feeStructures] = await connection.execute(
        `SELECT 
          fs.*,
          s.id as student_id,
          s.class_id
        FROM fee_structure fs
        JOIN students s ON fs.class_id = s.class_id
        WHERE fs.is_active = TRUE AND s.status = 'active'`
      );

      let generatedCount = 0;

      for (const structure of feeStructures) {
        // Check if invoice already exists for this student and month
        const [existing] = await connection.execute(
          `SELECT id FROM fee_invoices WHERE student_id = ? AND month = ?`,
          [structure.student_id, currentMonth]
        );

        if (existing.length === 0) {
          // Generate invoice number
          const invoiceNumber = `INV${currentMonth.replace('-', '')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

          // Calculate net amount (apply discounts if any)
          const discountAmount = 0; // Could be based on scholarships
          const taxAmount = 0; // Could be GST
          const netAmount = structure.amount - discountAmount + taxAmount;

          await connection.execute(
            `INSERT INTO fee_invoices 
             (id, student_id, invoice_number, month, total_amount, discount_amount, tax_amount, net_amount, due_date)
             VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              structure.student_id,
              invoiceNumber,
              currentMonth,
              structure.amount,
              discountAmount,
              taxAmount,
              netAmount,
              new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, structure.due_day).toISOString().split('T')[0]
            ]
          );

          generatedCount++;
        }
      }

      logger.info(`Generated ${generatedCount} invoices for month ${currentMonth}`);
      
      return { success: true, generatedCount };
    });
  }

  static async recordPayment(paymentData, collectedBy) {
    return transaction(async (connection) => {
      const validatedData = paymentSchema.parse(paymentData);

      // Get invoice details
      const [invoice] = await connection.execute(
        'SELECT student_id, net_amount FROM fee_invoices WHERE id = ?',
        [validatedData.invoice_id]
      );

      if (!invoice.length) {
        throw new Error('Invoice not found');
      }

      // Calculate total paid amount
      const [payments] = await connection.execute(
        'SELECT SUM(amount) as total_paid FROM fee_payments WHERE invoice_id = ?',
        [validatedData.invoice_id]
      );

      const totalPaid = parseFloat(payments[0].total_paid) || 0;
      const invoiceAmount = parseFloat(invoice[0].net_amount);
      const newTotal = totalPaid + validatedData.amount;

      if (newTotal > invoiceAmount) {
        throw new Error('Payment amount exceeds invoice amount');
      }

      // Create payment record
      const [result] = await connection.execute(
        `INSERT INTO fee_payments 
         (id, invoice_id, payment_method, transaction_id, amount, collected_by, gateway_response)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
        [
          validatedData.invoice_id,
          validatedData.payment_method,
          validatedData.transaction_id || null,
          validatedData.amount,
          collectedBy,
          validatedData.gateway_response ? JSON.stringify(validatedData.gateway_response) : null
        ]
      );

      // Update invoice status
      const status = newTotal >= invoiceAmount ? 'paid' : 'partial';
      await connection.execute(
        'UPDATE fee_invoices SET status = ? WHERE id = ?',
        [status, validatedData.invoice_id]
      );

      // Generate receipt
      const receiptUrl = await this.generateReceipt(result.insertId);
      
      await connection.execute(
        'UPDATE fee_payments SET receipt_url = ? WHERE id = ?',
        [receiptUrl, result.insertId]
      );

      logger.info(`Payment recorded: ${validatedData.amount} for invoice ${validatedData.invoice_id}`);
      
      return { 
        paymentId: result.insertId, 
        receiptUrl,
        status 
      };
    });
  }

  static async processOnlinePayment(paymentData) {
    const validatedData = paymentSchema.parse(paymentData);

    // Create invoice record in payment gateway
    if (validatedData.payment_method === 'card') {
      return this.processStripePayment(validatedData);
    } else if (validatedData.payment_method === 'upi') {
      return this.processRazorpayPayment(validatedData);
    } else {
      throw new Error('Unsupported online payment method');
    }
  }

  static async processStripePayment(paymentData) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'inr',
            product_data: {
              name: 'School Fee Payment',
            },
            unit_amount: paymentData.amount * 100, // Convert to paise
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payments/cancel`,
        metadata: {
          invoice_id: paymentData.invoice_id
        }
      });

      return { 
        paymentId: session.id, 
        paymentUrl: session.url,
        gateway: 'stripe'
      };
    } catch (error) {
      logger.error('Stripe payment error:', error);
      throw error;
    }
  }

  static async processRazorpayPayment(paymentData) {
    try {
      const order = await razorpay.orders.create({
        amount: paymentData.amount * 100, // Convert to paise
        currency: 'INR',
        receipt: `fee_${paymentData.invoice_id}`,
        notes: {
          invoice_id: paymentData.invoice_id
        }
      });

      return { 
        paymentId: order.id, 
        orderId: order.id,
        gateway: 'razorpay'
      };
    } catch (error) {
      logger.error('Razorpay payment error:', error);
      throw error;
    }
  }

  static async handleWebhook(provider, payload, signature) {
    let event;

    if (provider === 'stripe') {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const invoiceId = session.metadata.invoice_id;
        
        // Record payment
        await this.recordPayment({
          invoice_id: invoiceId,
          payment_method: 'card',
          amount: session.amount_total / 100,
          transaction_id: session.payment_intent,
          gateway_response: session
        }, 'system');
      }
    } else if (provider === 'razorpay') {
      // Verify Razorpay signature
      const isValid = razorpay.validateWebhookSignature(
        JSON.stringify(payload),
        signature,
        process.env.RAZORPAY_WEBHOOK_SECRET
      );

      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      if (payload.event === 'payment.captured') {
        const payment = payload.payload.payment.entity;
        const invoiceId = payment.notes.invoice_id;
        
        await this.recordPayment({
          invoice_id: invoiceId,
          payment_method: 'upi',
          amount: payment.amount / 100,
          transaction_id: payment.id,
          gateway_response: payment
        }, 'system');
      }
    }

    logger.info(`Webhook processed for ${provider}`);
    
    return { success: true };
  }

  static async getFeeDefaulters() {
    const [defaulters] = await query(
      `SELECT 
        fi.*,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        s.admission_number,
        c.name as class_name,
        sec.section as section_name,
        p.first_name as parent_first_name,
        p.last_name as parent_last_name,
        p.phone_primary,
        p.phone_secondary,
        u.email as parent_email,
        DATEDIFF(CURDATE(), fi.due_date) as days_overdue
      FROM fee_invoices fi
      JOIN students s ON fi.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN parent_students ps ON s.id = ps.student_id
      LEFT JOIN parents p ON ps.parent_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE fi.status IN ('pending', 'overdue')
      AND fi.due_date < CURDATE()
      ORDER BY fi.due_date ASC`
    );

    return defaulters;
  }

  static async sendFeeReminders() {
    const [pendingInvoices] = await query(
      `SELECT 
        fi.*,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        p.first_name as parent_first_name,
        p.last_name as parent_last_name,
        u.email,
        p.phone_primary,
        DATEDIFF(CURDATE(), fi.due_date) as days_overdue
      FROM fee_invoices fi
      JOIN students s ON fi.student_id = s.id
      JOIN parent_students ps ON s.id = ps.student_id
      JOIN parents p ON ps.parent_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE fi.status = 'pending'
      AND fi.due_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
      AND DATEDIFF(CURDATE(), fi.due_date) >= -3`
    );

    let reminderCount = 0;

    for (const invoice of pendingInvoices) {
      try {
        // Send email
        if (invoice.email) {
          await EmailService.sendFeeReminderEmail(
            invoice.email,
            `${invoice.student_first_name} ${invoice.student_last_name}`,
            invoice.invoice_number,
            invoice.net_amount,
            invoice.due_date
          );
        }

        // Send SMS
        if (invoice.phone_primary) {
          await SMSService.sendFeeReminderSMS(
            invoice.phone_primary,
            `${invoice.student_first_name} ${invoice.student_last_name}`,
            invoice.net_amount,
            invoice.due_date
          );
        }

        reminderCount++;
      } catch (error) {
        logger.error(`Failed to send reminder for invoice ${invoice.id}:`, error);
      }
    }

    logger.info(`Sent ${reminderCount} fee reminders`);
    
    return { success: true, reminderCount };
  }

  static async getFeeAnalytics() {
    const [collectionSummary] = await query(
      `SELECT 
        fi.month,
        SUM(fi.net_amount) as total_due,
        SUM(COALESCE(fp.paid_amount, 0)) as total_collected,
        SUM(fi.net_amount) - SUM(COALESCE(fp.paid_amount, 0)) as total_pending,
        ROUND(SUM(COALESCE(fp.paid_amount, 0)) / SUM(fi.net_amount) * 100, 2) as collection_percentage
      FROM fee_invoices fi
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) as paid_amount
        FROM fee_payments
        GROUP BY invoice_id
      ) fp ON fi.id = fp.invoice_id
      GROUP BY fi.month
      ORDER BY fi.month DESC
      LIMIT 12`
    );

    const [paymentMethods] = await query(
      `SELECT 
        payment_method,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount
      FROM fee_payments
      WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY payment_method
      ORDER BY total_amount DESC`
    );

    const [defaulterStats] = await query(
      `SELECT 
        COUNT(DISTINCT fi.student_id) as defaulter_count,
        SUM(fi.net_amount - COALESCE(fp.paid_amount, 0)) as total_pending_amount,
        AVG(DATEDIFF(CURDATE(), fi.due_date)) as avg_days_overdue
      FROM fee_invoices fi
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) as paid_amount
        FROM fee_payments
        GROUP BY invoice_id
      ) fp ON fi.id = fp.invoice_id
      WHERE fi.status IN ('pending', 'overdue')
      AND fi.due_date < CURDATE()`
    );

    return {
      collectionSummary,
      paymentMethods,
      defaulterStats: defaulterStats[0]
    };
  }

  static async generateReceipt(paymentId) {
    const [payment] = await query(
      `SELECT 
        fp.*,
        fi.invoice_number,
        fi.month,
        fi.net_amount,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        s.admission_number,
        c.name as class_name,
        sec.section as section_name
      FROM fee_payments fp
      JOIN fee_invoices fi ON fp.invoice_id = fi.id
      JOIN students s ON fi.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE fp.id = ?`,
      [paymentId]
    );

    if (!payment.length) {
      throw new Error('Payment not found');
    }

    const pay = payment[0];

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    const receiptPath = path.join(__dirname, `../../receipts/receipt_${pay.invoice_number}_${Date.now()}.pdf`);
    
    // Ensure receipts directory exists
    const dir = path.dirname(receiptPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const stream = fs.createWriteStream(receiptPath);
    doc.pipe(stream);

    // Add content
    doc.fontSize(20).text(process.env.SCHOOL_NAME || 'School Management System', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text('Fee Receipt', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Receipt #: ${pay.id}`);
    doc.text(`Invoice #: ${pay.invoice_number}`);
    doc.text(`Date: ${new Date(pay.payment_date).toLocaleDateString()}`);
    doc.moveDown();

    doc.text(`Student: ${pay.student_first_name} ${pay.student_last_name}`);
    doc.text(`Admission #: ${pay.admission_number}`);
    doc.text(`Class: ${pay.class_name} - ${pay.section_name}`);
    doc.moveDown();

    doc.text(`Amount Paid: ₹${pay.amount}`);
    doc.text(`Payment Method: ${pay.payment_method.toUpperCase()}`);
    if (pay.transaction_id) {
      doc.text(`Transaction ID: ${pay.transaction_id}`);
    }
    doc.moveDown();

    doc.text('Thank you for your payment!', { align: 'center' });

    doc.end();

    // Wait for file to be written
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return receiptPath;
  }
}

module.exports = FeeService;
