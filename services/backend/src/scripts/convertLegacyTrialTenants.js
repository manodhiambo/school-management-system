// One-time, manually-run conversion: moves every tenant still sitting in the
// old free-trial flow (status='trial') onto the new deposit-payment flow
// (status='pending_deposit'), so they must pay the KSh 50,000 deposit and
// pass superadmin review like any new registration, instead of getting
// suspended by the legacy trial-expiry job.
//
// Excludes: is_demo tenants, and Almatec Kids / GOA (already-paying schools
// that must be left completely alone per business decision).
//
// Defaults to a DRY RUN — it only prints which tenants would be converted.
// Re-run with --confirm to actually apply the change.
//
// Usage:
//   node src/scripts/convertLegacyTrialTenants.js            # dry run
//   node src/scripts/convertLegacyTrialTenants.js --confirm  # apply

import { query } from '../config/database.js';

const EXCLUDE_NAME_PATTERNS = ['%almatec%', '%goa%'];

async function main() {
  const confirm = process.argv.includes('--confirm');

  const excludeClause = EXCLUDE_NAME_PATTERNS
    .map((_, i) => `school_name NOT ILIKE $${i + 1}`)
    .join(' AND ');

  const candidates = await query(
    `SELECT id, school_name, email, admin_email, status, trial_ends_at, is_demo, created_at
     FROM tenants
     WHERE status = 'trial'
       AND COALESCE(is_demo, false) = false
       AND ${excludeClause}
     ORDER BY created_at`,
    EXCLUDE_NAME_PATTERNS
  );

  if (candidates.length === 0) {
    console.log('No legacy trial tenants found to convert (excluding demo, Almatec Kids, GOA).');
    process.exit(0);
  }

  console.log(`Found ${candidates.length} tenant(s) still on the free-trial flow:\n`);
  for (const t of candidates) {
    console.log(`  - ${t.school_name}  (${t.email})  admin=${t.admin_email}  trial_ends_at=${t.trial_ends_at}  id=${t.id}`);
  }

  if (!confirm) {
    console.log('\nDRY RUN — no changes made. Review the list above, then re-run with --confirm to apply.');
    process.exit(0);
  }

  const ids = candidates.map(t => t.id);
  const updated = await query(
    `UPDATE tenants
     SET status = 'pending_deposit',
         trial_ends_at = NULL,
         deposit_paid = false,
         balance_paid = false,
         review_status = 'not_required',
         updated_at = NOW()
     WHERE id = ANY($1::uuid[])
     RETURNING id, school_name`,
    [ids]
  );

  console.log(`\nConverted ${updated.length} tenant(s) to status='pending_deposit'. They must now pay the KSh 50,000 deposit and pass superadmin review to regain access.`);
  process.exit(0);
}

main().catch(err => {
  console.error('convertLegacyTrialTenants failed:', err);
  process.exit(1);
});
