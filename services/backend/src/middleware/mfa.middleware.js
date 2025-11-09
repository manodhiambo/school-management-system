const { query } = require('../config/database');
const logger = require('../utils/logger');

const mfaMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const [user] = await query(
      'SELECT mfa_enabled FROM users WHERE id = ?',
      [req.user.id]
    );

    if (user.mfa_enabled && !req.headers['x-mfa-verified']) {
      return res.status(403).json({ 
        success: false, 
        message: 'MFA verification required for this action',
        mfa_required: true 
      });
    }

    next();
  } catch (error) {
    logger.error('MFA middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'MFA check failed' 
    });
  }
};

module.exports = { mfaMiddleware };
