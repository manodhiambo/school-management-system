-- Migration 021: Backfill tenant_id in finance tables + fix unique constraints for multi-tenancy
-- Safe to re-run: uses IF NOT EXISTS and WHERE tenant_id IS NULL guards
--
-- Root cause: Migration 020 added tenant_id columns to finance tables but never backfilled
-- existing data. All pre-020 rows have tenant_id = NULL, so finance module returns empty
-- results when querying WHERE tenant_id = $1.

-- ============================================================
-- STEP 1: Add is_active to financial_years if missing
-- (controller uses is_active but migration 014 only defined is_current)
-- ============================================================
ALTER TABLE financial_years ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Set is_active based on status for existing rows
UPDATE financial_years SET is_active = (status = 'active') WHERE is_active IS NULL;

-- ============================================================
-- STEP 2: Fix unique constraints to be per-tenant
-- Global UNIQUE breaks multi-tenancy: multiple tenants can't
-- have the same account_code or setting_key.
-- ============================================================

-- chart_of_accounts: drop global unique on account_code, add per-tenant unique
ALTER TABLE chart_of_accounts DROP CONSTRAINT IF EXISTS chart_of_accounts_account_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_coa_account_code_tenant
  ON chart_of_accounts (account_code, tenant_id);

-- finance_settings: drop global unique on setting_key, add per-tenant unique
ALTER TABLE finance_settings DROP CONSTRAINT IF EXISTS finance_settings_setting_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_settings_key_tenant
  ON finance_settings (setting_key, tenant_id);

-- ============================================================
-- STEP 3: Backfill academic_years tenant_id
-- (needed so financial_years can backfill via academic_year_id join)
-- academic_years got tenant_id in migration 020 but was never backfilled
-- academic_years has no created_by, so use oldest active tenant directly
-- ============================================================
UPDATE academic_years SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
) WHERE tenant_id IS NULL;

-- ============================================================
-- STEP 4: Backfill chart_of_accounts
-- ============================================================

-- User-created accounts (via created_by → user → tenant)
UPDATE chart_of_accounts coa SET tenant_id = u.tenant_id
  FROM users u
  WHERE coa.created_by = u.id
    AND coa.tenant_id IS NULL
    AND u.tenant_id IS NOT NULL;

-- System accounts (is_system_account = true, no created_by) → oldest active tenant
-- These are the default seeded accounts (1000, 2000, etc.)
UPDATE chart_of_accounts SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
) WHERE tenant_id IS NULL;

-- ============================================================
-- STEP 5: Backfill financial_years
-- ============================================================

-- Via academic_year_id join
UPDATE financial_years fy SET tenant_id = ay.tenant_id
  FROM academic_years ay
  WHERE fy.academic_year_id = ay.id
    AND fy.tenant_id IS NULL
    AND ay.tenant_id IS NOT NULL;

-- Fallback: remaining → oldest active tenant
UPDATE financial_years SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
) WHERE tenant_id IS NULL;

-- ============================================================
-- STEP 6: Backfill vendors
-- ============================================================
UPDATE vendors v SET tenant_id = u.tenant_id
  FROM users u
  WHERE v.created_by = u.id
    AND v.tenant_id IS NULL
    AND u.tenant_id IS NOT NULL;

UPDATE vendors SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
) WHERE tenant_id IS NULL;

-- ============================================================
-- STEP 7: Backfill bank_accounts
-- ============================================================
UPDATE bank_accounts ba SET tenant_id = u.tenant_id
  FROM users u
  WHERE ba.created_by = u.id
    AND ba.tenant_id IS NULL
    AND u.tenant_id IS NOT NULL;

UPDATE bank_accounts SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
) WHERE tenant_id IS NULL;

-- ============================================================
-- STEP 8: Backfill income_records
-- (primary: via created_by; secondary: via student_id)
-- ============================================================
UPDATE income_records ir SET tenant_id = u.tenant_id
  FROM users u
  WHERE ir.created_by = u.id
    AND ir.tenant_id IS NULL
    AND u.tenant_id IS NOT NULL;

UPDATE income_records ir SET tenant_id = s.tenant_id
  FROM students s
  WHERE ir.student_id = s.id
    AND ir.tenant_id IS NULL
    AND s.tenant_id IS NOT NULL;

UPDATE income_records SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
) WHERE tenant_id IS NULL;

-- ============================================================
-- STEP 9: Backfill expense_records
-- ============================================================
UPDATE expense_records er SET tenant_id = u.tenant_id
  FROM users u
  WHERE er.created_by = u.id
    AND er.tenant_id IS NULL
    AND u.tenant_id IS NOT NULL;

UPDATE expense_records SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
) WHERE tenant_id IS NULL;

-- ============================================================
-- STEP 10: Backfill bank_transactions (via bank_account_id)
-- ============================================================
UPDATE bank_transactions bt SET tenant_id = ba.tenant_id
  FROM bank_accounts ba
  WHERE bt.bank_account_id = ba.id
    AND bt.tenant_id IS NULL
    AND ba.tenant_id IS NOT NULL;

-- Via created_by
UPDATE bank_transactions bt SET tenant_id = u.tenant_id
  FROM users u
  WHERE bt.created_by = u.id
    AND bt.tenant_id IS NULL
    AND u.tenant_id IS NOT NULL;

UPDATE bank_transactions SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
) WHERE tenant_id IS NULL;

-- ============================================================
-- STEP 11: Backfill petty_cash
-- ============================================================
UPDATE petty_cash pc SET tenant_id = u.tenant_id
  FROM users u
  WHERE pc.created_by = u.id
    AND pc.tenant_id IS NULL
    AND u.tenant_id IS NOT NULL;

UPDATE petty_cash SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
) WHERE tenant_id IS NULL;

-- ============================================================
-- STEP 12: Backfill assets
-- ============================================================
UPDATE assets a SET tenant_id = u.tenant_id
  FROM users u
  WHERE a.created_by = u.id
    AND a.tenant_id IS NULL
    AND u.tenant_id IS NOT NULL;

UPDATE assets SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
) WHERE tenant_id IS NULL;

-- ============================================================
-- STEP 13: Backfill finance_settings (seeded records have no created_by)
-- ============================================================
UPDATE finance_settings SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
) WHERE tenant_id IS NULL;

-- ============================================================
-- STEP 14: Backfill budgets + budget_items
-- ============================================================
UPDATE budgets b SET tenant_id = u.tenant_id
  FROM users u
  WHERE b.created_by = u.id
    AND b.tenant_id IS NULL
    AND u.tenant_id IS NOT NULL;

UPDATE budgets SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
) WHERE tenant_id IS NULL;

UPDATE budget_items bi SET tenant_id = b.tenant_id
  FROM budgets b
  WHERE bi.budget_id = b.id
    AND bi.tenant_id IS NULL
    AND b.tenant_id IS NOT NULL;

UPDATE budget_items SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
) WHERE tenant_id IS NULL;

-- ============================================================
-- STEP 15: Backfill purchase_orders + purchase_order_items
-- ============================================================
UPDATE purchase_orders po SET tenant_id = u.tenant_id
  FROM users u
  WHERE po.created_by = u.id
    AND po.tenant_id IS NULL
    AND u.tenant_id IS NOT NULL;

UPDATE purchase_orders SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
) WHERE tenant_id IS NULL;

UPDATE purchase_order_items poi SET tenant_id = po.tenant_id
  FROM purchase_orders po
  WHERE poi.po_id = po.id
    AND poi.tenant_id IS NULL
    AND po.tenant_id IS NOT NULL;

UPDATE purchase_order_items SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
) WHERE tenant_id IS NULL;

-- ============================================================
-- STEP 16: Backfill general settings table
-- ============================================================
UPDATE settings SET tenant_id = (
  SELECT id FROM tenants WHERE status IN ('active', 'trial') ORDER BY created_at LIMIT 1
) WHERE tenant_id IS NULL;

-- ============================================================
-- STEP 17: Add requireActiveTenant-compatible 'trial' status check
-- The tenants.status CHECK may not include 'trial' — add it if needed
-- ============================================================
DO $$
BEGIN
  ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_status_check;
  ALTER TABLE tenants ADD CONSTRAINT tenants_status_check
    CHECK (status IN ('pending', 'trial', 'active', 'suspended', 'expired'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
