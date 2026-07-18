import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import { blockDemoSideEffects } from '../middleware/demoGuard.js';
import logger from '../utils/logger.js';
import axios from 'axios';

const router = express.Router();

// ─── WhatsApp Business API helpers ───────────────────────────────────────────

async function sendWhatsApp(phoneNumberId, accessToken, to, message) {
  const response = await axios.post(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: to.replace(/^\+/, ''),
      type: 'text',
      text: { body: message }
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
}

/**
 * Export: send a WhatsApp message to a parent given tenant context.
 * Fetches WhatsApp config for the tenant and sends.
 */
export async function sendWhatsAppToParent(tenantId, phone, message) {
  const configRows = await query(
    `SELECT * FROM whatsapp_config WHERE tenant_id = $1 AND is_enabled = TRUE`,
    [tenantId]
  );
  if (!configRows.length) {
    throw new Error('WhatsApp not configured or disabled for this tenant');
  }
  const cfg = configRows[0];
  return sendWhatsApp(cfg.phone_number_id, cfg.access_token, phone, message);
}

// ─── Routes (admin only) ─────────────────────────────────────────────────────
router.use(authenticate);
router.use(requireModule('communication'));

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  next();
}

// GET /config — get WhatsApp config (mask access_token)
router.get('/config', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT tenant_id, phone_number_id, is_enabled,
              CASE WHEN access_token IS NOT NULL
                   THEN '...' || RIGHT(access_token, 8)
                   ELSE NULL
              END AS access_token
       FROM whatsapp_config WHERE tenant_id = $1`,
      [tid]
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    logger.error('Get WhatsApp config error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /config — create or update WhatsApp config
router.put('/config', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { phone_number_id, access_token, is_enabled } = req.body;
    if (!phone_number_id || !access_token) {
      return res.status(400).json({ success: false, message: 'phone_number_id and access_token are required' });
    }
    const rows = await query(
      `INSERT INTO whatsapp_config (tenant_id, phone_number_id, access_token, is_enabled)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id) DO UPDATE SET
         phone_number_id = EXCLUDED.phone_number_id,
         access_token = EXCLUDED.access_token,
         is_enabled = EXCLUDED.is_enabled
       RETURNING tenant_id, phone_number_id, is_enabled,
                 '...' || RIGHT(access_token, 8) AS access_token`,
      [tid, phone_number_id, access_token, is_enabled !== undefined ? is_enabled : true]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update WhatsApp config error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /test — send a test message
router.post('/test', adminOnly, blockDemoSideEffects('sending a WhatsApp message'), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, message: 'phone and message are required' });
    }
    let result;
    try {
      result = await sendWhatsAppToParent(tid, phone, message);
    } catch (sendErr) {
      return res.status(400).json({ success: false, message: sendErr.message });
    }

    // Log the test message
    await query(
      `INSERT INTO whatsapp_messages (tenant_id, to_phone, template, body, status, meta_msg_id)
       VALUES ($1, $2, 'test', $3, 'sent', $4)`,
      [tid, phone, message, result?.messages?.[0]?.id || null]
    ).catch(e => logger.warn('WhatsApp log insert failed:', e.message));

    res.json({ success: true, data: { result } });
  } catch (err) {
    logger.error('WhatsApp test send error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /send — bulk or targeted send
router.post('/send', adminOnly, blockDemoSideEffects('sending a WhatsApp message'), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { target, class_id, phone, message } = req.body;
    if (!target || !message) {
      return res.status(400).json({ success: false, message: 'target and message are required' });
    }

    // Fetch WhatsApp config
    const configRows = await query(
      `SELECT * FROM whatsapp_config WHERE tenant_id = $1 AND is_enabled = TRUE`,
      [tid]
    );
    if (!configRows.length) {
      return res.status(400).json({ success: false, message: 'WhatsApp not configured or disabled' });
    }
    const cfg = configRows[0];

    let phones = [];

    if (target === 'phone') {
      if (!phone) return res.status(400).json({ success: false, message: 'phone is required for target=phone' });
      phones = [phone];
    } else if (target === 'all') {
      // All parents in tenant with phone numbers
      const parentRows = await query(
        `SELECT DISTINCT u.phone FROM users u
         WHERE u.tenant_id = $1 AND u.role = 'parent' AND u.phone IS NOT NULL AND u.phone != ''`,
        [tid]
      );
      phones = parentRows.map(r => r.phone);
    } else if (target === 'class') {
      if (!class_id) return res.status(400).json({ success: false, message: 'class_id is required for target=class' });
      // Parents of students in the class
      const parentRows = await query(
        `SELECT DISTINCT u.phone FROM users u
         JOIN students s ON s.parent_id = u.id
         WHERE s.class_id = $1 AND s.tenant_id = $2
           AND u.phone IS NOT NULL AND u.phone != ''`,
        [class_id, tid]
      );
      phones = parentRows.map(r => r.phone);
    } else {
      return res.status(400).json({ success: false, message: "target must be 'all', 'class', or 'phone'" });
    }

    if (!phones.length) {
      return res.json({ success: true, data: { sent: 0, failed: 0, message: 'No recipients found' } });
    }

    let sent = 0;
    let failed = 0;

    for (const toPhone of phones) {
      try {
        const result = await sendWhatsApp(cfg.phone_number_id, cfg.access_token, toPhone, message);
        const metaMsgId = result?.messages?.[0]?.id || null;
        await query(
          `INSERT INTO whatsapp_messages (tenant_id, to_phone, body, status, meta_msg_id)
           VALUES ($1, $2, $3, 'sent', $4)`,
          [tid, toPhone, message, metaMsgId]
        ).catch(e => logger.warn('WhatsApp log insert failed:', e.message));
        sent++;
      } catch (sendErr) {
        logger.error(`WhatsApp send failed to ${toPhone}:`, sendErr.message);
        await query(
          `INSERT INTO whatsapp_messages (tenant_id, to_phone, body, status, error)
           VALUES ($1, $2, $3, 'failed', $4)`,
          [tid, toPhone, message, sendErr.message]
        ).catch(e => logger.warn('WhatsApp error log insert failed:', e.message));
        failed++;
      }
    }

    res.json({ success: true, data: { sent, failed, total: phones.length } });
  } catch (err) {
    logger.error('WhatsApp bulk send error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /phones — return phone numbers for a target without sending (for direct WhatsApp fallback)
router.get('/phones', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { target, class_id } = req.query;

    let rows = [];
    if (target === 'all') {
      rows = await query(
        `SELECT u.phone, u.email, u.first_name, u.last_name
         FROM users u
         WHERE u.tenant_id = $1 AND u.role = 'parent'
           AND u.phone IS NOT NULL AND u.phone != ''`,
        [tid]
      );
    } else if (target === 'class' && class_id) {
      rows = await query(
        `SELECT DISTINCT u.phone, u.email, u.first_name, u.last_name
         FROM users u
         JOIN students s ON s.parent_id = u.id
         WHERE s.class_id = $1 AND s.tenant_id = $2
           AND u.phone IS NOT NULL AND u.phone != ''`,
        [class_id, tid]
      );
    } else {
      return res.status(400).json({ success: false, message: "target must be 'all' or 'class'" });
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get WhatsApp phones error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /log — list sent messages, paginated
router.get('/log', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status, from_date, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `SELECT * FROM whatsapp_messages WHERE tenant_id = $1`;
    const params = [tid];
    if (status) { sql += ` AND status = $${params.length + 1}`; params.push(status); }
    if (from_date) { sql += ` AND created_at >= $${params.length + 1}`; params.push(from_date); }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const rows = await query(sql, params);

    // Count total
    let countSql = `SELECT COUNT(*) AS total FROM whatsapp_messages WHERE tenant_id = $1`;
    const countParams = [tid];
    if (status) { countSql += ` AND status = $${countParams.length + 1}`; countParams.push(status); }
    if (from_date) { countSql += ` AND created_at >= $${countParams.length + 1}`; countParams.push(from_date); }
    const countRows = await query(countSql, countParams);

    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(countRows[0].total) }
    });
  } catch (err) {
    logger.error('Get WhatsApp log error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
