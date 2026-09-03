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
 * Auto-suspends tenants whose KSh 50,000 registration balance wasn't paid
 * within 5 days of their deposit (balance_due_at, set when the deposit
 * payment succeeds — see schoolRegistrationRoutes.js POST /mpesa/callback).
 * They were approved by a superadmin and had live access during that window.
 */
export async function expireUnpaidBalances() {
  try {
    const expired = await query(
      `UPDATE tenants
       SET status = 'suspended', suspended_at = NOW(), updated_at = NOW()
       WHERE status = 'active'
         AND deposit_paid = true
         AND balance_paid = false
         AND balance_due_at IS NOT NULL
         AND balance_due_at < NOW()
       RETURNING id, school_name`
    );

    for (const tenant of expired) {
      logger.warn(`Auto-suspended tenant (registration balance unpaid): ${tenant.school_name} (${tenant.id})`);
      await notifyCompanyOfSuspension(tenant, 'KSh 50,000 registration balance not paid within 5 days of deposit');
    }

    return expired.length;
  } catch (err) {
    logger.error('expireUnpaidBalances job failed:', err.message);
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
  // expireEndedTrials() is legacy — free self-serve trials were removed in
  // favor of the deposit + review flow, but it stays as a safety net for any
  // stray tenant still in status='trial'.
  expireEndedTrials();
  expireUnpaidBalances();
  expireEndedSubscriptions();

  // Then re-check every 15 minutes.
  cron.schedule('*/15 * * * *', () => {
    expireEndedTrials();
    expireUnpaidBalances();
    expireEndedSubscriptions();
  });

  logger.info('Tenant expiry job scheduled (trial + unpaid balance + subscription, every 15 minutes)');
}
