-- =====================================================
-- MIGRATION: Convert Fee Payments to Finance Module
-- =====================================================

-- Step 1: Create Financial Years from Academic Years
INSERT INTO financial_years (academic_year_id, year_name, start_date, end_date, status, is_current)
SELECT 
    id,
    year,
    start_date,
    end_date,
    CASE WHEN is_current THEN 'active' ELSE 'closed' END,
    is_current
FROM academic_years
WHERE NOT EXISTS (
    SELECT 1 FROM financial_years WHERE academic_year_id = academic_years.id
);

-- Step 2: Migrate Fee Payments to Income Records
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
    CONCAT('INC-FEE-', fp.id),
    fp.payment_date::date,
    'fee_payment',
    (SELECT id FROM chart_of_accounts WHERE account_code = '4100' LIMIT 1),
    fp.student_id,
    'Fee Payment',
    fp.amount,
    0,
    0,
    fp.amount,
    fp.payment_method,
    fp.transaction_id,
    CONCAT('Migrated fee payment - Receipt: ', fp.receipt_number),
    'completed',
    fp.payment_date,
    fp.collected_by
FROM fee_payments fp
WHERE fp.status = 'completed'
AND NOT EXISTS (
    SELECT 1 FROM income_records WHERE income_number = CONCAT('INC-FEE-', fp.id)
);

-- Step 3: Create Journal Entries for Migrated Payments
INSERT INTO journal_entries (
    entry_number,
    entry_date,
    financial_year_id,
    reference_type,
    reference_id,
    description,
    total_debit,
    total_credit,
    status,
    posted_at,
    posted_by,
    created_by
)
SELECT 
    CONCAT('JE-', ir.id),
    ir.income_date,
    (SELECT id FROM financial_years WHERE is_current = true LIMIT 1),
    'fee_payment',
    ir.id,
    ir.description,
    ir.total_amount,
    ir.total_amount,
    'posted',
    NOW(),
    ir.created_by,
    ir.created_by
FROM income_records ir
WHERE ir.income_category = 'fee_payment'
AND ir.journal_entry_id IS NULL
AND EXISTS (SELECT 1 FROM financial_years WHERE is_current = true);

-- Step 4: Create Journal Entry Lines - Debit Cash
INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
SELECT 
    je.id,
    (SELECT id FROM chart_of_accounts WHERE account_code = '1110' LIMIT 1),
    je.total_debit,
    0,
    'Cash received from fee payment'
FROM journal_entries je
WHERE je.reference_type = 'fee_payment'
AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines WHERE journal_entry_id = je.id
);

-- Step 5: Create Journal Entry Lines - Credit Income
INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
SELECT 
    je.id,
    (SELECT id FROM chart_of_accounts WHERE account_code = '4100' LIMIT 1),
    0,
    je.total_credit,
    'Tuition fee income'
FROM journal_entries je
WHERE je.reference_type = 'fee_payment'
AND (SELECT COUNT(*) FROM journal_entry_lines WHERE journal_entry_id = je.id) = 1;

-- Step 6: Link Journal Entries back to Income Records
UPDATE income_records ir
SET journal_entry_id = (
    SELECT id FROM journal_entries 
    WHERE reference_type = 'fee_payment' 
    AND reference_id = ir.id
    LIMIT 1
)
WHERE ir.journal_entry_id IS NULL
AND ir.income_category = 'fee_payment'
AND EXISTS (
    SELECT 1 FROM journal_entries 
    WHERE reference_type = 'fee_payment' 
    AND reference_id = ir.id
);

