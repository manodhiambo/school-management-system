-- Migration 064: Add payment info fields to settings table
-- These fields let admins store bank/M-Pesa details that parents can see to make manual payments

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_name            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS mpesa_paybill        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mpesa_till           VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mpesa_account_ref    VARCHAR(50);

-- Back-fill parent users that were created without tenant_id in users table
-- (parent creation was missing tenant_id in the INSERT before this fix)
UPDATE users u
SET tenant_id = p.tenant_id
FROM parents p
WHERE u.id = p.user_id
  AND u.role = 'parent'
  AND u.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;
