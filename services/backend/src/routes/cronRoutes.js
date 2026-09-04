import express from 'express';
import logger from '../utils/logger.js';
import { expireEndedTrials, expireUnpaidBalances, expireEndedSubscriptions } from '../jobs/tenantExpiryJob.js';
import { sendUpcomingPeriodReminders } from '../jobs/periodReminderJob.js';
import { resetDemoTenant } from '../database/seedDemoTenant.js';
import { runMigrations } from '../database/runMigrations.js';

const router = express.Router();

// Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET` when
// a CRON_SECRET env var is set on the project — this rejects any other
// caller from triggering these (SMS-sending, tenant-suspending) endpoints.
// In non-production (no CRON_SECRET set), allow through for local testing.
function requireCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return next();
  if (req.headers.authorization === `Bearer ${secret}`) return next();
  return res.status(401).json({ success: false, message: 'Unauthorized' });
}

router.use(requireCronSecret);

router.all('/tenant-expiry', async (req, res) => {
  const [trials, balances, subs] = await Promise.all([
    expireEndedTrials(),
    expireUnpaidBalances(),
    expireEndedSubscriptions(),
  ]);
  res.json({ success: true, expired: { trials, balances, subs } });
});

router.all('/period-reminders', async (req, res) => {
  const sent = await sendUpcomingPeriodReminders();
  res.json({ success: true, sent });
});

router.all('/demo-reset', async (req, res) => {
  await resetDemoTenant(true).catch(err => logger.error('demo-reset cron failed:', err.message));
  res.json({ success: true });
});

// Not scheduled — a deliberate, manually-triggered deploy step. On Vercel
// there's no persistent process to run migrations at boot (see server.js),
// so this is the equivalent of the old "runs once when the server starts"
// behavior, invoked on purpose after a deploy that adds new migration files.
// Reuses the same CRON_SECRET auth as the scheduled jobs above.
router.all('/run-migrations', async (req, res) => {
  await runMigrations();
  res.json({ success: true });
});

export default router;
