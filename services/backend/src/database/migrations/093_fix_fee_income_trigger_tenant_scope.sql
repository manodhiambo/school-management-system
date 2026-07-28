-- Migration 093: Fix sync_fee_payment_to_income tenant scoping
-- The trigger installed by migration 088 resolves the income account via
-- `SELECT id FROM chart_of_accounts WHERE account_code = '4100' LIMIT 1`
-- with NO tenant_id filter. Every tenant has its own '4100' row (confirmed
-- live, no per-tenant duplicates), so this pick is arbitrary -- it either
-- returns NULL (if the arbitrary row belongs to a since-deleted/disabled
-- tenant setup) or, more commonly, a DIFFERENT tenant's account_id. This is
-- the actual root cause tying "record a fee payment" to inaccurate
-- Income & Expenses reporting downstream (verified live: 739 of 1351
-- income_records rows have account_id IS NULL and are silently dropped by
-- the report's INNER JOIN to chart_of_accounts).
--
-- NOTE: this file contains a dollar-quoted function body with internal
-- semicolons. This repo's migration runner naively splits files on every
-- literal semicolon, which would shred this into invalid fragments -- do
-- NOT rely on the boot-time auto-runner to apply this file. Apply it
-- manually as a single query (see accompanying apply script), then record
-- it in schema_migrations directly.

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
        WHERE account_code = '4100' AND tenant_id = NEW.tenant_id
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
            account_id = EXCLUDED.account_id,
            amount = EXCLUDED.amount,
            total_amount = EXCLUDED.total_amount,
            payment_method = EXCLUDED.payment_method,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$function$;

-- Backfill existing fee-driven income_records rows that got NULL (or a
-- wrong-tenant) account_id from the unscoped lookup, now that we can
-- re-resolve correctly per row's own tenant_id.
UPDATE income_records ir
SET account_id = coa.id
FROM chart_of_accounts coa
WHERE ir.income_number LIKE 'INC-FEE-%'
  AND coa.account_code = '4100'
  AND coa.tenant_id = ir.tenant_id
  AND (ir.account_id IS NULL OR ir.account_id != coa.id);
