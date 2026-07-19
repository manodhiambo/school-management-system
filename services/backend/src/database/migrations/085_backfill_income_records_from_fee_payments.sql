-- Backfill income_records for fee_payments that were recorded before every
-- payment channel (M-Pesa callback, IntaSend webhook) mirrored into
-- income_records. Without this, the Finance Dashboard totals (which sum
-- income_records) undercount or read zero even though fee_payments has the
-- real transactions. Idempotent: uses the same 'INC-FEE-<fee_payments.id>'
-- dedup key already established by migration 015, so payments already
-- migrated or already mirrored by the app are skipped.
INSERT INTO income_records (
    tenant_id, income_number, income_date, income_category,
    student_id, amount, vat_rate, vat_amount, total_amount,
    payment_method, payment_reference, description, status, created_by
)
SELECT
    fp.tenant_id,
    CONCAT('INC-FEE-', fp.id),
    COALESCE(fp.payment_date::date, CURRENT_DATE),
    'Student Fees',
    fp.student_id,
    fp.amount,
    0,
    0,
    fp.amount,
    fp.payment_method,
    COALESCE(fp.receipt_number, fp.transaction_id),
    'Fee payment (backfilled)',
    'completed',
    fp.collected_by
FROM fee_payments fp
WHERE fp.status IN ('success', 'completed')
  AND fp.tenant_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM income_records ir WHERE ir.income_number = CONCAT('INC-FEE-', fp.id)
  );
