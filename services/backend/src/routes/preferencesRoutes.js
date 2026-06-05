import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const rows = await query('SELECT language, theme FROM user_preferences WHERE user_id = $1', [req.user.id]);
    res.json({ success: true, data: rows[0] || { language: 'en', theme: 'light' } });
  } catch (err) {
    logger.error('Get preference error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const { language, theme } = req.body;
    await query(
      `INSERT INTO user_preferences (user_id, language, theme)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET language = COALESCE($2, user_preferences.language), theme = COALESCE($3, user_preferences.theme), updated_at = NOW()`,
      [req.user.id, language || null, theme || null]
    );
    res.json({ success: true, message: 'Preferences saved' });
  } catch (err) {
    logger.error('Save preference error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
