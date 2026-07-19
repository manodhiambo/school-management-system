import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import { isDemoTenant } from '../services/demoTenant.js';
import { initiateSTKPush, formatPhone, verifyWithSafaricom } from '../services/mpesaService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// POST /mpesa/callback must stay public (Safaricom webhook) — mounted before
// the router-wide authenticate below.
router.post('/mpesa/callback', async (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  try {
    const stkCallback = req.body?.Body?.stkCallback;
    if (!stkCallback) return;
    const { CheckoutRequestID } = stkCallback;
    if (!CheckoutRequestID) return;

    const rows = await query(
      `SELECT id, metadata FROM alumni_donations WHERE (metadata->>'mpesa_checkout_id') = $1`,
      [CheckoutRequestID]
    );
    if (!rows.length) {
      logger.warn('Alumni M-Pesa callback: no donation found for checkout', CheckoutRequestID);
      return;
    }
    const donation = rows[0];
    if (donation.metadata?.mpesa_ref) {
      logger.info(`Alumni M-Pesa callback: checkout ${CheckoutRequestID} already credited, skipping`);
      return;
    }

    const verified = await verifyWithSafaricom(CheckoutRequestID);
    if (String(verified.ResultCode) !== '0') {
      logger.warn(`Alumni donation STK not completed [${CheckoutRequestID}]: ${verified.ResultDesc || verified.errorMessage}`);
      return;
    }

    const mpesaRef = String(verified.MerchantRequestID || CheckoutRequestID);
    await query(
      `UPDATE alumni_donations
       SET status = 'completed', completed_at = NOW(),
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('mpesa_ref', $1::text)
       WHERE id = $2`,
      [mpesaRef, donation.id]
    );
    logger.info(`Alumni donation confirmed: ${mpesaRef} for donation ${donation.id}`);
  } catch (err) {
    logger.error('Alumni M-Pesa callback processing error:', err);
  }
});

router.use(authenticate);
router.use(requireModule('alumni'));

function officeOnly(req, res, next) {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  next();
}
function alumniOnly(req, res, next) {
  if (req.user.role !== 'alumni') {
    return res.status(403).json({ success: false, message: 'Alumni only' });
  }
  next();
}

async function getOwnProfile(req) {
  const rows = await query(`SELECT * FROM alumni_profiles WHERE user_id = $1 AND tenant_id = $2`, [req.user.id, req.user.tenant_id]);
  return rows[0] || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════

router.post('/convert/:studentId', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { graduation_year, current_occupation, employer, university, mark_graduated } = req.body;

    const studentRows = await query(
      `SELECT s.*, u.id AS user_id FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = $1 AND s.tenant_id = $2`,
      [req.params.studentId, tid]
    );
    if (!studentRows.length) return res.status(404).json({ success: false, message: 'Student not found' });
    const student = studentRows[0];

    const existing = await query(`SELECT id FROM alumni_profiles WHERE user_id = $1`, [student.user_id]);
    if (existing.length) return res.status(400).json({ success: false, message: 'This student is already an alumnus' });

    await query(`UPDATE users SET role = 'alumni' WHERE id = $1`, [student.user_id]);
    if (mark_graduated) {
      await query(`UPDATE students SET status = 'graduated' WHERE id = $1`, [student.id]);
    }

    const rows = await query(
      `INSERT INTO alumni_profiles (id, tenant_id, user_id, student_id, first_name, last_name, graduation_year, current_occupation, employer, university)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [uuidv4(), tid, student.user_id, student.id, student.first_name, student.last_name, graduation_year || null, current_occupation || null, employer || null, university || null]
    );
    res.json({ success: true, message: 'Student converted to alumni', data: rows[0] });
  } catch (err) {
    logger.error('Convert student to alumni error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/profiles', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { first_name, last_name, email, graduation_year, current_occupation, employer, university, business_details, phone } = req.body;
    if (!first_name || !last_name || !email) {
      return res.status(400).json({ success: false, message: 'first_name, last_name and email are required' });
    }
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.length) return res.status(400).json({ success: false, message: `Email "${email}" is already registered` });

    const userId = uuidv4();
    const hash = await bcrypt.hash('alumni123', 10);
    await query(
      `INSERT INTO users (id, email, password, role, first_name, last_name, tenant_id, is_active, is_verified)
       VALUES ($1,$2,$3,'alumni',$4,$5,$6,true,true)`,
      [userId, email, hash, first_name, last_name, tid]
    );
    const rows = await query(
      `INSERT INTO alumni_profiles (id, tenant_id, user_id, first_name, last_name, graduation_year, current_occupation, employer, university, business_details, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [uuidv4(), tid, userId, first_name, last_name, graduation_year || null, current_occupation || null, employer || null, university || null, business_details || null, phone || null]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create alumni profile error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/profiles', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(`SELECT * FROM alumni_profiles WHERE tenant_id = $1 ORDER BY created_at DESC`, [tid]);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('List alumni profiles error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/profiles/:id', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { graduation_year, current_occupation, employer, university, business_details, phone, bio, is_mentor, is_public } = req.body;
    const rows = await query(
      `UPDATE alumni_profiles SET
         graduation_year = COALESCE($1, graduation_year), current_occupation = COALESCE($2, current_occupation),
         employer = COALESCE($3, employer), university = COALESCE($4, university),
         business_details = COALESCE($5, business_details), phone = COALESCE($6, phone),
         bio = COALESCE($7, bio), is_mentor = COALESCE($8, is_mentor), is_public = COALESCE($9, is_public),
         updated_at = NOW()
       WHERE id = $10 AND tenant_id = $11 RETURNING *`,
      [graduation_year, current_occupation, employer, university, business_details, phone, bio, is_mentor, is_public, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update alumni profile error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/events', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(`SELECT * FROM alumni_events WHERE tenant_id = $1 ORDER BY event_date DESC NULLS LAST`, [tid]);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('List alumni events error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/events', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { name, event_type, event_date, venue, description } = req.body;
    if (!name || !event_type) return res.status(400).json({ success: false, message: 'name and event_type are required' });
    const rows = await query(
      `INSERT INTO alumni_events (id, tenant_id, name, event_type, event_date, venue, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [uuidv4(), tid, name, event_type, event_date || null, venue || null, description || null, req.user.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create alumni event error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/events/:id', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { name, event_type, event_date, venue, description } = req.body;
    const rows = await query(
      `UPDATE alumni_events SET
         name = COALESCE($1, name), event_type = COALESCE($2, event_type), event_date = COALESCE($3, event_date),
         venue = COALESCE($4, venue), description = COALESCE($5, description)
       WHERE id = $6 AND tenant_id = $7 RETURNING *`,
      [name, event_type, event_date, venue, description, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update alumni event error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/events/:id/registrations', officeOnly, async (req, res) => {
  try {
    const rows = await query(
      `SELECT r.*, p.first_name, p.last_name FROM alumni_event_registrations r
       JOIN alumni_profiles p ON p.id = r.alumni_id WHERE r.event_id = $1 ORDER BY r.registered_at`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('List alumni event registrations error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/events/:id/registrations/:alumniId/attended', officeOnly, async (req, res) => {
  try {
    const rows = await query(
      `UPDATE alumni_event_registrations SET attended = true WHERE event_id = $1 AND alumni_id = $2 RETURNING *`,
      [req.params.id, req.params.alumniId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Registration not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Mark alumni attendance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/donations', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status, donation_type } = req.query;
    let sql = `SELECT d.*, p.first_name, p.last_name FROM alumni_donations d
               JOIN alumni_profiles p ON p.id = d.alumni_id WHERE d.tenant_id = $1`;
    const params = [tid];
    if (status) { sql += ` AND d.status = $${params.length + 1}`; params.push(status); }
    if (donation_type) { sql += ` AND d.donation_type = $${params.length + 1}`; params.push(donation_type); }
    sql += ' ORDER BY d.created_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('List alumni donations error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/donations/:id/complete', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `UPDATE alumni_donations SET status = 'completed', completed_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Donation not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Complete alumni donation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/donations', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT donation_type, COUNT(*)::int AS count,
              COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS total_completed
       FROM alumni_donations WHERE tenant_id = $1 GROUP BY donation_type`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Alumni donations report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/directory-stats', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_mentor)::int AS mentors,
              COUNT(DISTINCT graduation_year)::int AS graduation_years
       FROM alumni_profiles WHERE tenant_id = $1`,
      [tid]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Alumni directory stats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ALUMNI SELF-SERVICE
// ═══════════════════════════════════════════════════════════════════════════

router.get('/me', alumniOnly, async (req, res) => {
  try {
    const profile = await getOwnProfile(req);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, data: profile });
  } catch (err) {
    logger.error('Get own alumni profile error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/me', alumniOnly, async (req, res) => {
  try {
    const profile = await getOwnProfile(req);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    const { current_occupation, employer, university, business_details, phone, bio, is_mentor, is_public } = req.body;
    const rows = await query(
      `UPDATE alumni_profiles SET
         current_occupation = COALESCE($1, current_occupation), employer = COALESCE($2, employer),
         university = COALESCE($3, university), business_details = COALESCE($4, business_details),
         phone = COALESCE($5, phone), bio = COALESCE($6, bio),
         is_mentor = COALESCE($7, is_mentor), is_public = COALESCE($8, is_public), updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [current_occupation, employer, university, business_details, phone, bio, is_mentor, is_public, profile.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update own alumni profile error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/directory', alumniOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { is_mentor, graduation_year } = req.query;
    let sql = `SELECT id, first_name, last_name, graduation_year, current_occupation, employer, university, bio, is_mentor
               FROM alumni_profiles WHERE tenant_id = $1 AND is_public = true`;
    const params = [tid];
    if (is_mentor === 'true') { sql += ` AND is_mentor = true`; }
    if (graduation_year) { sql += ` AND graduation_year = $${params.length + 1}`; params.push(graduation_year); }
    sql += ' ORDER BY graduation_year DESC NULLS LAST';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Alumni directory error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/events/:id/register', alumniOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const profile = await getOwnProfile(req);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    const rows = await query(
      `INSERT INTO alumni_event_registrations (id, tenant_id, event_id, alumni_id)
       VALUES ($1,$2,$3,$4) ON CONFLICT (event_id, alumni_id) DO NOTHING RETURNING *`,
      [uuidv4(), tid, req.params.id, profile.id]
    );
    if (!rows.length) return res.status(400).json({ success: false, message: 'Already registered for this event' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Register for alumni event error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(`SELECT * FROM alumni_job_postings WHERE tenant_id = $1 AND is_active = true ORDER BY created_at DESC`, [tid]);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('List alumni jobs error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/jobs', alumniOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { title, company, description, contact_info } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });
    const rows = await query(
      `INSERT INTO alumni_job_postings (id, tenant_id, posted_by, title, company, description, contact_info)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [uuidv4(), tid, req.user.id, title, company || null, description || null, contact_info || null]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create alumni job posting error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/jobs/:id/deactivate', officeOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `UPDATE alumni_job_postings SET is_active = false WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Job posting not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Deactivate alumni job posting error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Non-cash pledges (equipment/scholarship/building_project) are just a DB
// row with no real-world side effect, so they're safe on the demo tenant —
// only the financial/STK-push branch below needs blockDemoSideEffects, not
// the whole route.
router.post('/donations', alumniOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const profile = await getOwnProfile(req);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    const { donation_type, amount, description, phone } = req.body;
    if (!donation_type) return res.status(400).json({ success: false, message: 'donation_type is required' });

    const donationId = uuidv4();

    if (donation_type === 'financial' && amount) {
      if (isDemoTenant(tid)) {
        return res.json({ success: true, simulated: true, message: 'This is the live demo account — a donation payment is simulated here. No real message was sent and nothing was charged.' });
      }
      if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required for a financial donation' });
      let formattedPhone;
      try {
        formattedPhone = formatPhone(phone);
      } catch (phoneErr) {
        return res.status(400).json({ success: false, message: phoneErr.message });
      }

      await query(
        `INSERT INTO alumni_donations (id, tenant_id, alumni_id, donation_type, amount, description, status)
         VALUES ($1,$2,$3,'financial',$4,$5,'pledged')`,
        [donationId, tid, profile.id, amount, description || null]
      );

      let checkoutRequestId = null;
      let stkMessage = '';
      try {
        const stkResponse = await initiateSTKPush(formattedPhone, amount, 'AlumniDonation', 'Donation');
        checkoutRequestId = stkResponse.CheckoutRequestID;
        await query(
          `UPDATE alumni_donations SET metadata = jsonb_build_object('mpesa_checkout_id', $1::text, 'mpesa_amount', $2::text) WHERE id = $3`,
          [checkoutRequestId, String(amount), donationId]
        );
      } catch (stkErr) {
        logger.warn(`Alumni donation STK push failed: ${stkErr.message}`);
        stkMessage = stkErr.message;
      }

      return res.json({
        success: true,
        message: checkoutRequestId
          ? `M-Pesa prompt sent to ${phone}. Enter your PIN to donate KSh ${Number(amount).toLocaleString()}.`
          : `Could not send M-Pesa prompt: ${stkMessage}. Your pledge was recorded.`,
        data: { id: donationId, checkoutRequestId }
      });
    }

    const rows = await query(
      `INSERT INTO alumni_donations (id, tenant_id, alumni_id, donation_type, amount, description, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pledged') RETURNING *`,
      [donationId, tid, profile.id, donation_type, amount || null, description || null]
    );
    res.json({ success: true, message: 'Donation pledge recorded — thank you!', data: rows[0] });
  } catch (err) {
    logger.error('Create alumni donation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
