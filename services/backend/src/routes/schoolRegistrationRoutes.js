import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { initiateSTKPush, formatPhone } from '../services/mpesaService.js';
import { authenticate } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

const REGISTRATION_FEE = 50000; // KES 50,000
const RENEWAL_FEE = 10000;      // KES 10,000

// ============================================================
// POST /register — Register a new school (public)
// ============================================================
router.post('/register', async (req, res) => {
  try {
    const {
      schoolName,
      schoolEmail,
      schoolPhone,
      schoolAddress,
      county,
      contactPerson,
      registrationNumber,
      adminEmail,
      adminPassword
    } = req.body;

    // Validate required fields
    const missing = [];
    if (!schoolName) missing.push('schoolName');
    if (!schoolEmail) missing.push('schoolEmail');
    if (!schoolPhone) missing.push('schoolPhone');
    if (!adminEmail) missing.push('adminEmail');
    if (!adminPassword) missing.push('adminPassword');

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }

    if (adminPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Admin password must be at least 6 characters'
      });
    }

    // Validate email formats (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(schoolEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid school email format' });
    }
    if (!emailRegex.test(adminEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid admin email format' });
    }

    // Check school email not already in use
    const existingSchool = await query(
      'SELECT id FROM tenants WHERE school_email = $1',
      [schoolEmail]
    );
    if (existingSchool.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A school with this email is already registered'
      });
    }

    // Check admin email not already in use
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );
    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this admin email already exists'
      });
    }

    // Validate phone format
    let formattedPhone;
    try {
      formattedPhone = formatPhone(schoolPhone);
    } catch (phoneErr) {
      return res.status(400).json({ success: false, message: phoneErr.message });
    }

    // Create tenant record (status = 'pending' until payment)
    const tenantResult = await query(`
      INSERT INTO tenants (
        school_name, school_email, school_phone, school_address,
        county, contact_person, registration_number,
        status, registration_fee_paid, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', false, NOW())
      RETURNING *
    `, [
      schoolName, schoolEmail, formattedPhone, schoolAddress,
      county, contactPerson, registrationNumber
    ]);

    const tenant = tenantResult[0];

    // Store admin credentials temporarily in payment notes (hashed for safety)
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const notesPayload = JSON.stringify({
      adminEmail,
      hashedPassword
    });

    // Create payment record
    const paymentResult = await query(`
      INSERT INTO tenant_payments (
        tenant_id, payment_type, amount, phone_number, status, notes
      ) VALUES ($1, 'registration', $2, $3, 'pending', $4)
      RETURNING *
    `, [tenant.id, REGISTRATION_FEE, formattedPhone, notesPayload]);

    const payment = paymentResult[0];

    // Initiate STK Push
    let checkoutRequestId = null;
    let merchantRequestId = null;
    let stkMessage = 'STK push initiated';

    try {
      const stkResponse = await initiateSTKPush(
        formattedPhone,
        REGISTRATION_FEE,
        `REG-${tenant.id.split('-')[0].toUpperCase()}`,
        'SchoolReg'
      );

      checkoutRequestId = stkResponse.CheckoutRequestID;
      merchantRequestId = stkResponse.MerchantRequestID;

      // Save checkout_request_id and merchant_request_id to payment record
      await query(`
        UPDATE tenant_payments SET
          checkout_request_id = $1,
          merchant_request_id = $2
        WHERE id = $3
      `, [checkoutRequestId, merchantRequestId, payment.id]);

      logger.info(`STK Push sent for tenant ${tenant.id}, checkoutRequestId: ${checkoutRequestId}`);
    } catch (stkErr) {
      // In sandbox/dev mode, log and continue — don't block registration
      logger.warn(`STK Push failed (sandbox?): ${stkErr.message}`);
      stkMessage = `STK Push could not be sent: ${stkErr.message}. Please contact support.`;
    }

    res.status(201).json({
      success: true,
      message: checkoutRequestId
        ? 'STK push sent to your phone. Enter your M-Pesa PIN to complete registration.'
        : stkMessage,
      data: {
        tenantId: tenant.id,
        paymentId: payment.id,
        checkoutRequestId,
        merchantRequestId,
        schoolName: tenant.school_name,
        status: tenant.status
      }
    });
  } catch (error) {
    logger.error('School registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// ============================================================
// POST /mpesa/callback — M-Pesa STK callback (public, called by Safaricom)
// ============================================================
router.post('/mpesa/callback', async (req, res) => {
  try {
    logger.info('M-Pesa registration callback received:', JSON.stringify(req.body));

    const stkCallback = req.body?.Body?.stkCallback;
    if (!stkCallback) {
      logger.warn('Invalid callback format received');
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = stkCallback;

    // Find the payment by checkout_request_id
    const payments = await query(
      `SELECT tp.*, t.id AS tenant_id_ref
       FROM tenant_payments tp
       JOIN tenants t ON t.id = tp.tenant_id
       WHERE tp.checkout_request_id = $1`,
      [CheckoutRequestID]
    );

    if (payments.length === 0) {
      logger.warn(`No payment found for CheckoutRequestID: ${CheckoutRequestID}`);
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const payment = payments[0];

    if (ResultCode === 0) {
      // Payment successful — extract metadata
      const items = CallbackMetadata?.Item || [];
      let mpesaReceiptNumber = null;
      let amount = null;
      let phoneNumber = null;

      items.forEach((item) => {
        if (item.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = item.Value;
        if (item.Name === 'Amount') amount = item.Value;
        if (item.Name === 'PhoneNumber') phoneNumber = item.Value;
      });

      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      // Update payment record
      await query(`
        UPDATE tenant_payments SET
          status = 'completed',
          mpesa_receipt_number = $1,
          result_code = 0,
          result_desc = $2,
          payment_date = NOW()
        WHERE id = $3
      `, [mpesaReceiptNumber, ResultDesc, payment.id]);

      // Activate tenant
      await query(`
        UPDATE tenants SET
          status = 'active',
          registration_fee_paid = true,
          subscription_start = NOW(),
          subscription_end = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [oneYearFromNow.toISOString().split('T')[0], payment.tenant_id]);

      // Create admin user from stored credentials in notes
      try {
        let adminCredentials = null;
        if (payment.notes) {
          adminCredentials = JSON.parse(payment.notes);
        }

        if (adminCredentials?.adminEmail && adminCredentials?.hashedPassword) {
          // Check if user already exists (in case of duplicate callback)
          const existingAdmin = await query(
            'SELECT id FROM users WHERE email = $1',
            [adminCredentials.adminEmail]
          );

          if (existingAdmin.length === 0) {
            await query(`
              INSERT INTO users (
                id, email, password, role, tenant_id,
                is_active, is_verified, created_at, updated_at
              ) VALUES (
                $1, $2, $3, 'admin', $4,
                true, true, NOW(), NOW()
              )
            `, [
              uuidv4(),
              adminCredentials.adminEmail,
              adminCredentials.hashedPassword,
              payment.tenant_id
            ]);

            logger.info(`Admin user created for tenant ${payment.tenant_id}: ${adminCredentials.adminEmail}`);
          } else {
            logger.info(`Admin user already exists for email: ${adminCredentials.adminEmail}`);
          }
        }
      } catch (userErr) {
        logger.error('Failed to create admin user from callback:', userErr);
      }

      logger.info(`Registration payment successful for tenant ${payment.tenant_id}, receipt: ${mpesaReceiptNumber}`);
      // Welcome notification placeholder
      logger.info(`[WELCOME] School activation email should be sent to tenant ${payment.tenant_id}`);
    } else {
      // Payment failed
      await query(`
        UPDATE tenant_payments SET
          status = 'failed',
          result_code = $1,
          result_desc = $2
        WHERE id = $3
      `, [ResultCode, ResultDesc, payment.id]);

      logger.warn(`Registration payment failed for tenant ${payment.tenant_id}: ${ResultDesc}`);
    }

    // Always respond 200 with success to Safaricom
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    logger.error('M-Pesa callback error:', error);
    // Still return 200 to Safaricom so it doesn't retry endlessly
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

// ============================================================
// POST /renew — Renew subscription (requires tenant auth)
// ============================================================
router.post('/renew', authenticate, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const tenantId = req.user.tenant_id;
    if (!tenantId) {
      return res.status(403).json({ success: false, message: 'No tenant associated with this account' });
    }

    // Get tenant
    const tenants = await query(
      'SELECT * FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenants.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const tenant = tenants[0];

    if (tenant.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended. Contact support at helvinotechltd@gmail.com'
      });
    }

    // Validate phone
    let formattedPhone;
    try {
      formattedPhone = formatPhone(phone);
    } catch (phoneErr) {
      return res.status(400).json({ success: false, message: phoneErr.message });
    }

    // Create renewal payment record
    const paymentResult = await query(`
      INSERT INTO tenant_payments (
        tenant_id, payment_type, amount, phone_number, status
      ) VALUES ($1, 'renewal', $2, $3, 'pending')
      RETURNING *
    `, [tenantId, RENEWAL_FEE, formattedPhone]);

    const payment = paymentResult[0];

    let checkoutRequestId = null;
    let merchantRequestId = null;

    try {
      const stkResponse = await initiateSTKPush(
        formattedPhone,
        RENEWAL_FEE,
        `REN-${tenantId.split('-')[0].toUpperCase()}`,
        'Renewal'
      );

      checkoutRequestId = stkResponse.CheckoutRequestID;
      merchantRequestId = stkResponse.MerchantRequestID;

      await query(`
        UPDATE tenant_payments SET
          checkout_request_id = $1,
          merchant_request_id = $2
        WHERE id = $3
      `, [checkoutRequestId, merchantRequestId, payment.id]);

      logger.info(`Renewal STK Push sent for tenant ${tenantId}, checkoutRequestId: ${checkoutRequestId}`);
    } catch (stkErr) {
      logger.warn(`Renewal STK Push failed: ${stkErr.message}`);
    }

    res.json({
      success: true,
      message: checkoutRequestId
        ? 'STK push sent. Enter your M-Pesa PIN to complete renewal.'
        : 'Could not send STK Push. Please try again or contact support.',
      data: {
        paymentId: payment.id,
        checkoutRequestId,
        amount: RENEWAL_FEE
      }
    });
  } catch (error) {
    logger.error('Renewal error:', error);
    res.status(500).json({ success: false, message: 'Renewal failed. Please try again.' });
  }
});

// ============================================================
// POST /verify-payment — Poll payment status by checkoutRequestId (public)
// ============================================================
router.post('/verify-payment', async (req, res) => {
  try {
    const { checkoutRequestId } = req.body;

    if (!checkoutRequestId) {
      return res.status(400).json({
        success: false,
        message: 'checkoutRequestId is required'
      });
    }

    const payments = await query(
      `SELECT tp.id, tp.status AS payment_status, tp.payment_type,
              tp.amount, tp.mpesa_receipt_number, tp.result_code,
              tp.result_desc, tp.payment_date, tp.created_at,
              t.status AS tenant_status, t.id AS tenant_id,
              t.school_name, t.subscription_end
       FROM tenant_payments tp
       JOIN tenants t ON t.id = tp.tenant_id
       WHERE tp.checkout_request_id = $1`,
      [checkoutRequestId]
    );

    if (payments.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const payment = payments[0];

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        paymentStatus: payment.payment_status,
        paymentType: payment.payment_type,
        amount: payment.amount,
        mpesaReceiptNumber: payment.mpesa_receipt_number,
        resultCode: payment.result_code,
        resultDesc: payment.result_desc,
        paymentDate: payment.payment_date,
        tenantId: payment.tenant_id,
        tenantStatus: payment.tenant_status,
        schoolName: payment.school_name,
        subscriptionEnd: payment.subscription_end
      }
    });
  } catch (error) {
    logger.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  }
});

// ============================================================
// GET /check-activation/:tenantId — Check tenant activation status (public)
// ============================================================
router.get('/check-activation/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenants = await query(
      `SELECT id, status, school_name, subscription_start, subscription_end
       FROM tenants WHERE id = $1`,
      [tenantId]
    );

    if (tenants.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const tenant = tenants[0];

    res.json({
      success: true,
      data: {
        tenantId: tenant.id,
        schoolName: tenant.school_name,
        active: tenant.status === 'active',
        status: tenant.status,
        subscriptionStart: tenant.subscription_start,
        subscriptionEnd: tenant.subscription_end
      }
    });
  } catch (error) {
    logger.error('Check activation error:', error);
    res.status(500).json({ success: false, message: 'Failed to check activation status' });
  }
});

export default router;
