import cron from 'node-cron';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import { sendEmail } from '../services/emailService.js';
import { sendSMSViaProvider, normalisePhone } from '../routes/smsRoutes.js';

const NOTIFY_EMAIL = 'info@helvino.org';
const NOTIFY_PHONE = normalisePhone('0110421320');

async function notifyCompanyOfSuspension(tenant, reason) {
  const suspendedAt = new Date().toISOString();

  try {
    await sendEmail(NOTIFY_EMAIL, 'tenantSuspended', {
      schoolName: tenant.school_name,
      tenantId: tenant.id,
      reason,
      suspendedAt,
    });
  } catch (err) {
    logger.error('Failed to email tenant-suspension notice:', err.message);
  }

  try {
    await sendSMSViaProvider(
      NOTIFY_PHONE,
      `SkulManager: "${tenant.school_name}" was auto-suspended (${reason}). Awaiting payment before reactivation.`
    );
  } catch (err) {
    logger.error('Failed to SMS tenant-suspension notice:', err.message);
  }
}

/**
 * Auto-suspends tenants whose free trial has ended.
 * Previously this required a superadmin to manually click "Suspend" —
 * tenants stayed in status='trial' indefinitely otherwise, with access
 * only blocked (not reflected in status) at the request layer.
 */
export async function expireEndedTrials() {
  try {
    const expired = await query(
      `UPDATE tenants
       SET status = 'suspended', suspended_at = NOW(), updated_at = NOW()
       WHERE status = 'trial' AND trial_ends_at IS NOT NULL AND trial_ends_at < NOW()
       RETURNING id, school_name`
    );

    for (const tenant of expired) {
      logger.warn(`Auto-suspended tenant (trial ended): ${tenant.school_name} (${tenant.id})`);
      await notifyCompanyOfSuspension(tenant, 'free trial ended');
    }

    return expired.length;
  } catch (err) {
    logger.error('expireEndedTrials job failed:', err.message);
    return 0;
  }
}

/**
 * Auto-suspends tenants whose paid (annual) subscription has ended without
 * renewal — they must stay suspended until payment is confirmed and a
 * superadmin reactivates them.
 */
export async function expireEndedSubscriptions() {
  try {
    const expired = await query(
      `UPDATE tenants
       SET status = 'suspended', suspended_at = NOW(), updated_at = NOW()
       WHERE status = 'active' AND subscription_ends_at IS NOT NULL AND subscription_ends_at < NOW()
       RETURNING id, school_name`
    );

    for (const tenant of expired) {
      logger.warn(`Auto-suspended tenant (subscription ended): ${tenant.school_name} (${tenant.id})`);
      await notifyCompanyOfSuspension(tenant, 'annual subscription ended without payment');
    }

    return expired.length;
  } catch (err) {
    logger.error('expireEndedSubscriptions job failed:', err.message);
    return 0;
  }
}

export function startTenantExpiryJob() {
  // Catch anything that expired while the server was down.
  expireEndedTrials();
  expireEndedSubscriptions();

  // Then re-check every 15 minutes.
  cron.schedule('*/15 * * * *', () => {
    expireEndedTrials();
    expireEndedSubscriptions();
  });

  logger.info('Tenant expiry job scheduled (trial + subscription, every 15 minutes)');
}
