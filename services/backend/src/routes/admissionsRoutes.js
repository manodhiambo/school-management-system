import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { initiateSTKPush, formatPhone, verifyWithSafaricom } from '../services/mpesaService.js';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import { isDemoTenant } from '../services/demoTenant.js';
import { registrationLimiter } from '../middleware/rateLimiter.js';
import logger from '../utils/logger.js';

const router = express.Router();

function officeOnly(req, res, next) {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Admissions office only' });
  }
  next();
}

async function generateApplicationNumber(tenantId) {
  const year = new Date().getFullYear();
  const rows = await query(
    `SELECT application_number FROM admission_applications
     WHERE tenant_id = $1 AND application_number LIKE $2
     ORDER BY application_number DESC LIMIT 1`,
    [tenantId, `ADM-${year}-%`]
  );
  const next = rows.length
    ? parseInt(rows[0].application_number.split('-')[2], 10) + 1
    : 1;
  return `ADM-${year}-${String(next).padStart(5, '0')}`;
}

async function getTenantByCode(schoolCode) {
  const rows = await query(
    `SELECT id, school_name, school_code, status FROM tenants WHERE school_code = $1 OR subdomain = $1`,
    [schoolCode]
  );
  return rows[0] || null;
}

const APPLICATION_FIELDS = `
  id, tenant_id, application_number, first_name, last_name, date_of_birth, gender,
  education_level, previous_school, guardian_name, guardian_phone, guardian_email,
  guardian_relationship, documents, status, document_verified_at, interview_date,
  interview_time, interview_venue, interview_notes, decision, decision_notes,
  decided_at, enrolled_student_id, created_at, updated_at
`;

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC — no auth. Reachable from a school's /apply/:schoolCode page.
// ═══════════════════════════════════════════════════════════════════════════

// GET /public/:schoolCode — tenant name + admission settings for the form
router.get('/public/:schoolCode', async (req, res) => {
  try {
    const tenant = await getTenantByCode(req.params.schoolCode);
    if (!tenant || tenant.status !== 'active') {
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    const settingsRows = await query(
      `SELECT application_fee_amount, is_open, academic_year FROM admission_settings WHERE tenant_id = $1`,
      [tenant.id]
    );
    const settings = settingsRows[0] || { application_fee_amount: 0, is_open: true, academic_year: null };
    res.json({
      success: true,
      data: { school_name: tenant.school_name, school_code: tenant.school_code, ...settings }
    });
  } catch (err) {
    logger.error('Admissions public info error:', err);
    res.status(500).json({ success: false, message: 'Could not load admission info' });
  }
});

// POST /public/:schoolCode/apply — submit a new application
router.post('/public/:schoolCode/apply', registrationLimiter, async (req, res) => {
  try {
    const tenant = await getTenantByCode(req.params.schoolCode);
    if (!tenant || tenant.status !== 'active') {
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    const settingsRows = await query(`SELECT is_open FROM admission_settings WHERE tenant_id = $1`, [tenant.id]);
    if (settingsRows.length && !settingsRows[0].is_open) {
      return res.status(403).json({ success: false, message: 'Admissions are currently closed for this school' });
    }

    const {
      first_name, last_name, date_of_birth, gender, education_level, previous_school,
      guardian_name, guardian_phone, guardian_email, guardian_relationship, documents
    } = req.body;

    if (!first_name || !last_name || !guardian_name || !guardian_phone) {
      return res.status(400).json({ success: false, message: 'first_name, last_name, guardian_name and guardian_phone are required' });
    }

    const applicationNumber = await generateApplicationNumber(tenant.id);
    const rows = await query(
      `INSERT INTO admission_applications (
         id, tenant_id, application_number, first_name, last_name, date_of_birth, gender,
         education_level, previous_school, guardian_name, guardian_phone, guardian_email,
         guardian_relationship, documents, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'submitted')
       RETURNING id, application_number, status`,
      [
        uuidv4(), tenant.id, applicationNumber, first_name, last_name, date_of_birth || null,
        gender || null, education_level || null, previous_school || null, guardian_name,
        guardian_phone, guardian_email || null, guardian_relationship || null,
        JSON.stringify(Array.isArray(documents) ? documents : [])
      ]
    );

    res.json({ success: true, message: 'Application submitted successfully', data: rows[0] });
  } catch (err) {
    logger.error('Admissions apply error:', err);
    res.status(500).json({ success: false, message: 'Could not submit application' });
  }
});

// GET /public/:schoolCode/track/:applicationNumber?phone=...|email=...
router.get('/public/:schoolCode/track/:applicationNumber', async (req, res) => {
  try {
    const tenant = await getTenantByCode(req.params.schoolCode);
    if (!tenant) return res.status(404).json({ success: false, message: 'School not found' });

    const { phone, email } = req.query;
    if (!phone && !email) {
      return res.status(400).json({ success: false, message: 'Provide the phone or email used on the application' });
    }

    const rows = await query(
      `SELECT ${APPLICATION_FIELDS} FROM admission_applications
       WHERE tenant_id = $1 AND application_number = $2
         AND (guardian_phone = $3 OR guardian_email = $4)`,
      [tenant.id, req.params.applicationNumber, phone || null, email || null]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'No matching application found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Admissions track error:', err);
    res.status(500).json({ success: false, message: 'Could not look up application' });
  }
});

// POST /public/:schoolCode/applications/:applicationNumber/pay-fee
router.post('/public/:schoolCode/applications/:applicationNumber/pay-fee', registrationLimiter, async (req, res) => {
  try {
    const tenant = await getTenantByCode(req.params.schoolCode);
    if (!tenant) return res.status(404).json({ success: false, message: 'School not found' });

    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });

    const appRows = await query(
      `SELECT a.id, a.status FROM admission_applications a WHERE a.tenant_id = $1 AND a.application_number = $2`,
      [tenant.id, req.params.applicationNumber]
    );
    if (!appRows.length) return res.status(404).json({ success: false, message: 'Application not found' });
    const application = appRows[0];

    if (isDemoTenant(tenant.id)) {
      return res.json({ success: true, simulated: true, message: 'Application fee payment is simulated on the live demo.' });
    }

    const settingsRows = await query(`SELECT application_fee_amount FROM admission_settings WHERE tenant_id = $1`, [tenant.id]);
    const amount = parseFloat(settingsRows[0]?.application_fee_amount || 0);
    if (!amount) {
      return res.status(400).json({ success: false, message: 'No application fee is configured for this school' });
    }

    let formattedPhone;
    try {
      formattedPhone = formatPhone(phone);
    } catch (phoneErr) {
      return res.status(400).json({ success: false, message: phoneErr.message });
    }

    let checkoutRequestId = null;
    let stkMessage = '';
    try {
      const stkResponse = await initiateSTKPush(formattedPhone, amount, req.params.applicationNumber, 'AdmissionFee');
      checkoutRequestId = stkResponse.CheckoutRequestID;
      await query(
        `UPDATE admission_applications SET status = 'fee_pending',
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('mpesa_checkout_id', $1::text, 'mpesa_amount', $2::text),
           updated_at = NOW()
         WHERE id = $3`,
        [checkoutRequestId, String(amount), application.id]
      );
    } catch (stkErr) {
      logger.warn(`Admission fee STK push failed: ${stkErr.message}`);
      stkMessage = stkErr.message;
    }

    res.json({
      success: true,
      message: checkoutRequestId
        ? `M-Pesa prompt sent to ${phone}. Enter your PIN to pay KSh ${amount.toLocaleString()}.`
        : `Could not send M-Pesa prompt: ${stkMessage}. Please try again or pay at the school office.`,
      data: { checkoutRequestId, amount }
    });
  } catch (err) {
    logger.error('Admission fee payment error:', err);
    res.status(500).json({ success: false, message: 'Could not initiate payment' });
  }
});

// POST /mpesa/callback — Safaricom STK push result (public webhook)
router.post('/mpesa/callback', async (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  try {
    const stkCallback = req.body?.Body?.stkCallback;
    if (!stkCallback) return;
    const { CheckoutRequestID } = stkCallback;
    if (!CheckoutRequestID) return;

    const rows = await query(
      `SELECT id, metadata FROM admission_applications WHERE (metadata->>'mpesa_checkout_id') = $1`,
      [CheckoutRequestID]
    );
    if (!rows.length) {
      logger.warn('Admission M-Pesa callback: no application found for checkout', CheckoutRequestID);
      return;
    }
    const application = rows[0];

    if (application.metadata?.mpesa_ref) {
      logger.info(`Admission M-Pesa callback: checkout ${CheckoutRequestID} already credited, skipping`);
      return;
    }

    const verified = await verifyWithSafaricom(CheckoutRequestID);
    if (String(verified.ResultCode) !== '0') {
      logger.warn(`Admission STK not completed [${CheckoutRequestID}]: ${verified.ResultDesc || verified.errorMessage}`);
      return;
    }

    const mpesaRef = String(verified.MerchantRequestID || CheckoutRequestID);
    await query(
      `UPDATE admission_applications
       SET status = 'fee_paid',
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('mpesa_ref', $1::text),
           updated_at = NOW()
       WHERE id = $2`,
      [mpesaRef, application.id]
    );
    logger.info(`Admission fee confirmed: ${mpesaRef} for application ${application.id}`);
  } catch (err) {
    logger.error('Admission M-Pesa callback processing error:', err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN — authenticated, admissions module + admin role required
// ═══════════════════════════════════════════════════════════════════════════

router.use('/settings', authenticate, requireModule('admissions'));
router.use('/applications', authenticate, requireModule('admissions'));
router.use('/reports', authenticate, requireModule('admissions'));

router.get('/settings', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(`SELECT * FROM admission_settings WHERE tenant_id = $1`, [tid]);
    res.json({ success: true, data: rows[0] || { tenant_id: tid, application_fee_amount: 0, is_open: true, academic_year: null } });
  } catch (err) {
    logger.error('Get admission settings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/settings', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { application_fee_amount, is_open, academic_year } = req.body;
    const rows = await query(
      `INSERT INTO admission_settings (tenant_id, application_fee_amount, is_open, academic_year, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET
         application_fee_amount = EXCLUDED.application_fee_amount,
         is_open = EXCLUDED.is_open,
         academic_year = EXCLUDED.academic_year,
         updated_at = NOW()
       RETURNING *`,
      [tid, application_fee_amount ?? 0, is_open ?? true, academic_year || null]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update admission settings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/applications', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status } = req.query;
    let sql = `SELECT ${APPLICATION_FIELDS} FROM admission_applications WHERE tenant_id = $1`;
    const params = [tid];
    if (status) { sql += ` AND status = $${params.length + 1}`; params.push(status); }
    sql += ' ORDER BY created_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get admission applications error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/applications/:id', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT ${APPLICATION_FIELDS} FROM admission_applications WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Get admission application error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/applications/:id/verify-documents', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `UPDATE admission_applications
       SET status = 'document_review', document_verified_at = NOW(), document_verified_by = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [req.user.id, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Verify admission documents error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/applications/:id/schedule-interview', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { interview_date, interview_time, interview_venue, interviewer_id } = req.body;
    if (!interview_date) return res.status(400).json({ success: false, message: 'interview_date is required' });
    const rows = await query(
      `UPDATE admission_applications
       SET status = 'interview_scheduled', interview_date = $1, interview_time = $2,
           interview_venue = $3, interviewer_id = $4, updated_at = NOW()
       WHERE id = $5 AND tenant_id = $6 RETURNING *`,
      [interview_date, interview_time || null, interview_venue || null, interviewer_id || null, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Schedule admission interview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/applications/:id/record-interview', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { interview_notes } = req.body;
    const rows = await query(
      `UPDATE admission_applications
       SET status = 'interviewed', interview_notes = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [interview_notes || null, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Record admission interview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/applications/:id/decision', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { decision, decision_notes } = req.body;
    if (!['offered', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: "decision must be 'offered' or 'rejected'" });
    }
    const rows = await query(
      `UPDATE admission_applications
       SET status = $1, decision = $1, decision_notes = $2, decided_by = $3, decided_at = NOW(), updated_at = NOW()
       WHERE id = $4 AND tenant_id = $5 RETURNING *`,
      [decision, decision_notes || null, req.user.id, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Record admission decision error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /applications/:id/enroll — creates the real users+students rows,
// following the same parent-lookup/create + student-INSERT structure as
// studentRoutes.js's POST / handler (kept inline rather than shared, so that
// working handler stays untouched).
router.put('/applications/:id/enroll', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { class_id, parent_id, password } = req.body;
    if (!class_id) return res.status(400).json({ success: false, message: 'class_id is required to enroll' });

    const appRows = await query(
      `SELECT * FROM admission_applications WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    if (!appRows.length) return res.status(404).json({ success: false, message: 'Application not found' });
    const application = appRows[0];
    if (application.status === 'enrolled') {
      return res.status(400).json({ success: false, message: 'Application is already enrolled' });
    }

    let resolvedParentId = parent_id || null;
    if (!resolvedParentId) {
      const existingParent = await query(
        `SELECT id FROM parents WHERE tenant_id = $1 AND phone_primary = $2`,
        [tid, application.guardian_phone]
      );

      if (existingParent.length) {
        resolvedParentId = existingParent[0].id;
      } else {
        const [gFirst, ...gLastParts] = application.guardian_name.trim().split(' ');
        const gLast = gLastParts.join(' ') || gFirst;
        let parentUserId = null;
        if (application.guardian_email) {
          const existingPU = await query('SELECT id FROM users WHERE email = $1', [application.guardian_email]);
          if (!existingPU.length) {
            parentUserId = uuidv4();
            const parentHash = await bcrypt.hash('parent123', 10);
            await query(
              `INSERT INTO users (id, email, password, role, first_name, last_name, tenant_id, is_active, is_verified)
               VALUES ($1,$2,$3,'parent',$4,$5,$6,true,true)`,
              [parentUserId, application.guardian_email, parentHash, gFirst, gLast, tid]
            );
          }
        }
        resolvedParentId = uuidv4();
        await query(
          `INSERT INTO parents (id, user_id, first_name, last_name, relationship, phone_primary, tenant_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [resolvedParentId, parentUserId, gFirst, gLast, application.guardian_relationship || 'guardian', application.guardian_phone, tid]
        );
      }
    }

    const year = new Date().getFullYear();
    const seqRows = await query(
      `SELECT MAX(CAST(SUBSTRING(admission_number FROM 8) AS INTEGER)) AS max_seq
       FROM students WHERE admission_number ~ $1 AND tenant_id = $2`,
      [`^STD${year}\\d+$`, tid]
    );
    const seq = (seqRows[0]?.max_seq || 0) + 1;
    const admissionNumber = `STD${year}${String(seq).padStart(4, '0')}`;

    const studentUserId = uuidv4();
    const studentEmail = `${application.first_name}.${application.last_name}.${admissionNumber}@student.local`.toLowerCase().replace(/\s+/g, '');
    const studentHash = await bcrypt.hash(password || 'student123', 10);
    await query(
      `INSERT INTO users (id, email, password, role, first_name, last_name, tenant_id, is_active, is_verified)
       VALUES ($1,$2,$3,'student',$4,$5,$6,true,true)`,
      [studentUserId, studentEmail, studentHash, application.first_name, application.last_name, tid]
    );

    const studentId = uuidv4();
    await query(
      `INSERT INTO students (
         id, user_id, admission_number, first_name, last_name, date_of_birth, gender,
         class_id, parent_id, admission_date, previous_school, education_level,
         tenant_id, status, is_new_admission
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_DATE,$10,$11,$12,'active',true)`,
      [
        studentId, studentUserId, admissionNumber, application.first_name, application.last_name,
        application.date_of_birth, application.gender, class_id, resolvedParentId,
        application.previous_school, application.education_level, tid
      ]
    );

    const updated = await query(
      `UPDATE admission_applications SET status = 'enrolled', enrolled_student_id = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [studentId, application.id]
    );

    res.json({ success: true, message: 'Application enrolled', data: { application: updated[0], student_id: studentId, admission_number: admissionNumber } });
  } catch (err) {
    logger.error('Enroll admission application error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/funnel', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT status, COUNT(*)::int AS count FROM admission_applications WHERE tenant_id = $1 GROUP BY status`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Admission funnel report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
