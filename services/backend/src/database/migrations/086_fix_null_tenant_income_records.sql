-- Fixes income_records rows left with tenant_id = NULL by the original
-- migration 015 (which predated multi-tenancy and never set tenant_id) and
-- never backfilled by migration 021's created_by/student_id lookups. These
-- NULL-tenant rows are invisible to every tenant's Finance Dashboard (which
-- filters WHERE tenant_id = $1), so real historical fee income was still
-- undercounted even after migration 085's backfill — 085's dedup check
-- treated these as "already present" for the same fee_payments and skipped
-- creating a properly tenant-scoped replacement.
UPDATE income_records ir
SET tenant_id = fp.tenant_id
FROM fee_payments fp
WHERE ir.income_number = CONCAT('INC-FEE-', fp.id)
  AND ir.tenant_id IS NULL
  AND fp.tenant_id IS NOT NULL;
