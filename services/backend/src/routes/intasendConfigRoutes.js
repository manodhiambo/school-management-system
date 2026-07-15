import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { saveConfig, getConfigForDisplay } from '../services/intasendService.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.use(authenticate);

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  next();
}

// GET /api/v1/settings/intasend-config — masked, never returns raw secrets
router.get('/', adminOnly, async (req, res) => {
  try {
    const data = await getConfigForDisplay(req.user.tenant_id);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Get IntaSend config error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/settings/intasend-config — create/update; blank secret fields leave the stored value unchanged
router.put('/', adminOnly, async (req, res) => {
  try {
    const { publishable_key, secret_key, webhook_challenge, is_enabled, is_test_mode } = req.body;
    await saveConfig(req.user.tenant_id, {
      publishableKey: publishable_key,
      secretKey: secret_key,
      webhookChallenge: webhook_challenge,
      isEnabled: is_enabled,
      isTestMode: is_test_mode,
    });
    const data = await getConfigForDisplay(req.user.tenant_id);
    res.json({ success: true, message: 'IntaSend configuration saved', data });
  } catch (err) {
    logger.error('Update IntaSend config error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
