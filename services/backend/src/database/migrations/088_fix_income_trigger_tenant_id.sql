-- The trigger_sync_fee_to_income trigger (AFTER INSERT/UPDATE on fee_payments)
-- auto-creates an income_records row for every successful payment, but the
-- function never set tenant_id — every income_records row it has ever
-- created is tenant-less and invisible to the Finance Dashboard, which
-- filters strictly by tenant_id. This is the actual, recurring root cause
-- behind "Total Income shows zero despite fee payments" (migrations
-- 085/086 only backfilled existing rows; without this fix, every new
-- successful payment — and every demo tenant reset, which re-inserts fee
-- payments — regenerates the same bug).
CREATE OR REPLACE FUNCTION public.sync_fee_payment_to_income()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_income_number VARCHAR(50);
    v_account_id INTEGER;
BEGIN
    IF NEW.status = 'success' THEN
        SELECT id INTO v_account_id
        FROM chart_of_accounts
        WHERE account_code = '4100'
        LIMIT 1;

        v_income_number := 'INC-FEE-' || NEW.id;

        INSERT INTO income_records (
            tenant_id,
            income_number,
            income_date,
            income_category,
            account_id,
            student_id,
            payer_name,
            amount,
            vat_rate,
            vat_amount,
            total_amount,
            payment_method,
            payment_reference,
            description,
            status,
            created_at,
            created_by
        ) VALUES (
            NEW.tenant_id,
            v_income_number,
            COALESCE(NEW.payment_date::date, CURRENT_DATE),
            'Student Fees',
            v_account_id,
            NEW.student_id,
            'Fee Payment',
            NEW.amount,
            0,
            0,
            NEW.amount,
            NEW.payment_method,
            COALESCE(NEW.transaction_id, NEW.receipt_number),
            'Fee payment - Invoice: ' || COALESCE(
                (SELECT invoice_number FROM fee_invoices WHERE id = NEW.invoice_id),
                'N/A'
            ),
            'completed',
            NEW.created_at,
            NEW.collected_by
        )
        ON CONFLICT (income_number) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            amount = EXCLUDED.amount,
            total_amount = EXCLUDED.total_amount,
            payment_method = EXCLUDED.payment_method,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$function$;

-- Repair every income_records row this trigger has already created with a
-- NULL tenant_id, now that fee_payments.tenant_id is available to copy from.
UPDATE income_records ir
SET tenant_id = fp.tenant_id
FROM fee_payments fp
WHERE ir.income_number = CONCAT('INC-FEE-', fp.id)
  AND ir.tenant_id IS NULL
  AND fp.tenant_id IS NOT NULL;
