import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import { sendSMSViaProvider, sendBulkSMSViaProvider } from './smsRoutes.js';
import { sendWhatsAppToParent } from './whatsappRoutes.js';
import { sendEmail } from '../services/emailService.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);
router.use(requireModule('crm'));

function officeOnly(req, res, next) {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'CRM office only' });
  }
  next();
}
router.use(officeOnly);

async function generateLeadNumber(tenantId) {
  const year = new Date().getFullYear();
  const rows = await query(
    `SELECT lead_number FROM crm_leads WHERE tenant_id = $1 AND lead_number LIKE $2
     ORDER BY lead_number DESC LIMIT 1`,
    [tenantId, `LEAD-${year}-%`]
  );
  const next = rows.length ? parseInt(rows[0].lead_number.split('-')[2], 10) + 1 : 1;
  return `LEAD-${year}-${String(next).padStart(5, '0')}`;
}

// ─── LEADS ──────────────────────────────────────────────────────────────────

router.get('/leads', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status, source } = req.query;
    let sql = `SELECT l.*, u.first_name || ' ' || u.last_name AS assigned_to_name
               FROM crm_leads l LEFT JOIN users u ON u.id = l.assigned_to
               WHERE l.tenant_id = $1`;
    const params = [tid];
    if (status) { sql += ` AND l.status = $${params.length + 1}`; params.push(status); }
    if (source) { sql += ` AND l.source = $${params.length + 1}`; params.push(source); }
    sql += ' ORDER BY l.created_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get CRM leads error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/leads/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const leadRows = await query(`SELECT * FROM crm_leads WHERE id = $1 AND tenant_id = $2`, [req.params.id, tid]);
    if (!leadRows.length) return res.status(404).json({ success: false, message: 'Lead not found' });
    const activities = await query(
      `SELECT a.*, u.first_name || ' ' || u.last_name AS performed_by_name
       FROM crm_lead_activities a LEFT JOIN users u ON u.id = a.performed_by
       WHERE a.lead_id = $1 ORDER BY a.created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: { ...leadRows[0], activities } });
  } catch (err) {
    logger.error('Get CRM lead error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/leads', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { source, applicant_name, education_level_interested, guardian_name, guardian_phone, guardian_email, notes, assigned_to } = req.body;
    if (!source || !applicant_name || !guardian_name || !guardian_phone) {
      return res.status(400).json({ success: false, message: 'source, applicant_name, guardian_name and guardian_phone are required' });
    }
    const leadNumber = await generateLeadNumber(tid);
    const rows = await query(
      `INSERT INTO crm_leads (
         id, tenant_id, lead_number, source, applicant_name, education_level_interested,
         guardian_name, guardian_phone, guardian_email, notes, assigned_to, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        uuidv4(), tid, leadNumber, source, applicant_name, education_level_interested || null,
        guardian_name, guardian_phone, guardian_email || null, notes || null, assigned_to || null, req.user.id
      ]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create CRM lead error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/leads/:id', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status, assigned_to, notes, next_follow_up_date, education_level_interested } = req.body;
    const rows = await query(
      `UPDATE crm_leads SET
         status = COALESCE($1, status), assigned_to = COALESCE($2, assigned_to),
         notes = COALESCE($3, notes), next_follow_up_date = COALESCE($4, next_follow_up_date),
         education_level_interested = COALESCE($5, education_level_interested), updated_at = NOW()
       WHERE id = $6 AND tenant_id = $7 RETURNING *`,
      [status || null, assigned_to || null, notes || null, next_follow_up_date || null, education_level_interested || null, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update CRM lead error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/leads/:id/follow-up', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { activity_type, notes, next_follow_up_date } = req.body;
    if (!activity_type) return res.status(400).json({ success: false, message: 'activity_type is required' });

    const leadRows = await query(`SELECT id FROM crm_leads WHERE id = $1 AND tenant_id = $2`, [req.params.id, tid]);
    if (!leadRows.length) return res.status(404).json({ success: false, message: 'Lead not found' });

    await query(
      `INSERT INTO crm_lead_activities (id, tenant_id, lead_id, activity_type, notes, performed_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [uuidv4(), tid, req.params.id, activity_type, notes || null, req.user.id]
    );

    const rows = await query(
      `UPDATE crm_leads SET
         status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END,
         next_follow_up_date = COALESCE($1, next_follow_up_date),
         updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [next_follow_up_date || null, req.params.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Log CRM follow-up error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/leads/:id/lost', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { lost_reason } = req.body;
    const rows = await query(
      `UPDATE crm_leads SET status = 'lost', lost_reason = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [lost_reason || null, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Mark CRM lead lost error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /leads/:id/convert — creates a real admission_applications row from
// the lead's captured data, mirroring the shape admissionsRoutes.js's own
// public /apply endpoint inserts (kept inline rather than shared, same
// reasoning as that file's own enroll handler: don't couple route files).
router.post('/leads/:id/convert', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const leadRows = await query(`SELECT * FROM crm_leads WHERE id = $1 AND tenant_id = $2`, [req.params.id, tid]);
    if (!leadRows.length) return res.status(404).json({ success: false, message: 'Lead not found' });
    const lead = leadRows[0];
    if (lead.status === 'converted') {
      return res.status(400).json({ success: false, message: 'Lead is already converted' });
    }

    const [firstName, ...lastParts] = lead.applicant_name.trim().split(' ');
    const lastName = lastParts.join(' ') || firstName;

    const year = new Date().getFullYear();
    const appNumRows = await query(
      `SELECT application_number FROM admission_applications WHERE tenant_id = $1 AND application_number LIKE $2
       ORDER BY application_number DESC LIMIT 1`,
      [tid, `ADM-${year}-%`]
    );
    const nextAppSeq = appNumRows.length ? parseInt(appNumRows[0].application_number.split('-')[2], 10) + 1 : 1;
    const applicationNumber = `ADM-${year}-${String(nextAppSeq).padStart(5, '0')}`;

    const appRows = await query(
      `INSERT INTO admission_applications (
         id, tenant_id, application_number, first_name, last_name, education_level,
         guardian_name, guardian_phone, guardian_email, status, lead_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'submitted',$10)
       RETURNING id, application_number, status`,
      [
        uuidv4(), tid, applicationNumber, firstName, lastName, lead.education_level_interested,
        lead.guardian_name, lead.guardian_phone, lead.guardian_email, req.params.id
      ]
    );

    const updatedLead = await query(
      `UPDATE crm_leads SET status = 'converted', converted_application_id = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [appRows[0].id, req.params.id]
    );

    res.json({ success: true, message: 'Lead converted to an application', data: { lead: updatedLead[0], application: appRows[0] } });
  } catch (err) {
    logger.error('Convert CRM lead error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CAMPAIGNS ──────────────────────────────────────────────────────────────

router.get('/campaigns', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(`SELECT * FROM crm_campaigns WHERE tenant_id = $1 ORDER BY created_at DESC`, [tid]);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get CRM campaigns error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/campaigns', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { name, type, message, event_date } = req.body;
    if (!name || !type) return res.status(400).json({ success: false, message: 'name and type are required' });
    const rows = await query(
      `INSERT INTO crm_campaigns (id, tenant_id, name, type, message, event_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [uuidv4(), tid, name, type, message || null, event_date || null, req.user.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create CRM campaign error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/campaigns/:id/send', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const campaignRows = await query(`SELECT * FROM crm_campaigns WHERE id = $1 AND tenant_id = $2`, [req.params.id, tid]);
    if (!campaignRows.length) return res.status(404).json({ success: false, message: 'Campaign not found' });
    const campaign = campaignRows[0];
    if (!['sms', 'email', 'whatsapp'].includes(campaign.type)) {
      return res.status(400).json({ success: false, message: `Campaigns of type '${campaign.type}' are informational only and have nothing to send` });
    }
    if (!campaign.message) return res.status(400).json({ success: false, message: 'Campaign has no message to send' });

    const leads = await query(
      `SELECT applicant_name, guardian_name, guardian_phone, guardian_email
       FROM crm_leads WHERE tenant_id = $1 AND status != 'lost'`,
      [tid]
    );

    let sentCount = 0;
    if (campaign.type === 'sms') {
      const recipients = leads.filter(l => l.guardian_phone).map(l => ({ phone: l.guardian_phone }));
      if (recipients.length === 1) {
        const r = await sendSMSViaProvider(recipients[0].phone, campaign.message);
        sentCount = r?.success !== false ? 1 : 0;
      } else if (recipients.length > 1) {
        const results = await sendBulkSMSViaProvider(recipients, campaign.message);
        sentCount = results.filter(r => r?.success !== false).length;
      }
    } else if (campaign.type === 'whatsapp') {
      for (const l of leads) {
        if (!l.guardian_phone) continue;
        try {
          await sendWhatsAppToParent(tid, l.guardian_phone, campaign.message);
          sentCount++;
        } catch (waErr) {
          logger.warn(`CRM WhatsApp campaign send failed for ${l.guardian_phone}: ${waErr.message}`);
        }
      }
    } else if (campaign.type === 'email') {
      for (const l of leads) {
        if (!l.guardian_email) continue;
        const result = await sendEmail(l.guardian_email, 'notification', {
          title: campaign.name, message: campaign.message, subject: campaign.name
        });
        if (result?.success !== false) sentCount++;
      }
    }

    const rows = await query(
      `UPDATE crm_campaigns SET status = 'sent', sent_count = $1, sent_at = NOW() WHERE id = $2 RETURNING *`,
      [sentCount, req.params.id]
    );
    res.json({ success: true, message: `Campaign sent to ${sentCount} recipient(s)`, data: rows[0] });
  } catch (err) {
    logger.error('Send CRM campaign error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── REPORTS ────────────────────────────────────────────────────────────────

router.get('/reports/sources', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT source, COUNT(*)::int AS count FROM crm_leads WHERE tenant_id = $1 GROUP BY source`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('CRM sources report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/conversion', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'converted')::int AS converted,
              COUNT(*) FILTER (WHERE status = 'lost')::int AS lost
       FROM crm_leads WHERE tenant_id = $1`,
      [tid]
    );
    const r = rows[0];
    res.json({ success: true, data: { ...r, conversion_rate: r.total > 0 ? +(r.converted / r.total * 100).toFixed(1) : 0 } });
  } catch (err) {
    logger.error('CRM conversion report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/campaigns', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT id, name, type, status, sent_count, sent_at FROM crm_campaigns WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('CRM campaigns report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
