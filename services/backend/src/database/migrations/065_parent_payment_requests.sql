-- Migration 065: Parent payment requests
-- Parents submit payment proof; admin confirms/rejects before balance is updated

-- Extend fee_payments status to include pending_confirmation and rejected
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'fee_payments'::regclass AND contype = 'c'
    AND conname ILIKE '%status%'
  LIMIT 1;

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE fee_payments DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE fee_payments
  ADD CONSTRAINT fee_payments_status_check
  CHECK (status IN ('success', 'pending', 'failed', 'refunded', 'pending_confirmation', 'rejected'));

-- Track who submitted and who confirmed each payment
ALTER TABLE fee_payments
  ADD COLUMN IF NOT EXISTS submitted_by      UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS confirmed_by      UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS parent_message    TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_note TEXT;

-- Fast lookup of pending requests per tenant
CREATE INDEX IF NOT EXISTS idx_fee_payments_pending
  ON fee_payments (tenant_id, status)
  WHERE status = 'pending_confirmation';
