import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// ─── Mobitech SMS helper ──────────────────────────────────────────────────────
const MOBITECH_URL = 'https://app.mobitechtechnologies.com//sms/sendsms';

async function sendSMS(phone, message) {
  const apiKey = process.env.MOBITECH_API_KEY;
  const senderName = process.env.MOBITECH_SENDER_NAME || 'SKULMANAGER';

  if (!apiKey) {
    logger.warn('Mobitech API key not configured — SMS skipped');
    return { success: false, error: 'SMS provider not configured' };
  }

  try {
    const res = await fetch(MOBITECH_URL, {
      method: 'POST',
      headers: {
        'h_api_key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile: phone,
        sender_name: senderName,
        message,
        service_id: 0,
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
    logger.error('Mobitech SMS error:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Default config object ────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  enabled: true,
  reminder_days: [7, 3, 1],
  message_template:
    "Dear Parent, {student_name}'s school fee balance is KES {balance}. Please pay to avoid inconvenience. Thank you.",
};

// GET /config — get tenant fee reminder config
router.get('/config', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      'SELECT * FROM fee_reminder_config WHERE tenant_id = $1',
      [tid]
    );

    const config = rows.length > 0 ? rows[0] : { ...DEFAULT_CONFIG, tenant_id: tid };
    res.json({ success: true, data: config });
  } catch (err) {
    logger.error('Get fee reminder config error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /config — admin only, upsert config
router.put('/config', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const {
      enabled = true,
      reminder_days = [7, 3, 1],
      message_template = DEFAULT_CONFIG.message_template,
    } = req.body;

    const rows = await query(
      `INSERT INTO fee_reminder_config (id, tenant_id, enabled, reminder_days, message_template, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET
         enabled = EXCLUDED.enabled,
         reminder_days = EXCLUDED.reminder_days,
         message_template = EXCLUDED.message_template,
         updated_at = NOW()
       RETURNING *`,
      [uuidv4(), tid, enabled, reminder_days, message_template]
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update fee reminder config error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /log — admin only, paginated reminder log
router.get('/log', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const countRows = await query(
      'SELECT COUNT(*) AS total FROM fee_reminder_log WHERE tenant_id = $1',
      [tid]
    );
    const total = parseInt(countRows[0].total);
    const pages = Math.ceil(total / limit);

    const rows = await query(
      `SELECT frl.*,
              s.first_name || ' ' || s.last_name AS student_name,
              s.admission_number
       FROM fee_reminder_log frl
       LEFT JOIN students s ON s.id = frl.student_id
       WHERE frl.tenant_id = $1
       ORDER BY frl.sent_at DESC
       LIMIT $2 OFFSET $3`,
      [tid, limit, offset]
    );

    res.json({ success: true, data: rows, total, page, pages });
  } catch (err) {
    logger.error('Get fee reminder log error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /send-now — admin only, trigger manual fee reminder run
router.post('/send-now', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;

    // Get config for message template
    const configRows = await query(
      'SELECT * FROM fee_reminder_config WHERE tenant_id = $1',
      [tid]
    );
    const config = configRows.length > 0 ? configRows[0] : DEFAULT_CONFIG;

    // Get school name for template substitution
    const tenantRows = await query(
      'SELECT name FROM tenants WHERE id = $1',
      [tid]
    );
    const schoolName = tenantRows[0]?.name || 'School';

    // Find students with outstanding balance (sum of balance_amount on unpaid invoices)
    const students = await query(
      `SELECT
         s.id AS student_id,
         s.first_name || ' ' || s.last_name AS student_name,
         COALESCE(SUM(fi.balance_amount), 0)::numeric AS balance
       FROM students s
       JOIN fee_invoices fi ON fi.student_id = s.id AND fi.tenant_id = $1
       WHERE s.tenant_id = $1
         AND fi.balance_amount > 0
         AND fi.status NOT IN ('paid','cancelled')
       GROUP BY s.id, s.first_name, s.last_name
       HAVING COALESCE(SUM(fi.balance_amount), 0) > 0`,
      [tid]
    );

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const student of students) {
      // Get parent phone via parent_students join
      const parentRows = await query(
        `SELECT DISTINCT p.phone
         FROM parents p
         JOIN parent_students ps ON ps.parent_id = p.id
         WHERE ps.student_id = $1
           AND p.tenant_id = $2
           AND p.phone IS NOT NULL
           AND p.phone != ''
         LIMIT 1`,
        [student.student_id, tid]
      );

      if (parentRows.length === 0) {
        skipped++;
        // Log skipped
        await query(
          `INSERT INTO fee_reminder_log
             (id, tenant_id, student_id, parent_phone, balance, channel, status)
           VALUES ($1,$2,$3,$4,$5,'sms','skipped')`,
          [uuidv4(), tid, student.student_id, null, student.balance]
        );
        continue;
      }

      const phone = parentRows[0].phone;
      const balance = parseFloat(student.balance).toFixed(2);

      // Build personalised message from template
      const message = config.message_template
        .replace('{student_name}', student.student_name)
        .replace('{balance}', balance)
        .replace('{school_name}', schoolName);

      const result = await sendSMS(phone, message);

      const status = result.success ? 'sent' : 'failed';
      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      await query(
        `INSERT INTO fee_reminder_log
           (id, tenant_id, student_id, parent_phone, balance, channel, status)
         VALUES ($1,$2,$3,$4,$5,'sms',$6)`,
        [uuidv4(), tid, student.student_id, phone, student.balance, status]
      );
    }

    res.json({ success: true, data: { sent, failed, skipped, total: students.length } });
  } catch (err) {
    logger.error('Send fee reminders error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /stats — reminders sent this month vs last month
router.get('/stats', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;

    const rows = await query(
      `SELECT
         COUNT(*) FILTER (
           WHERE sent_at >= DATE_TRUNC('month', NOW())
         )::int AS this_month_total,
         COUNT(*) FILTER (
           WHERE sent_at >= DATE_TRUNC('month', NOW())
             AND status = 'sent'
         )::int AS this_month_sent,
         COUNT(*) FILTER (
           WHERE sent_at >= DATE_TRUNC('month', NOW())
             AND status = 'failed'
         )::int AS this_month_failed,
         COUNT(*) FILTER (
           WHERE sent_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
             AND sent_at < DATE_TRUNC('month', NOW())
         )::int AS last_month_total,
         COUNT(*) FILTER (
           WHERE sent_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
             AND sent_at < DATE_TRUNC('month', NOW())
             AND status = 'sent'
         )::int AS last_month_sent
       FROM fee_reminder_log
       WHERE tenant_id = $1`,
      [tid]
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Get fee reminder stats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
