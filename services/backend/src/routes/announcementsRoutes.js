import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// Ensure announcements table has the correct columns (handles old MySQL-era schema)
(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        target_roles TEXT[] DEFAULT ARRAY['admin','teacher','student','parent'],
        target_class_id UUID,
        priority VARCHAR(20) DEFAULT 'normal',
        is_pinned BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMPTZ,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`, []);
    // Add columns that may be missing on older schema
    await query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS tenant_id UUID`, []).catch(() => {});
    await query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS body TEXT NOT NULL DEFAULT ''`, []).catch(() => {});
    await query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_roles TEXT[] DEFAULT ARRAY['admin','teacher','student','parent']`, []).catch(() => {});
    await query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE`, []).catch(() => {});
    await query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`, []).catch(() => {});
    await query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal'`, []).catch(() => {});

    await query(`
      CREATE TABLE IF NOT EXISTS announcement_reads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        read_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(announcement_id, user_id)
      )`, []);
  } catch (err) {
    logger.warn('Announcements table setup warning:', err.message);
  }
})();

// GET / — list announcements visible to the current user's role
// Admin sees all (including expired). Other roles see only active & role-targeted ones.
router.get('/', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    const uid = req.user.id;

    let sql;
    let params;

    if (role === 'admin' || role === 'superadmin') {
      // Admin sees everything for their tenant
      sql = `
        SELECT a.*,
               u.first_name || ' ' || u.last_name AS created_by_name,
               c.name AS target_class_name,
               EXISTS (
                 SELECT 1 FROM announcement_reads ar
                 WHERE ar.announcement_id = a.id AND ar.user_id = $2
               ) AS is_read
        FROM announcements a
        LEFT JOIN users u ON u.id = a.created_by
        LEFT JOIN classes c ON c.id = a.target_class_id
        WHERE a.tenant_id = $1
        ORDER BY COALESCE(a.is_pinned, FALSE) DESC, a.created_at DESC
      `;
      params = [tid, uid];
    } else {
      // Non-admin: only active announcements targeting their role
      sql = `
        SELECT a.*,
               u.first_name || ' ' || u.last_name AS created_by_name,
               c.name AS target_class_name,
               EXISTS (
                 SELECT 1 FROM announcement_reads ar
                 WHERE ar.announcement_id = a.id AND ar.user_id = $2
               ) AS is_read
        FROM announcements a
        LEFT JOIN users u ON u.id = a.created_by
        LEFT JOIN classes c ON c.id = a.target_class_id
        WHERE a.tenant_id = $1
          AND (COALESCE(a.target_roles, ARRAY['admin','teacher','student','parent']::text[]) @> ARRAY[$3::text])
          AND (a.expires_at IS NULL OR a.expires_at > NOW())
        ORDER BY COALESCE(a.is_pinned, FALSE) DESC, a.created_at DESC
      `;
      params = [tid, uid, role];
    }

    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Get announcements error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /unread-count — count unread announcements for current user
router.get('/unread-count', async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const role = req.user.role;
    const uid = req.user.id;

    const isAdmin = role === 'admin' || role === 'superadmin';

    const sql = `
      SELECT COUNT(*) AS count
      FROM announcements a
      WHERE a.tenant_id = $1
        ${isAdmin ? '' : `AND a.target_roles @> ARRAY[$3::text]
        AND (a.expires_at IS NULL OR a.expires_at > NOW())`}
        AND NOT EXISTS (
          SELECT 1 FROM announcement_reads ar
          WHERE ar.announcement_id = a.id AND ar.user_id = $2
        )
    `;

    const params = isAdmin ? [tid, uid] : [tid, uid, role];
    const rows = await query(sql, params);
    res.json({ success: true, count: parseInt(rows[0].count) });
  } catch (err) {
    logger.error('Unread count error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST / — admin only, create announcement
router.post('/', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const {
      title, body, target_roles, target_class_id,
      priority = 'normal', is_pinned = false, expires_at
    } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'title and body are required' });
    }

    const roles = Array.isArray(target_roles)
      ? target_roles
      : ['admin', 'teacher', 'student', 'parent'];

    const id = uuidv4();
    const rows = await query(
      `INSERT INTO announcements
         (id, tenant_id, title, body, target_roles, target_class_id, priority, is_pinned, expires_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        id, tid, title, body,
        roles,
        target_class_id || null,
        priority, is_pinned,
        expires_at || null,
        req.user.id
      ]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Create announcement error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /:id — admin only, update announcement
router.put('/:id', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { id } = req.params;
    const {
      title, body, target_roles, target_class_id,
      priority, is_pinned, expires_at
    } = req.body;

    const existing = await query(
      'SELECT id FROM announcements WHERE id = $1 AND tenant_id = $2',
      [id, tid]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    const rows = await query(
      `UPDATE announcements
       SET title = COALESCE($1, title),
           body = COALESCE($2, body),
           target_roles = COALESCE($3, target_roles),
           target_class_id = COALESCE($4, target_class_id),
           priority = COALESCE($5, priority),
           is_pinned = COALESCE($6, is_pinned),
           expires_at = $7,
           updated_at = NOW()
       WHERE id = $8 AND tenant_id = $9
       RETURNING *`,
      [
        title || null, body || null,
        target_roles || null,
        target_class_id !== undefined ? target_class_id : null,
        priority || null, is_pinned !== undefined ? is_pinned : null,
        expires_at !== undefined ? expires_at : null,
        id, tid
      ]
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('Update announcement error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /:id — admin only
router.delete('/:id', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const { id } = req.params;

    const rows = await query(
      'DELETE FROM announcements WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tid]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    logger.error('Delete announcement error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /:id/read — mark announcement as read for current user
router.post('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.id;

    await query(
      `INSERT INTO announcement_reads (id, announcement_id, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (announcement_id, user_id) DO NOTHING`,
      [uuidv4(), id, uid]
    );

    res.json({ success: true, message: 'Marked as read' });
  } catch (err) {
    logger.error('Mark read error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
