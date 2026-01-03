-- =====================================================
-- FEE TO FINANCE INTEGRATION
-- Automatic sync of fee payments to income records
-- =====================================================

-- Step 1: Ensure Fee Income Account exists in Chart of Accounts
INSERT INTO chart_of_accounts (account_code, account_name, account_type, description, is_active)
VALUES ('4100', 'Tuition Fee Income', 'income', 'Income from student tuition fees', true)
ON CONFLICT (account_code) DO NOTHING;

-- Step 2: Create function to sync fee payment to income record
CREATE OR REPLACE FUNCTION sync_fee_payment_to_income()
RETURNS TRIGGER AS $$
DECLARE
    v_income_number VARCHAR(50);
    v_account_id INTEGER;
BEGIN
    -- Only process successful payments
    IF NEW.status = 'success' THEN
        -- Get the fee income account
        SELECT id INTO v_account_id 
        FROM chart_of_accounts 
        WHERE account_code = '4100' 
        LIMIT 1;
        
        -- Generate income number
        v_income_number := 'INC-FEE-' || NEW.id;
        
        -- Insert or update income record
        INSERT INTO income_records (
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
            v_income_number,
            COALESCE(NEW.payment_date::date, CURRENT_DATE),
            'Student Fees',
            v_account_id,
            NEW.student_id,
            'Fee Payment',
            NEW.amount,
            0, -- No VAT on education fees in Kenya
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
            amount = EXCLUDED.amount,
            total_amount = EXCLUDED.total_amount,
            payment_method = EXCLUDED.payment_method,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger on fee_payments
DROP TRIGGER IF EXISTS trigger_sync_fee_to_income ON fee_payments;
CREATE TRIGGER trigger_sync_fee_to_income
    AFTER INSERT OR UPDATE ON fee_payments
    FOR EACH ROW
    EXECUTE FUNCTION sync_fee_payment_to_income();

-- Step 4: Migrate existing fee payments to income records
INSERT INTO income_records (
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
)
SELECT
    'INC-FEE-' || fp.id,
    COALESCE(fp.payment_date::date, CURRENT_DATE),
    'Student Fees',
    (SELECT id FROM chart_of_accounts WHERE account_code = '4100' LIMIT 1),
    fp.student_id,
    'Fee Payment',
    fp.amount,
    0,
    0,
    fp.amount,
    fp.payment_method,
    COALESCE(fp.transaction_id, fp.receipt_number),
    'Fee payment - Invoice: ' || COALESCE(
        (SELECT invoice_number FROM fee_invoices WHERE id = fp.invoice_id),
        'N/A'
    ),
    'completed',
    fp.created_at,
    fp.collected_by
FROM fee_payments fp
WHERE fp.status = 'success'
ON CONFLICT (income_number) DO NOTHING;

-- Step 5: Update finance dashboard to show fee revenue
COMMENT ON COLUMN income_records.income_category IS 'Category: Student Fees, Other Income, Donations, etc.';

-- Step 6: Create view for fee collection report
CREATE OR REPLACE VIEW v_fee_collection_summary AS
SELECT
    COUNT(DISTINCT fi.id) as total_invoices,
    COUNT(DISTINCT fi.student_id) as total_students,
    COALESCE(SUM(fi.total_amount), 0) as total_billed,
    COALESCE(SUM(fi.paid_amount), 0) as total_collected,
    COALESCE(SUM(fi.balance_amount), 0) as total_outstanding,
    ROUND(
        CASE 
            WHEN SUM(fi.total_amount) > 0 
            THEN (SUM(fi.paid_amount) / SUM(fi.total_amount) * 100) 
            ELSE 0 
        END, 
        2
    ) as collection_rate,
    COUNT(CASE WHEN fi.status = 'paid' THEN 1 END) as paid_invoices,
    COUNT(CASE WHEN fi.status = 'partial' THEN 1 END) as partial_invoices,
    COUNT(CASE WHEN fi.status = 'pending' THEN 1 END) as pending_invoices,
    COUNT(CASE WHEN fi.status = 'overdue' THEN 1 END) as overdue_invoices
FROM fee_invoices fi;

-- Verify the migration
DO $$
DECLARE
    v_fee_payment_count INTEGER;
    v_income_record_count INTEGER;
    v_total_fees NUMERIC;
    v_total_income NUMERIC;
BEGIN
    SELECT COUNT(*), COALESCE(SUM(amount), 0) 
    INTO v_fee_payment_count, v_total_fees
    FROM fee_payments 
    WHERE status = 'success';
    
    SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
    INTO v_income_record_count, v_total_income
    FROM income_records 
    WHERE income_category = 'Student Fees';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FEE TO FINANCE INTEGRATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Fee Payments: % (KES %)', v_fee_payment_count, v_total_fees;
    RAISE NOTICE 'Income Records: % (KES %)', v_income_record_count, v_total_income;
    RAISE NOTICE '========================================';
END $$;
