import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireModule } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ─── Ensure inbound_sms_log table exists ─────────────────────────────────────
(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS inbound_sms_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        from_phone VARCHAR(30),
        keyword VARCHAR(30),
        response_sent TEXT,
        status VARCHAR(20) DEFAULT 'processed',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `, []);
    logger.info('inbound_sms_log table ensured');
  } catch (err) {
    logger.warn('Could not create inbound_sms_log table:', err.message);
  }
})();

// ─── Mobitech SMS reply helper ─────────────────────────────────────────────
const MOBITECH_URL_SINGLE = 'https://app.mobitechtechnologies.com//sms/sendsms';

async function sendSMSReply(phone, message) {
  const apiKey = process.env.MOBITECH_API_KEY;
  const senderName = process.env.MOBITECH_SENDER_NAME || 'SKULMANAGER';
  if (!apiKey) {
    logger.warn('Mobitech API key not set — SMS reply not sent');
    return { success: false };
  }
  try {
    const res = await fetch(MOBITECH_URL_SINGLE, {
      method: 'POST',
      headers: { 'h_api_key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: phone,
        sender_name: senderName,
        message,
        service_id: 0,
        response_type: 'json'
      })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    logger.error('Mobitech reply error:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Inbound SMS handlers ─────────────────────────────────────────────────────

/**
 * Find a parent user by phone number and return their linked students.
 * Searches across all tenants — returns { tenant_id, studentIds[] } or null.
 */
async function findParentByPhone(phone) {
  const normalised = phone.replace(/^\+?254/, '0').replace(/\s+/g, '');
  const patterns = [normalised, `+254${normalised.slice(1)}`, `254${normalised.slice(1)}`];
  for (const p of patterns) {
    const rows = await query(
      `SELECT u.id, u.tenant_id FROM users u WHERE u.phone = $1 AND u.role = 'parent' LIMIT 1`,
      [p]
    );
    if (rows.length) {
      const parent = rows[0];
      const studentRows = await query(
        `SELECT id FROM students WHERE parent_id = $1 AND tenant_id = $2`,
        [parent.id, parent.tenant_id]
      );
      return { tenant_id: parent.tenant_id, parent_id: parent.id, studentIds: studentRows.map(r => r.id) };
    }
  }
  return null;
}

async function handleBalance(from) {
  const parent = await findParentByPhone(from);
  if (!parent || !parent.studentIds.length) return 'No student accounts found for your number.';
  const rows = await query(
    `SELECT s.first_name || ' ' || s.last_name AS name,
            COALESCE(fa.balance, 0) AS balance
     FROM students s
     LEFT JOIN fee_accounts fa ON fa.student_id = s.id AND fa.tenant_id = s.tenant_id
     WHERE s.id = ANY($1) AND s.tenant_id = $2`,
    [parent.studentIds, parent.tenant_id]
  );
  if (!rows.length) return 'No fee records found.';
  return rows.map(r => `${r.name}: KES ${parseFloat(r.balance).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`).join('\n');
}

async function handleAttendance(from) {
  const parent = await findParentByPhone(from);
  if (!parent || !parent.studentIds.length) return 'No student records found for your number.';
  const rows = await query(
    `SELECT s.first_name || ' ' || s.last_name AS name,
            COUNT(*) FILTER (WHERE a.status = 'present') AS present,
            COUNT(*) AS total
     FROM students s
     JOIN attendance a ON a.student_id = s.id AND a.tenant_id = s.tenant_id
     WHERE s.id = ANY($1) AND s.tenant_id = $2
       AND a.date >= DATE_TRUNC('week', CURRENT_DATE)
       AND a.date <= CURRENT_DATE
     GROUP BY s.id, s.first_name, s.last_name`,
    [parent.studentIds, parent.tenant_id]
  );
  if (!rows.length) return 'No attendance data for this week.';
  return rows.map(r => `${r.name}: ${r.present}/${r.total} days present this week`).join('\n');
}

async function handleResults(from) {
  const parent = await findParentByPhone(from);
  if (!parent || !parent.studentIds.length) return 'No student records found for your number.';
  const rows = await query(
    `SELECT DISTINCT ON (r.student_id, r.subject_id)
            s.first_name || ' ' || s.last_name AS student_name,
            subj.name AS subject_name,
            r.marks_obtained AS marks,
            r.cbc_grade AS grade,
            e.name AS exam_name
     FROM exam_results r
     JOIN students s ON s.id = r.student_id
     JOIN subjects subj ON subj.id = r.subject_id
     JOIN exams e ON e.id = r.exam_id
     WHERE r.student_id = ANY($1) AND r.tenant_id = $2
       AND e.is_results_published = TRUE
     ORDER BY r.student_id, r.subject_id, r.created_at DESC`,
    [parent.studentIds, parent.tenant_id]
  );
  if (!rows.length) return 'No published results found for your students.';
  const byStudent = {};
  for (const r of rows) {
    if (!byStudent[r.student_name]) byStudent[r.student_name] = [];
    byStudent[r.student_name].push(`${r.subject_name}: ${r.marks} (${r.grade})`);
  }
  return Object.entries(byStudent)
    .map(([name, subjects]) => `${name}:\n${subjects.join('\n')}`)
    .join('\n\n');
}

// ─── Handler map ──────────────────────────────────────────────────────────────
const HANDLER_MAP = {
  balance: handleBalance,
  attendance: handleAttendance,
  results: handleResults
};

const DEFAULT_REPLY = 'Available commands:\nBAL - fee balance\nATT - attendance this week\nRESULT - latest results';

// ─── Keyword lookup using active sms_keywords for a matched tenant ─────────────
async function findKeywordHandler(keyword, tenantId) {
  const rows = await query(
    `SELECT handler FROM sms_keywords WHERE UPPER(keyword) = $1 AND tenant_id = $2 AND is_active = TRUE LIMIT 1`,
    [keyword.toUpperCase(), tenantId]
  );
  return rows.length ? rows[0].handler : null;
}

// Built-in keyword map (used when tenant not found or no custom mapping)
const BUILTIN_KEYWORDS = {
  BAL: 'balance',
  BALANCE: 'balance',
  ATT: 'attendance',
  ATTENDANCE: 'attendance',
  RESULT: 'results',
  RESULTS: 'results'
};

// ─── INBOUND (public) ─────────────────────────────────────────────────────────

// POST /inbound — PUBLIC, called by Mobitech webhook
router.post('/inbound', async (req, res) => {
  const { from, to, message, message_id } = req.body;
  // Acknowledge immediately (Mobitech expects 200 quickly)
  res.json({ success: true });

  const rawKeyword = (message || '').trim().toUpperCase().split(/\s+/)[0];

  let replyText = DEFAULT_REPLY;
  let keyword = rawKeyword;
  let tenantId = null;

  try {
    // Try to find parent and resolve tenant
    const parent = await findParentByPhone(from || '');
    if (parent) tenantId = parent.tenant_id;

    // Resolve handler: check sms_keywords table if tenant known, else use built-ins
    let handlerKey = null;
    if (tenantId) {
      handlerKey = await findKeywordHandler(rawKeyword, tenantId);
    }
    if (!handlerKey) {
      handlerKey = BUILTIN_KEYWORDS[rawKeyword] || null;
    }

    if (handlerKey && HANDLER_MAP[handlerKey]) {
      try {
        replyText = await HANDLER_MAP[handlerKey](from);
      } catch (handlerErr) {
        logger.error(`SMS keyword handler '${handlerKey}' error:`, handlerErr.message);
        replyText = 'Sorry, we could not retrieve your information. Please try again later.';
      }
    } else {
      replyText = DEFAULT_REPLY;
    }

    // Send reply
    await sendSMSReply(from, replyText);

    // Log
    await query(
      `INSERT INTO inbound_sms_log (tenant_id, from_phone, keyword, response_sent, status)
       VALUES ($1, $2, $3, $4, 'processed')`,
      [tenantId || null, from, keyword, replyText]
    );
  } catch (err) {
    logger.error('Inbound SMS processing error:', err);
    try {
      await query(
        `INSERT INTO inbound_sms_log (tenant_id, from_phone, keyword, response_sent, status)
         VALUES ($1, $2, $3, $4, 'error')`,
        [tenantId || null, from, keyword, err.message]
      );
    } catch (logErr) {
      logger.error('Failed to log inbound SMS error:', logErr.message);
    }
  }
});

// ─── Authenticated routes ─────────────────────────────────────────────────────
router.use(authenticate);
router.use(requireModule('communication'));

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  next();
}

// GET /keywords — list keywords
router.get('/keywords', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `SELECT * FROM sms_keywords WHERE tenant_id = $1 ORDER BY keyword`,
      [tid]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get SMS keywords error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /keywords — add keyword
router.post('/keywords', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { keyword, description, handler } = req.body;
    if (!keyword || !handler) {
      return res.status(400).json({ success: false, message: 'keyword and handler are required' });
    }
    const rows = await query(
      `INSERT INTO sms_keywords (tenant_id, keyword, description, handler, is_active)
       VALUES ($1, UPPER($2), $3, $4, TRUE) RETURNING *`,
      [tid, keyword, description || null, handler]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create SMS keyword error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /keywords/:id — update keyword
router.put('/keywords/:id', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { keyword, description, handler, is_active } = req.body;
    const rows = await query(
      `UPDATE sms_keywords SET
         keyword = COALESCE(UPPER($1), keyword),
         description = COALESCE($2, description),
         handler = COALESCE($3, handler),
         is_active = COALESCE($4, is_active)
       WHERE id = $5 AND tenant_id = $6 RETURNING *`,
      [keyword, description, handler, is_active, req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Keyword not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update SMS keyword error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /keywords/:id — deactivate
router.delete('/keywords/:id', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const rows = await query(
      `UPDATE sms_keywords SET is_active = FALSE WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [req.params.id, tid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Keyword not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Deactivate SMS keyword error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /inbound-log — admin, view inbound SMS log
router.get('/inbound-log', adminOnly, async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { status, from_date, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `SELECT * FROM inbound_sms_log WHERE tenant_id = $1`;
    const params = [tid];
    if (status) { sql += ` AND status = $${params.length + 1}`; params.push(status); }
    if (from_date) { sql += ` AND created_at >= $${params.length + 1}`; params.push(from_date); }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get inbound SMS log error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
