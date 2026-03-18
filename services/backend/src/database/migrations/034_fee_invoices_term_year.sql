-- Migration 034: Add term and academic_year to fee_invoices
-- Allows report cards to filter fees by the correct billing period
-- and ensures "outstanding" reflects only the relevant term's charges.

ALTER TABLE fee_invoices
  ADD COLUMN IF NOT EXISTS term          VARCHAR(20),
  ADD COLUMN IF NOT EXISTS academic_year VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_fee_invoices_term_year ON fee_invoices(term, academic_year);
