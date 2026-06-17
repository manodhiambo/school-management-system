import { query } from '../config/database.js';

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
