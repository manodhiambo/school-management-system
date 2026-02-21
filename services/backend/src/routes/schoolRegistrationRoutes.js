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

// Helper: generate unique school_code
function generateSchoolCode(schoolName) {
  const base = schoolName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${base}${rand}`;
}

// Helper: generate unique payment_number
function generatePaymentNumber() {
  return `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(schoolEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid school email format' });
    }
    if (!emailRegex.test(adminEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid admin email format' });
    }

    // Check school email not already in use
    const existingSchool = await query(
      'SELECT id FROM tenants WHERE email = $1',
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

    // Validate and format phone
    let formattedPhone;
    try {
      formattedPhone = formatPhone(schoolPhone);
    } catch (phoneErr) {
      return res.status(400).json({ success: false, message: phoneErr.message });
    }

    // Generate unique school_code and subdomain
    let school_code, subdomain;
    let codeUnique = false;
    while (!codeUnique) {
      school_code = generateSchoolCode(schoolName);
      subdomain = schoolName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) + school_code.slice(-4);
      const codeCheck = await query('SELECT id FROM tenants WHERE school_code = $1 OR subdomain = $2', [school_code, subdomain]);
      if (codeCheck.length === 0) codeUnique = true;
    }
    const schema_name = `tenant_${school_code.toLowerCase()}`;

    // Create tenant record (status = 'trial' until payment activates it)
    const tenantResult = await query(`
      INSERT INTO tenants (
        school_name, email, phone, address, county, country,
        admin_email, school_code, subdomain, schema_name,
        status, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'Kenya', $6, $7, $8, $9, 'trial', NOW())
      RETURNING *
    `, [
      schoolName, schoolEmail, formattedPhone, schoolAddress || null, county || null,
      adminEmail, school_code, subdomain, schema_name
    ]);

    const tenant = tenantResult[0];

    // Store admin credentials temporarily in payment notes (hashed)
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const notesPayload = JSON.stringify({
      adminEmail,
      hashedPassword,
      contactPerson: contactPerson || '',
      registrationNumber: registrationNumber || ''
    });

    // Create payment record
    const paymentNumber = generatePaymentNumber();
    const paymentResult = await query(`
      INSERT INTO tenant_payments (
        tenant_id, payment_number, amount, currency, payment_method,
        payment_provider, mpesa_phone_number, status, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, 'KES', 'mpesa', 'safaricom', $4, 'pending', $5, NOW(), NOW())
      RETURNING *
    `, [tenant.id, paymentNumber, REGISTRATION_FEE, formattedPhone, notesPayload]);

    const payment = paymentResult[0];

    // Initiate STK Push
    let checkoutRequestId = null;
    let stkMessage = 'STK push initiated';

    try {
      const stkResponse = await initiateSTKPush(
        formattedPhone,
        REGISTRATION_FEE,
        `REG-${tenant.school_code}`,
        'SchoolReg'
      );

      checkoutRequestId = stkResponse.CheckoutRequestID;

      await query(`
        UPDATE tenant_payments SET
          mpesa_checkout_request_id = $1,
          mpesa_transaction_id = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [checkoutRequestId, stkResponse.MerchantRequestID || null, payment.id]);

      logger.info(`STK Push sent for tenant ${tenant.id}, checkoutRequestId: ${checkoutRequestId}`);
    } catch (stkErr) {
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
        schoolName: tenant.school_name,
        status: tenant.status
      }
    });
  } catch (error) {
    logger.error('School registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.', error: error.message });
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

    // Find the payment by mpesa_checkout_request_id
    const payments = await query(
      `SELECT tp.*, t.id AS the_tenant_id
       FROM tenant_payments tp
       JOIN tenants t ON t.id = tp.tenant_id
       WHERE tp.mpesa_checkout_request_id = $1`,
      [CheckoutRequestID]
    );

    if (payments.length === 0) {
      logger.warn(`No payment found for CheckoutRequestID: ${CheckoutRequestID}`);
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const payment = payments[0];

    if (ResultCode === 0) {
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
          callback_data = $2,
          transaction_date = NOW(),
          updated_at = NOW()
        WHERE id = $3
      `, [mpesaReceiptNumber, JSON.stringify(req.body), payment.id]);

      // Activate tenant
      await query(`
        UPDATE tenants SET
          status = 'active',
          subscription_starts_at = NOW(),
          subscription_ends_at = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [oneYearFromNow.toISOString(), payment.tenant_id]);

      // Create admin user from stored credentials
      try {
        let adminCredentials = null;
        if (payment.notes) {
          adminCredentials = JSON.parse(payment.notes);
        }

        if (adminCredentials?.adminEmail && adminCredentials?.hashedPassword) {
          const existingAdmin = await query(
            'SELECT id FROM users WHERE email = $1',
            [adminCredentials.adminEmail]
          );

          if (existingAdmin.length === 0) {
            const newUserId = uuidv4();
            await query(`
              INSERT INTO users (
                id, email, password, role, tenant_id,
                is_active, is_verified, created_at, updated_at
              ) VALUES (
                $1, $2, $3, 'admin', $4,
                true, true, NOW(), NOW()
              )
            `, [
              newUserId,
              adminCredentials.adminEmail,
              adminCredentials.hashedPassword,
              payment.tenant_id
            ]);

            // Update tenant with admin_user_id
            await query(
              'UPDATE tenants SET admin_user_id = $1, updated_at = NOW() WHERE id = $2',
              [newUserId, payment.tenant_id]
            );

            logger.info(`Admin user created for tenant ${payment.tenant_id}: ${adminCredentials.adminEmail}`);
          }
        }
      } catch (userErr) {
        logger.error('Failed to create admin user from callback:', userErr);
      }

      logger.info(`Registration payment successful for tenant ${payment.tenant_id}, receipt: ${mpesaReceiptNumber}`);
    } else {
      // Payment failed
      await query(`
        UPDATE tenant_payments SET
          status = 'failed',
          error_message = $1,
          callback_data = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [ResultDesc, JSON.stringify(req.body), payment.id]);

      logger.warn(`Registration payment failed for tenant ${payment.tenant_id}: ${ResultDesc}`);
    }

    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    logger.error('M-Pesa callback error:', error);
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

    const tenants = await query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
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

    let formattedPhone;
    try {
      formattedPhone = formatPhone(phone);
    } catch (phoneErr) {
      return res.status(400).json({ success: false, message: phoneErr.message });
    }

    const paymentNumber = generatePaymentNumber();
    const paymentResult = await query(`
      INSERT INTO tenant_payments (
        tenant_id, payment_number, amount, currency, payment_method,
        payment_provider, mpesa_phone_number, status, created_at, updated_at
      ) VALUES ($1, $2, $3, 'KES', 'mpesa', 'safaricom', $4, 'pending', NOW(), NOW())
      RETURNING *
    `, [tenantId, paymentNumber, RENEWAL_FEE, formattedPhone]);

    const payment = paymentResult[0];
    let checkoutRequestId = null;

    try {
      const stkResponse = await initiateSTKPush(
        formattedPhone,
        RENEWAL_FEE,
        `REN-${tenant.school_code}`,
        'Renewal'
      );

      checkoutRequestId = stkResponse.CheckoutRequestID;

      await query(`
        UPDATE tenant_payments SET
          mpesa_checkout_request_id = $1,
          mpesa_transaction_id = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [checkoutRequestId, stkResponse.MerchantRequestID || null, payment.id]);

      logger.info(`Renewal STK Push sent for tenant ${tenantId}`);
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
    res.status(500).json({ success: false, message: 'Renewal failed. Please try again.', error: error.message });
  }
});

// ============================================================
// GET /check-activation/:tenantId — Check tenant activation status (public)
// ============================================================
router.get('/check-activation/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenants = await query(
      `SELECT id, status, school_name, subscription_starts_at, subscription_ends_at
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
        subscriptionStart: tenant.subscription_starts_at,
        subscriptionEnd: tenant.subscription_ends_at
      }
    });
  } catch (error) {
    logger.error('Check activation error:', error);
    res.status(500).json({ success: false, message: 'Failed to check activation status', error: error.message });
  }
});

export default router;
