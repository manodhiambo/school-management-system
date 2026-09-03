-- Replaces the free-trial self-registration flow with a mandatory deposit +
-- balance + manual-approval flow.
--
-- New tenant lifecycle for schools registering from now on:
--   pending_deposit  -> school submitted the form, admin login is inactive,
--                       waiting for the KSh 50,000 deposit to be paid via M-Pesa.
--   pending_review   -> deposit paid; balance_due_at = deposit_paid_at + 5 days;
--                       waiting for a superadmin to manually approve or reject
--                       (registration_number + a real deposit payment are the
--                       anti-abuse gate, approval is the human check on top).
--   active           -> superadmin approved; admin login enabled. If the
--                       KSh 50,000 balance isn't paid by balance_due_at, the
--                       tenantExpiryJob auto-suspends the tenant.
--   suspended        -> rejected by superadmin, or balance/renewal unpaid.
--
-- Existing tenants are NOT touched by this migration — it only adds columns
-- and loosens the status CHECK constraint. Converting existing status='trial'
-- tenants onto this new flow (excluding the paid schools and the demo tenant)
-- is a separate, reviewable step: see src/scripts/convertLegacyTrialTenants.js.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 50000;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(12,2) NOT NULL DEFAULT 50000;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS balance_paid BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS balance_paid_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS balance_due_at TIMESTAMPTZ;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'not_required';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_review_status_check'
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_review_status_check
      CHECK (review_status IN ('not_required', 'pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Widen the tenants.status CHECK constraint to include the two new pending
-- states, whatever its current (undocumented / possibly drifted) name is.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'tenants'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE tenants DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE tenants ADD CONSTRAINT tenants_status_check
  CHECK (status IN (
    'pending_deposit', 'pending_review',
    'trial', 'active', 'suspended', 'expired', 'cancelled'
  ));
