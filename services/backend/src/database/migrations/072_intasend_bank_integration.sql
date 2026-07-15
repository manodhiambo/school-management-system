-- Migration 072: IntaSend bank/payment aggregator integration
-- Lets a school connect an IntaSend account so parent bank-transfer/card payments
-- auto-reflect on fee_invoices/fee_payments, the same way M-Pesa STK push already
-- does. One config row per tenant, following the whatsapp_config precedent
-- (migration 058) but with secrets encrypted at rest via utils/encryption.js —
-- unlike whatsapp_config's plaintext access_token, these are financial credentials.

CREATE TABLE IF NOT EXISTS intasend_config (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  publishable_key             TEXT,
  secret_key_encrypted        TEXT,
  webhook_challenge_encrypted TEXT,
  is_enabled                  BOOLEAN DEFAULT FALSE,
  is_test_mode                BOOLEAN DEFAULT TRUE,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- Same shape as migration 044 — add 'intasend' as an accepted payment method.
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_payment_method_check;
ALTER TABLE fee_payments
  ADD CONSTRAINT fee_payments_payment_method_check
  CHECK (payment_method IN (
    'cash', 'cheque', 'card', 'upi', 'net_banking',
    'wallet', 'mpesa', 'bank_transfer', 'other',
    'coop_bus_bank', 'coop_bus_paybill', 'fee_paybill', 'fee_bank_account',
    'intasend'
  ));

-- Index used by the webhook handler to look up an invoice by IntaSend's own
-- invoice id, mirroring the existing mpesa_checkout_id index (migration 063).
CREATE INDEX IF NOT EXISTS idx_fee_invoices_intasend_invoice_id
  ON fee_invoices ((metadata->>'intasend_invoice_id'))
  WHERE metadata->>'intasend_invoice_id' IS NOT NULL;
