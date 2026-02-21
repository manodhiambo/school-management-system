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
const TRIAL_DAYS = 5;

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
// POST /register — Register a new school, start 5-day trial
// No payment required upfront — admin account created immediately
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
    if (!schoolName)    missing.push('schoolName');
    if (!schoolEmail)   missing.push('schoolEmail');
    if (!schoolPhone)   missing.push('schoolPhone');
    if (!adminEmail)    missing.push('adminEmail');
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

    // Check for duplicates
    const existingSchool = await query('SELECT id FROM tenants WHERE email = $1', [schoolEmail]);
    if (existingSchool.length > 0) {
      return res.status(409).json({ success: false, message: 'A school with this email is already registered' });
    }

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existingUser.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this admin email already exists' });
    }

    // Format phone
    let formattedPhone;
    try {
      formattedPhone = formatPhone(schoolPhone);
    } catch (phoneErr) {
      return res.status(400).json({ success: false, message: phoneErr.message });
    }

    // Generate unique school_code / subdomain / schema_name
    let school_code, subdomain;
    let codeUnique = false;
    while (!codeUnique) {
      school_code = generateSchoolCode(schoolName);
      subdomain   = schoolName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) + school_code.slice(-4);
      const check = await query('SELECT id FROM tenants WHERE school_code = $1 OR subdomain = $2', [school_code, subdomain]);
      if (check.length === 0) codeUnique = true;
    }
    const schema_name = `tenant_${school_code.toLowerCase()}`;

    // Trial ends TRIAL_DAYS from now
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    // Create tenant record with 'trial' status
    const tenantResult = await query(`
      INSERT INTO tenants (
        school_name, email, phone, address, county, country,
        admin_email, school_code, subdomain, schema_name,
        status, trial_ends_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'Kenya', $6, $7, $8, $9, 'trial', $10, NOW())
      RETURNING *
    `, [
      schoolName, schoolEmail, formattedPhone, schoolAddress || null, county || null,
      adminEmail, school_code, subdomain, schema_name, trialEndsAt.toISOString()
    ]);

    const tenant = tenantResult[0];

    // Create admin user immediately (no payment needed for trial)
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const newUserId = uuidv4();

    await query(`
      INSERT INTO users (
        id, email, password, role, tenant_id,
        is_active, is_verified, created_at, updated_at
      ) VALUES ($1, $2, $3, 'admin', $4, true, true, NOW(), NOW())
    `, [newUserId, adminEmail, hashedPassword, tenant.id]);

    // Link admin user back to tenant
    await query(
      'UPDATE tenants SET admin_user_id = $1, updated_at = NOW() WHERE id = $2',
      [newUserId, tenant.id]
    );

    logger.info(`Trial registration complete: tenant=${tenant.id}, admin=${adminEmail}, trial_ends=${trialEndsAt.toISOString()}`);

    res.status(201).json({
      success: true,
      message: `Your ${TRIAL_DAYS}-day free trial has started! Login with your email and password.`,
      data: {
        tenantId:   tenant.id,
        schoolName: tenant.school_name,
        adminEmail,
        status:     'trial',
        trialEndsAt: trialEndsAt.toISOString(),
        trialDays:  TRIAL_DAYS
      }
    });
  } catch (error) {
    logger.error('School registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.', error: error.message });
  }
});

// ============================================================
// POST /pay — Initiate M-Pesa payment to activate full subscription
// Can be called during trial or after expiry
// ============================================================
router.post('/pay', authenticate, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required for M-Pesa payment' });
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

    // Determine amount: registration fee (first-time) or renewal
    const isFirstPayment = !tenant.subscription_starts_at;
    const amount = isFirstPayment ? REGISTRATION_FEE : RENEWAL_FEE;
    const paymentType = isFirstPayment ? 'registration' : 'renewal';

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
        payment_provider, mpesa_phone_number, status, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, 'KES', 'mpesa', 'safaricom', $4, 'pending', $5, NOW(), NOW())
      RETURNING *
    `, [tenantId, paymentNumber, amount, formattedPhone, paymentType]);

    const payment = paymentResult[0];
    let checkoutRequestId = null;
    let stkMessage = '';

    try {
      const stkResponse = await initiateSTKPush(
        formattedPhone,
        amount,
        `${paymentType.toUpperCase()}-${tenant.school_code}`,
        paymentType === 'registration' ? 'SchoolActivation' : 'Renewal'
      );

      checkoutRequestId = stkResponse.CheckoutRequestID;

      await query(`
        UPDATE tenant_payments SET
          mpesa_checkout_request_id = $1,
          mpesa_transaction_id = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [checkoutRequestId, stkResponse.MerchantRequestID || null, payment.id]);

      logger.info(`STK Push sent for tenant ${tenantId}, type=${paymentType}, checkoutRequestId=${checkoutRequestId}`);
    } catch (stkErr) {
      logger.warn(`STK Push failed: ${stkErr.message}`);
      stkMessage = stkErr.message;
    }

    res.json({
      success: true,
      message: checkoutRequestId
        ? `M-Pesa prompt sent to ${phone}. Enter your PIN to pay KSh ${amount.toLocaleString()}.`
        : `Could not send M-Pesa prompt: ${stkMessage}. Please try again.`,
      data: {
        paymentId: payment.id,
        paymentNumber,
        checkoutRequestId,
        amount,
        paymentType
      }
    });
  } catch (error) {
    logger.error('Payment initiation error:', error);
    res.status(500).json({ success: false, message: 'Payment failed. Please try again.', error: error.message });
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
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = stkCallback;

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

      items.forEach((item) => {
        if (item.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = item.Value;
      });

      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      await query(`
        UPDATE tenant_payments SET
          status = 'completed',
          mpesa_receipt_number = $1,
          callback_data = $2,
          transaction_date = NOW(),
          updated_at = NOW()
        WHERE id = $3
      `, [mpesaReceiptNumber, JSON.stringify(req.body), payment.id]);

      // Activate tenant with full subscription
      await query(`
        UPDATE tenants SET
          status = 'active',
          subscription_starts_at = NOW(),
          subscription_ends_at = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [oneYearFromNow.toISOString(), payment.tenant_id]);

      logger.info(`Payment successful for tenant ${payment.tenant_id}, receipt: ${mpesaReceiptNumber}`);
    } else {
      await query(`
        UPDATE tenant_payments SET
          status = 'failed',
          error_message = $1,
          callback_data = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [ResultDesc, JSON.stringify(req.body), payment.id]);

      logger.warn(`Payment failed for tenant ${payment.tenant_id}: ${ResultDesc}`);
    }

    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    logger.error('M-Pesa callback error:', error);
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

// ============================================================
// POST /renew — Alias for /pay (for renewal from settings page)
// ============================================================
router.post('/renew', authenticate, async (req, res) => {
  req.url = '/pay';
  router.handle(req, res, () => {});
});

// ============================================================
// GET /check-activation/:tenantId — Poll tenant status (public)
// ============================================================
router.get('/check-activation/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenants = await query(
      `SELECT id, status, school_name, trial_ends_at, subscription_starts_at, subscription_ends_at
       FROM tenants WHERE id = $1`,
      [tenantId]
    );

    if (tenants.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const tenant = tenants[0];
    const now = new Date();
    const trialEndsAt = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null;
    const trialDaysLeft = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)))
      : 0;

    res.json({
      success: true,
      data: {
        tenantId:          tenant.id,
        schoolName:        tenant.school_name,
        status:            tenant.status,
        active:            tenant.status === 'active',
        isTrial:           tenant.status === 'trial',
        trialEndsAt:       tenant.trial_ends_at,
        trialDaysLeft,
        subscriptionStart: tenant.subscription_starts_at,
        subscriptionEnd:   tenant.subscription_ends_at
      }
    });
  } catch (error) {
    logger.error('Check activation error:', error);
    res.status(500).json({ success: false, message: 'Failed to check activation status', error: error.message });
  }
});

export default router;
