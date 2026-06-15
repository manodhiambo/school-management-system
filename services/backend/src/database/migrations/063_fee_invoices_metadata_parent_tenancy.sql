-- Migration 063: fee_invoices metadata column + parents tenant_id index

-- M-Pesa STK push stores CheckoutRequestID here; also used for general invoice metadata
ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Index for M-Pesa callback lookup by checkout ID
CREATE INDEX IF NOT EXISTS idx_fee_invoices_mpesa_checkout
  ON fee_invoices ((metadata->>'mpesa_checkout_id'))
  WHERE metadata->>'mpesa_checkout_id' IS NOT NULL;

-- Ensure parents.tenant_id is indexed for fast tenant-scoped lookups
CREATE INDEX IF NOT EXISTS idx_parents_tenant_id ON parents(tenant_id);
