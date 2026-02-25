import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const router = express.Router();

router.use(authenticate);
router.use(tenantContext);
router.use(requireActiveTenant);

// Get settings
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const settings = await query(
      'SELECT * FROM settings WHERE tenant_id = $1 LIMIT 1',
      [tenantId]
    );
    res.json({
      success: true,
      data: settings[0] || {}
    });
  } catch (error) {
    logger.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Error fetching settings' });
  }
});

// Update settings
router.put('/', requireRole(['admin']), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const {
      school_name, school_code, phone, email, address, city, state, pincode,
      website, current_academic_year, timezone, currency, date_format, time_format,
      school_logo_url
    } = req.body;

    // Check if settings exist for this tenant
    const existing = await query('SELECT * FROM settings WHERE tenant_id = $1 LIMIT 1', [tenantId]);

    if (existing.length === 0) {
      // Create settings
      const settingsId = uuidv4();
      await query(
        `INSERT INTO settings (id, tenant_id, school_name, school_code, phone, email, address, city, state, pincode,
          website, current_academic_year, timezone, currency, date_format, time_format, school_logo_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())`,
        [settingsId, tenantId, school_name, school_code, phone, email, address, city, state, pincode,
          website, current_academic_year, timezone || 'Africa/Nairobi', currency || 'KES',
          date_format || 'DD/MM/YYYY', time_format || '12h', school_logo_url]
      );
    } else {
      await query(
        `UPDATE settings SET
          school_name = COALESCE($1, school_name),
          school_code = COALESCE($2, school_code),
          phone = COALESCE($3, phone),
          email = COALESCE($4, email),
          address = COALESCE($5, address),
          city = COALESCE($6, city),
          state = COALESCE($7, state),
          pincode = COALESCE($8, pincode),
          website = COALESCE($9, website),
          current_academic_year = COALESCE($10, current_academic_year),
          timezone = COALESCE($11, timezone),
          currency = COALESCE($12, currency),
          date_format = COALESCE($13, date_format),
          time_format = COALESCE($14, time_format),
          school_logo_url = COALESCE($15, school_logo_url),
          updated_at = NOW()
         WHERE tenant_id = $16`,
        [school_name, school_code, phone, email, address, city, state, pincode,
          website, current_academic_year, timezone, currency, date_format, time_format,
          school_logo_url, tenantId]
      );
    }

    const settings = await query('SELECT * FROM settings WHERE tenant_id = $1 LIMIT 1', [tenantId]);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings[0]
    });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Error updating settings' });
  }
});

// Get academic years
router.get('/academic-years', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const years = await query(
      'SELECT * FROM academic_years WHERE tenant_id = $1 ORDER BY start_date DESC',
      [tenantId]
    );
    res.json({
      success: true,
      data: years
    });
  } catch (error) {
    logger.error('Get academic years error:', error);
    res.status(500).json({ success: false, message: 'Error fetching academic years' });
  }
});

// Create academic year
router.post('/academic-years', requireRole(['admin']), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { year, start_date, end_date, is_current } = req.body;

    const yearId = uuidv4();

    if (is_current) {
      await query('UPDATE academic_years SET is_current = false WHERE tenant_id = $1', [tenantId]);
    }

    await query(
      `INSERT INTO academic_years (id, tenant_id, year, start_date, end_date, is_current)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [yearId, tenantId, year, start_date, end_date, is_current || false]
    );

    res.status(201).json({
      success: true,
      message: 'Academic year created successfully'
    });
  } catch (error) {
    logger.error('Create academic year error:', error);
    res.status(500).json({ success: false, message: 'Error creating academic year' });
  }
});

export default router;
