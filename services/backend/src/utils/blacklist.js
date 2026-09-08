import { query } from '../config/database.js';
import logger from './logger.js';

// Returns the matching reason string if this IP/user-agent pair is blacklisted, else null.
export async function findBlacklistMatch(ipAddress, userAgent) {
  if (!ipAddress && !userAgent) return null;
  const rows = await query(
    `SELECT reason FROM device_blacklist
     WHERE is_active = TRUE AND (ip_address = $1 OR user_agent = $2)
     LIMIT 1`,
    [ipAddress || null, userAgent || null]
  );
  return rows.length ? (rows[0].reason || 'Device blacklisted') : null;
}

const AUTO_BLACKLIST_THRESHOLD = 5;       // failed/blocked login attempts...
const AUTO_BLACKLIST_WINDOW_MINUTES = 15; // ...from one IP within this window auto-blocks it

// Auto-blacklists an IP after repeated failed/blocked login attempts, so a
// brute-force run gets shut out on its own instead of sitting in the Security
// page waiting for a superadmin to notice and click "Blacklist Device" by hand.
// Called from the login route for failure reasons that indicate credential
// guessing (unknown email, wrong password) — not e.g. a deactivated account,
// which isn't attacker behaviour.
//
// Counts *prior* attempts only, not the one currently being logged: logAction
// is fire-and-forget (deferred, not awaited), so a DB query run right after
// calling it could race the insert and undercount by one. Triggering on
// "N-1 prior attempts already happened" instead means the Nth attempt itself
// is always the one that trips the block, regardless of that write's timing.
export async function maybeAutoBlacklistIp(ipAddress) {
  if (!ipAddress) return;
  try {
    const already = await findBlacklistMatch(ipAddress, null);
    if (already) return;

    const rows = await query(
      `SELECT COUNT(*)::int AS n FROM audit_log
       WHERE ip_address = $1
         AND action IN ('login_failed', 'login_blocked')
         AND created_at > NOW() - make_interval(mins => $2)`,
      [ipAddress, AUTO_BLACKLIST_WINDOW_MINUTES]
    );
    const priorCount = rows[0]?.n || 0;
    if (priorCount < AUTO_BLACKLIST_THRESHOLD - 1) return;

    await query(
      `INSERT INTO device_blacklist (ip_address, reason, blacklisted_by, is_active)
       VALUES ($1, $2, NULL, TRUE)`,
      [ipAddress, `Auto-blocked: ${priorCount + 1} failed/blocked login attempts within ${AUTO_BLACKLIST_WINDOW_MINUTES} minutes`]
    );
    logger.warn(`Auto-blacklisted IP after repeated login failures: ${ipAddress}`);
  } catch (err) {
    // Never let the auto-blacklist check break the login flow itself
    logger.warn('Auto-blacklist check failed:', err.message);
  }
}
