-- Migration 044: Expand payment_method constraint to include all Kenya payment channels
-- Fixes: Only 'cash' works; coop_bus_bank, coop_bus_paybill, fee_paybill, fee_bank_account fail

-- Drop any existing payment_method check constraint
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_payment_method_check;
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_payment_method_fkey;

-- Re-create with all accepted methods including Kenya-specific channels
ALTER TABLE fee_payments
  ADD CONSTRAINT fee_payments_payment_method_check
  CHECK (payment_method IN (
    'cash', 'cheque', 'card', 'upi', 'net_banking',
    'wallet', 'mpesa', 'bank_transfer', 'other',
    'coop_bus_bank', 'coop_bus_paybill', 'fee_paybill', 'fee_bank_account'
  ));
