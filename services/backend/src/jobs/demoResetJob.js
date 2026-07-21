import cron from 'node-cron';
import logger from '../utils/logger.js';
import { resetDemoTenant } from '../database/seedDemoTenant.js';

/**
 * Ensures the public demo tenant exists at startup (self-heals if missing,
 * but does NOT wipe it if it's already there — a backend restart shouldn't
 * blow away demo data) and does a full wipe-and-reseed nightly at 03:00
 * Africa/Nairobi, so nothing a visitor did during the day persists.
 */
export function startDemoResetJob() {
  resetDemoTenant(false).catch(() => {}); // already logs internally

  cron.schedule('0 3 * * *', () => {
    resetDemoTenant(true).catch(() => {});
  }, { timezone: 'Africa/Nairobi' });

  logger.info('Demo tenant reset job scheduled (nightly 03:00 Africa/Nairobi)');
}
