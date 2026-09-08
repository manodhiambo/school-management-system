import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { initiateSTKPush, formatPhone } from '../services/mpesaService.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { registrationLimiter } from '../middleware/rateLimiter.js';
import { blockDemoSideEffects } from '../middleware/demoGuard.js';
import { sendEmail } from '../services/emailService.js';
import { sendSMSViaProvider, normalisePhone } from './smsRoutes.js';
import logger from '../utils/logger.js';
import { seedTenantData } from '../utils/seedTenantData.js';

const router = express.Router();

const DEPOSIT_AMOUNT = 50000; // KES 50,000 — paid at registration to start review
const BALANCE_AMOUNT = 50000; // KES 50,000 — remaining balance of the 100,000 registration fee
const BALANCE_DUE_DAYS = 5;   // must be cleared within this many days of the deposit
const RENEWAL_FEE = 40000;    // KES 40,000 — annual renewal after the first year

const NOTIFY_EMAIL = 'info@helvino.org';
const NOTIFY_PHONE = normalisePhone('0110421320');

async function notifyCompanyOfPendingReview(tenant) {
  try {
    await sendEmail(NOTIFY_EMAIL, 'tenantPendingReview', {
      schoolName: tenant.school_name,
      tenantId: tenant.id,
      adminEmail: tenant.admin_email,
      depositAmount: DEPOSIT_AMOUNT,
    });
  } catch (err) {
    logger.error('Failed to email pending-review notice:', err.message);
  }
  try {
    await sendSMSViaProvider(
      NOTIFY_PHONE,
      `SkulManager: "${tenant.school_name}" paid the KSh ${DEPOSIT_AMOUNT.toLocaleString()} deposit and is awaiting registration review/approval.`
    );
  } catch (err) {
    logger.error('Failed to SMS pending-review notice:', err.message);
  }
}

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
// POST /register — Register a new school
// No account access is granted until the deposit is paid AND a
// superadmin approves the registration (see /deposit, /mpesa/callback,
// and superadminRoutes.js POST /tenants/:id/approve-registration).
// ============================================================
router.post('/register', registrationLimiter, async (req, res) => {
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
    if (!schoolName)          missing.push('schoolName');
    if (!schoolEmail)         missing.push('schoolEmail');
    if (!schoolPhone)         missing.push('schoolPhone');
    if (!registrationNumber)  missing.push('registrationNumber');
    if (!adminEmail)          missing.push('adminEmail');
    if (!adminPassword)       missing.push('adminPassword');

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }

    if (adminPassword.length < 8 || !/[A-Za-z]/.test(adminPassword) || !/[0-9]/.test(adminPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Admin password must be at least 8 characters and contain letters and numbers'
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

    // Create tenant record — pending_deposit until the deposit is paid
    const tenantResult = await query(`
      INSERT INTO tenants (
        school_name, email, phone, address, county, country,
        admin_email, school_code, subdomain, schema_name,
        registration_number, status, deposit_amount, balance_amount, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'Kenya', $6, $7, $8, $9, $10, 'pending_deposit', $11, $12, NOW())
      RETURNING *
    `, [
      schoolName, schoolEmail, formattedPhone, schoolAddress || null, county || null,
      adminEmail, school_code, subdomain, schema_name, registrationNumber,
      DEPOSIT_AMOUNT, BALANCE_AMOUNT
    ]);

    const tenant = tenantResult[0];

    // Create the admin user now, but inactive — it stays inactive until a
    // superadmin approves the registration after the deposit is confirmed.
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const newUserId = uuidv4();

    await query(`
      INSERT INTO users (
        id, email, password, role, tenant_id,
        is_active, is_verified, created_at, updated_at
      ) VALUES ($1, $2, $3, 'admin', $4, false, true, NOW(), NOW())
    `, [newUserId, adminEmail, hashedPassword, tenant.id]);

    // Link admin user back to tenant
    await query(
      'UPDATE tenants SET admin_user_id = $1, updated_at = NOW() WHERE id = $2',
      [newUserId, tenant.id]
    );

    // Seed all default data for the new tenant (accounts, settings, academic year, financial year)
    try {
      await seedTenantData(tenant.id, {
        schoolName:  tenant.school_name,
        email:       tenant.email,
        phone:       tenant.phone,
        schoolCode:  tenant.school_code
      });
    } catch (seedErr) {
      logger.warn(`Tenant seed failed for ${tenant.id}: ${seedErr.message}`);
    }

    logger.info(`School registered, awaiting deposit: tenant=${tenant.id}, admin=${adminEmail}`);

    res.status(201).json({
      success: true,
      message: `Registration received. Pay a KSh ${DEPOSIT_AMOUNT.toLocaleString()} deposit to submit your school for activation review.`,
      data: {
        tenantId:      tenant.id,
        schoolName:    tenant.school_name,
        adminEmail,
        status:        'pending_deposit',
        depositAmount: DEPOSIT_AMOUNT
      }
    });
  } catch (error) {
    logger.error('School registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.', error: error.message });
  }
});

// ============================================================
// POST /deposit — Initiate the M-Pesa deposit payment (public, keyed by
// tenantId — the admin account isn't active yet so there's no JWT to use).
// ============================================================
router.post('/deposit', registrationLimiter, async (req, res) => {
  try {
    const { tenantId, phone } = req.body;

    if (!tenantId || !phone) {
      return res.status(400).json({ success: false, message: 'tenantId and phone are required' });
    }

    const tenants = await query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (tenants.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    const tenant = tenants[0];

    if (tenant.status !== 'pending_deposit') {
      return res.status(409).json({
        success: false,
        message: tenant.deposit_paid
          ? 'The deposit has already been paid for this school.'
          : `This school's registration is no longer awaiting a deposit (current status: ${tenant.status}).`
      });
    }

    let formattedPhone;
    try {
      formattedPhone = formatPhone(phone);
    } catch (phoneErr) {
      return res.status(400).json({ success: false, message: phoneErr.message });
    }

    const amount = Number(tenant.deposit_amount) || DEPOSIT_AMOUNT;
    const paymentNumber = generatePaymentNumber();
    const paymentResult = await query(`
      INSERT INTO tenant_payments (
        tenant_id, payment_number, amount, currency, payment_method,
        payment_provider, mpesa_phone_number, status, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, 'KES', 'mpesa', 'safaricom', $4, 'pending', 'deposit', NOW(), NOW())
      RETURNING *
    `, [tenantId, paymentNumber, amount, formattedPhone]);

    const payment = paymentResult[0];
    let checkoutRequestId = null;
    let stkMessage = '';

    try {
      const stkResponse = await initiateSTKPush(
        formattedPhone,
        amount,
        `DEPOSIT-${tenant.school_code}`,
        'SchoolRegistrationDeposit'
      );

      checkoutRequestId = stkResponse.CheckoutRequestID;

      await query(`
        UPDATE tenant_payments SET
          mpesa_checkout_request_id = $1,
          mpesa_transaction_id = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [checkoutRequestId, stkResponse.MerchantRequestID || null, payment.id]);

      logger.info(`Deposit STK Push sent for tenant ${tenantId}, checkoutRequestId=${checkoutRequestId}`);
    } catch (stkErr) {
      logger.warn(`Deposit STK Push failed: ${stkErr.message}`);
      stkMessage = stkErr.message;
    }

    res.json({
      success: true,
      message: checkoutRequestId
        ? `M-Pesa prompt sent to ${phone}. Enter your PIN to pay the KSh ${amount.toLocaleString()} deposit.`
        : `Could not send M-Pesa prompt: ${stkMessage}. Please try again.`,
      data: { paymentId: payment.id, paymentNumber, checkoutRequestId, amount }
    });
  } catch (error) {
    logger.error('Deposit initiation error:', error);
    res.status(500).json({ success: false, message: 'Deposit payment failed. Please try again.', error: error.message });
  }
});

// ============================================================
// POST /pay — Initiate M-Pesa payment for the remaining balance
// (after the deposit + approval) or the annual renewal fee.
// ============================================================
router.post('/pay', registrationLimiter, authenticate, blockDemoSideEffects('an M-Pesa payment'), async (req, res) => {
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

    if (!tenant.deposit_paid) {
      return res.status(400).json({
        success: false,
        message: 'Please pay the registration deposit first via the registration page.'
      });
    }

    // Determine amount: remaining balance (first year) or annual renewal
    const isBalanceDue = !tenant.balance_paid;
    const amount = isBalanceDue ? (Number(tenant.balance_amount) || BALANCE_AMOUNT) : RENEWAL_FEE;
    const paymentType = isBalanceDue ? 'balance' : 'renewal';

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
        paymentType === 'balance' ? 'RegistrationBalance' : 'Renewal'
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
// Handles deposit, balance, and renewal payments based on tenant_payments.notes
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

      await query(`
        UPDATE tenant_payments SET
          status = 'completed',
          mpesa_receipt_number = $1,
          callback_data = $2,
          transaction_date = NOW(),
          updated_at = NOW()
        WHERE id = $3
      `, [mpesaReceiptNumber, JSON.stringify(req.body), payment.id]);

      if (payment.notes === 'deposit') {
        const tenantRows = await query(`
          UPDATE tenants SET
            deposit_paid = true,
            deposit_paid_at = NOW(),
            balance_due_at = NOW() + INTERVAL '${BALANCE_DUE_DAYS} days',
            status = 'pending_review',
            review_status = 'pending',
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `, [payment.tenant_id]);

        logger.info(`Deposit paid for tenant ${payment.tenant_id}, receipt: ${mpesaReceiptNumber}, now pending review`);
        if (tenantRows[0]) {
          notifyCompanyOfPendingReview(tenantRows[0]).catch(() => {});
        }
      } else if (payment.notes === 'balance') {
        await query(`
          UPDATE tenants SET
            balance_paid = true,
            balance_paid_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
        `, [payment.tenant_id]);

        logger.info(`Balance paid for tenant ${payment.tenant_id}, receipt: ${mpesaReceiptNumber}`);
      } else {
        // renewal
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        await query(`
          UPDATE tenants SET
            status = 'active',
            subscription_ends_at = $1,
            suspended_at = NULL,
            updated_at = NOW()
          WHERE id = $2
        `, [oneYearFromNow.toISOString(), payment.tenant_id]);

        logger.info(`Renewal paid for tenant ${payment.tenant_id}, receipt: ${mpesaReceiptNumber}`);
      }
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
      `SELECT id, status, school_name, deposit_paid, deposit_amount, deposit_paid_at,
              balance_paid, balance_amount, balance_due_at, review_status, rejection_reason,
              subscription_starts_at, subscription_ends_at
       FROM tenants WHERE id = $1`,
      [tenantId]
    );

    if (tenants.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const tenant = tenants[0];
    const now = new Date();
    const balanceDueAt = tenant.balance_due_at ? new Date(tenant.balance_due_at) : null;
    const balanceDaysLeft = balanceDueAt
      ? Math.max(0, Math.ceil((balanceDueAt - now) / (1000 * 60 * 60 * 24)))
      : null;

    res.json({
      success: true,
      data: {
        tenantId:          tenant.id,
        schoolName:        tenant.school_name,
        status:            tenant.status,
        active:            tenant.status === 'active',
        depositPaid:       tenant.deposit_paid,
        depositAmount:     tenant.deposit_amount,
        depositPaidAt:     tenant.deposit_paid_at,
        reviewStatus:      tenant.review_status,
        rejectionReason:   tenant.rejection_reason,
        balancePaid:       tenant.balance_paid,
        balanceAmount:     tenant.balance_amount,
        balanceDueAt:      tenant.balance_due_at,
        balanceDaysLeft,
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
