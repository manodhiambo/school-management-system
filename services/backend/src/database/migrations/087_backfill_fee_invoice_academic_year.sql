-- Backfills fee_invoices.academic_year where it was never set (the single
-- POST /fee/invoice endpoint historically omitted this column entirely),
-- deriving it from the invoice's own due_date/created_at. The Financial
-- Report endpoints (Fee Collection, Defaulters) filter by academic_year, so
-- these rows were previously invisible to every year's report even though
-- the reports themselves now also tolerate NULL as a defensive fallback.
UPDATE fee_invoices
SET academic_year = EXTRACT(YEAR FROM COALESCE(due_date, created_at, CURRENT_DATE))::text
WHERE academic_year IS NULL;
