import cron from 'node-cron';
import logger from '../utils/logger.js';
import { resetDemoTenant } from '../database/seedDemoTenant.js';

/**
 * Resets the public demo tenant to a clean showcase dataset once at startup
 * (so the demo tenant/id exist before the first request) and nightly at
 * 03:00 Africa/Nairobi, so nothing a visitor did during the day persists.
 */
export function startDemoResetJob() {
  resetDemoTenant().catch(() => {}); // already logs internally

  cron.schedule('0 3 * * *', () => {
    resetDemoTenant().catch(() => {});
  }, { timezone: 'Africa/Nairobi' });

  logger.info('Demo tenant reset job scheduled (nightly 03:00 Africa/Nairobi)');
}
