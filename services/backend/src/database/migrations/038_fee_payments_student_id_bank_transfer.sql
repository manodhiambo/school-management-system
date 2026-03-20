-- Migration 038: Add student_id to fee_payments + expand payment_method constraint
-- Fixes:
-- 1. fee_payments missing student_id column (student-only payments fail)
-- 2. payment_method CHECK doesn't include 'bank_transfer' (bank transfer payments rejected)

-- 1. Add student_id column so payments can be recorded without an invoice
ALTER TABLE fee_payments
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);

-- 2. Drop and recreate payment_method CHECK to include bank_transfer
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_payment_method_check;

ALTER TABLE fee_payments
  ADD CONSTRAINT fee_payments_payment_method_check
  CHECK (payment_method IN (
    'cash', 'cheque', 'card', 'upi', 'net_banking',
    'wallet', 'mpesa', 'bank_transfer', 'other'
  ));
