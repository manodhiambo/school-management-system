import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import { blockDemoSideEffects } from '../middleware/demoGuard.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);
router.use(requireModule('communication'));
router.use(tenantContext);
router.use(requireActiveTenant);

// ─── Mobitech SMS API ─────────────────────────────────────────────────────────
const MOBITECH_URL_SINGLE   = 'https://app.mobitechtechnologies.com//sms/sendsms';
const MOBITECH_URL_MULTIPLE = 'https://app.mobitechtechnologies.com//sms/sendmultiple';

function mobitekHeaders() {
  return {
    'h_api_key':     process.env.MOBITECH_API_KEY || '',
    'Content-Type':  'application/json',
  };
}

// Send a single SMS via Mobitech
export async function sendSMSViaProvider(phone, message) {
  const apiKey     = process.env.MOBITECH_API_KEY;
  const senderName = process.env.MOBITECH_SENDER_NAME || 'SKULMANAGER';

  if (!apiKey) {
    logger.warn('Mobitech API key not configured — SMS logged only');
    return { success: false, error: 'SMS provider not configured' };
  }

  try {
    const res = await fetch(MOBITECH_URL_SINGLE, {
      method:  'POST',
      headers: mobitekHeaders(),
      body: JSON.stringify({
        mobile:        phone,
        sender_name:   senderName,
        message:       message,
        service_id:    0,
        response_type: 'json',
      }),
    });

    const data = await res.json();
    const item = Array.isArray(data) ? data[0] : data;
    const code = String(item?.status_code ?? '');

    if (code === '1000') {
      return { success: true, ref: String(item.message_id ?? '') };
    }
    return { success: false, error: item?.status_desc || `Code ${code}` };
  } catch (err) {
    logger.error('Mobitech SMS send error:', err.message);
    return { success: false, error: err.message };
  }
}

// Send multiple SMS in one API call via Mobitech /sendmultiple
async function sendBulkSMSViaProvider(recipients, message) {
  // recipients: [{ phone, ref }]
  const apiKey     = process.env.MOBITECH_API_KEY;
  const senderName = process.env.MOBITECH_SENDER_NAME || 'SKULMANAGER';

  if (!apiKey) {
    return recipients.map(() => ({ success: false, error: 'SMS provider not configured' }));
  }

  try {
    const messages = recipients.map((r, i) => ({
      mobile:     r.phone,
      message:    message,
      client_ref: i + 1,
    }));

    const res = await fetch(MOBITECH_URL_MULTIPLE, {
      method:  'POST',
      headers: mobitekHeaders(),
      body: JSON.stringify({
        serviceId: '0',
        shortcode:  senderName,
        messages,
      }),
    });

    const data = await res.json();
    const topCode = String(data?.status_code ?? '');

    if (topCode !== '1000') {
      const err = data?.status_desc || `Code ${topCode}`;
      return recipients.map(() => ({ success: false, error: err }));
    }

    const details = data.schedule_details || [];
    return recipients.map((_, i) => {
      const d = details[i];
      if (!d) return { success: false, error: 'No response for this recipient' };
      return String(d.schedule_status) === '1'
        ? { success: true,  ref: String(d.message_id ?? '') }
        : { success: false, error: d.schedule_desc || 'Failed' };
    });
  } catch (err) {
    logger.error('Mobitech bulk SMS error:', err.message);
    return recipients.map(() => ({ success: false, error: err.message }));
  }
}

// Normalise phone to +254XXXXXXXXX (Kenya)
export function normalisePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return '+' + digits;
  if (digits.startsWith('0')   && digits.length === 10) return '+254' + digits.slice(1);
  if (digits.startsWith('7')   && digits.length === 9)  return '+254' + digits;
  return '+' + digits;
}

// ─── POST /sms/send — single recipient ───────────────────────────────────────
router.post('/send', blockDemoSideEffects('sending an SMS'), async (req, res) => {
  try {
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin or teacher only' });
    }
    const tid = req.tenantId;
    const { phone_number, recipient_id, recipient_type = 'custom', message, category = 'general' } = req.body;

    if (!message || message.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    let phone = phone_number;

    if (!phone && recipient_id) {
      let rows = [];
      if (recipient_type === 'parent') {
        rows = await query('SELECT phone FROM parents WHERE id=$1 AND tenant_id=$2', [recipient_id, tid]);
      } else if (recipient_type === 'student') {
        rows = await query(
          `SELECT p.phone FROM parents p
           JOIN parent_students ps ON ps.parent_id = p.id
           WHERE ps.student_id = $1 AND p.tenant_id = $2 LIMIT 1`,
          [recipient_id, tid]
        );
      } else if (recipient_type === 'teacher') {
        rows = await query(
          `SELECT t.phone_primary AS phone FROM teachers t
           JOIN users u ON u.id = t.user_id AND u.tenant_id = $2
           WHERE u.id = $1 LIMIT 1`,
          [recipient_id, tid]
        );
      }
      if (rows.length) phone = rows[0].phone;
    }

    if (!phone) {
      return res.status(400).json({ success: false, message: 'phone_number or resolvable recipient_id required' });
    }

    phone = normalisePhone(phone);
    const result = await sendSMSViaProvider(phone, message.trim());

    const logId = uuidv4();
    await query(
      `INSERT INTO sms_messages
         (id, tenant_id, sent_by, recipient_type, recipient_id, phone_number,
          message, category, status, provider_ref, sent_at, error_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [logId, tid, req.user.id, recipient_type, recipient_id || null,
       phone, message.trim(), category,
       result.success ? 'sent' : 'failed',
       result.ref || null,
       result.success ? new Date() : null,
       result.error || null]
    );

    res.json({ success: true, data: { id: logId, status: result.success ? 'sent' : 'failed', phone, provider_ref: result.ref, error: result.error } });
  } catch (err) {
    logger.error('SMS send route error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /sms/bulk — multiple recipients via Mobitech /sendmultiple ─────────
router.post('/bulk', blockDemoSideEffects('bulk SMS'), async (req, res) => {
  try {
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin or teacher only' });
    }
    const tid = req.tenantId;
    const { message, category = 'general', target, class_id, student_ids, parent_ids, custom_phones } = req.body;

    if (!message || message.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    let recipients = [];

    if (target === 'all_parents') {
      const rows = await query(
        `SELECT id, phone FROM parents WHERE tenant_id=$1 AND phone IS NOT NULL AND phone != ''`,
        [tid]
      );
      recipients = rows.map(r => ({ phone: r.phone, recipient_id: r.id, recipient_type: 'parent' }));

    } else if (target === 'class_parents' && class_id) {
      const rows = await query(
        `SELECT DISTINCT p.id, p.phone FROM parents p
         JOIN parent_students ps ON ps.parent_id = p.id
         JOIN students s ON s.id = ps.student_id AND s.class_id = $1 AND s.tenant_id = $2
         WHERE p.tenant_id = $2 AND p.phone IS NOT NULL AND p.phone != ''`,
        [class_id, tid]
      );
      recipients = rows.map(r => ({ phone: r.phone, recipient_id: r.id, recipient_type: 'parent' }));

    } else if (target === 'all_teachers') {
      // Teachers' phones are in the teachers profile table, not in users
      const rows = await query(
        `SELECT t.phone_primary AS phone, u.id
         FROM teachers t
         JOIN users u ON u.id = t.user_id AND u.tenant_id = $1
         WHERE t.phone_primary IS NOT NULL AND t.phone_primary != ''`,
        [tid]
      );
      recipients = rows.map(r => ({ phone: r.phone, recipient_id: r.id, recipient_type: 'teacher' }));

    } else if (Array.isArray(parent_ids) && parent_ids.length) {
      const rows = await query(
        `SELECT id, phone FROM parents WHERE id = ANY($1::uuid[]) AND tenant_id=$2`,
        [parent_ids, tid]
      );
      recipients = rows.filter(r => r.phone).map(r => ({ phone: r.phone, recipient_id: r.id, recipient_type: 'parent' }));

    } else if (Array.isArray(student_ids) && student_ids.length) {
      const rows = await query(
        `SELECT DISTINCT p.id, p.phone, ps.student_id FROM parents p
         JOIN parent_students ps ON ps.parent_id = p.id
         WHERE ps.student_id = ANY($1::uuid[]) AND p.tenant_id = $2 AND p.phone IS NOT NULL`,
        [student_ids, tid]
      );
      recipients = rows.filter(r => r.phone).map(r => ({ phone: r.phone, recipient_id: r.student_id, recipient_type: 'student' }));

    } else if (Array.isArray(custom_phones) && custom_phones.length) {
      recipients = custom_phones.map(ph => ({ phone: ph, recipient_type: 'custom' }));
    }

    if (!recipients.length) {
      return res.status(400).json({ success: false, message: 'No valid recipients found' });
    }

    // Normalise all phone numbers
    const normalised = recipients.map(r => ({ ...r, phone: normalisePhone(r.phone) }));

    // Use Mobitech /sendmultiple for batches, /sendsms for single
    let results;
    if (normalised.length === 1) {
      const r = await sendSMSViaProvider(normalised[0].phone, message.trim());
      results = [r];
    } else {
      results = await sendBulkSMSViaProvider(normalised, message.trim());
    }

    let sent = 0, failed = 0;

    for (let i = 0; i < normalised.length; i++) {
      const r   = normalised[i];
      const res = results[i] || { success: false, error: 'No result' };
      if (res.success) sent++; else failed++;

      await query(
        `INSERT INTO sms_messages
           (id, tenant_id, sent_by, recipient_type, recipient_id, phone_number,
            message, category, status, provider_ref, sent_at, error_message)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [uuidv4(), tid, req.user.id, r.recipient_type, r.recipient_id || null,
         r.phone, message.trim(), category,
         res.success ? 'sent' : 'failed',
         res.ref  || null,
         res.success ? new Date() : null,
         res.error || null]
      ).catch(() => {});
    }

    res.json({ success: true, data: { sent, failed, total: normalised.length } });
  } catch (err) {
    logger.error('SMS bulk error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /sms/balance — check Mobitech account balance ───────────────────────
router.get('/balance', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const apiKey = process.env.MOBITECH_API_KEY;
    if (!apiKey) return res.json({ success: false, error: 'API key not configured' });

    const r = await fetch('https://app.mobitechtechnologies.com//sms/getbalance', {
      headers: { 'h_api_key': apiKey, 'Content-Type': 'application/json' },
    });
    const data = await r.json();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /sms/logs ────────────────────────────────────────────────────────────
router.get('/logs', async (req, res) => {
  try {
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const tid = req.tenantId;
    const { limit = 100, offset = 0, category, status: filterStatus } = req.query;

    let sql = `
      SELECT sm.*, u.first_name||' '||u.last_name AS sent_by_name
      FROM sms_messages sm
      LEFT JOIN users u ON u.id = sm.sent_by
      WHERE sm.tenant_id = $1`;
    const params = [tid];

    if (category)     { sql += ` AND sm.category = $${params.length + 1}`; params.push(category); }
    if (filterStatus) { sql += ` AND sm.status = $${params.length + 1}`;   params.push(filterStatus); }

    sql += ` ORDER BY sm.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), Number(offset));

    const rows      = await query(sql, params);
    const countRows = await query('SELECT COUNT(*) FROM sms_messages WHERE tenant_id=$1', [tid]);

    res.json({ success: true, data: rows, total: parseInt(countRows[0]?.count || '0') });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /sms/templates ───────────────────────────────────────────────────────
router.get('/templates', (req, res) => {
  res.json({ success: true, data: [
    { id: 1, category: 'fee_reminder',  label: 'Fee Reminder',         text: 'Dear Parent, fees for {student_name} are due. Balance: KES {balance}. Please pay by {due_date}. — {school_name}' },
    { id: 2, category: 'absence',       label: 'Absence Alert',        text: 'Dear Parent, {student_name} was absent today ({date}). Please contact the school if this was unplanned. — {school_name}' },
    { id: 3, category: 'results',       label: 'Results Published',    text: 'Dear Parent, results for {student_name} for {term} are now available. Log in to SkulManager to view. — {school_name}' },
    { id: 4, category: 'event',         label: 'School Event',         text: 'Dear Parent, reminder: {event_name} on {date}. Please ensure {student_name} attends. — {school_name}' },
    { id: 5, category: 'transport',     label: 'Transport Alert',      text: 'TRANSPORT: {student_name} was not picked up this morning on route {route_name}. — {school_name}' },
    { id: 6, category: 'discipline',    label: 'Discipline Notice',    text: 'Dear Parent, {student_name} had a discipline incident today ({incident_type}). Please come to school. — {school_name}' },
    { id: 7, category: 'general',       label: 'General Announcement', text: 'Dear Parent, {message}. — {school_name}' },
    { id: 8, category: 'emergency',     label: 'Emergency Alert',      text: 'URGENT: {message}. Please contact school immediately: {school_phone}. — {school_name}' },
  ]});
});

// ─── GET /sms/stats ───────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const tid = req.tenantId;
    const rows = await query(
      `SELECT
         COUNT(*) AS total_sent,
         COUNT(*) FILTER (WHERE status='sent' OR status='delivered') AS successful,
         COUNT(*) FILTER (WHERE status='failed') AS failed,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')  AS last_7_days,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS last_30_days
       FROM sms_messages WHERE tenant_id=$1`,
      [tid]
    );
    res.json({ success: true, data: rows[0] || {} });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
