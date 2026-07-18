import cron from 'node-cron';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Auto-suspends tenants whose trial period has ended.
 * Previously this required a superadmin to manually click "Suspend" —
 * tenants stayed in status='trial' (and kept full access blocked only
 * at the request layer) indefinitely otherwise.
 */
export async function expireEndedTrials() {
  try {
    const expired = await query(
      `UPDATE tenants
       SET status = 'suspended', suspended_at = NOW(), updated_at = NOW()
       WHERE status = 'trial' AND trial_ends_at IS NOT NULL AND trial_ends_at < NOW()
       RETURNING id, school_name`
    );

    if (expired.length > 0) {
      logger.warn(
        `Auto-suspended ${expired.length} tenant(s) with ended trials: ` +
        expired.map(t => `${t.school_name} (${t.id})`).join(', ')
      );
    }

    return expired.length;
  } catch (err) {
    logger.error('expireEndedTrials job failed:', err.message);
    return 0;
  }
}

export function startTrialExpiryJob() {
  // Catch anything that expired while the server was down.
  expireEndedTrials();

  // Then re-check every 15 minutes.
  cron.schedule('*/15 * * * *', () => {
    expireEndedTrials();
  });

  logger.info('Trial expiry job scheduled (every 15 minutes)');
}
