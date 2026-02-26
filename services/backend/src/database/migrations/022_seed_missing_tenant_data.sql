-- Migration 022: Fix academic_years global unique constraint + seed missing tenant data
-- Safe to re-run: uses IF NOT EXISTS, WHERE NOT EXISTS, and ON CONFLICT guards
--
-- Problem: Registration only creates tenant + admin user. Modules that require
-- academic_year, financial_year, or settings to exist are broken for new tenants.
-- Also: academic_years.year had a global UNIQUE that breaks multi-tenancy.

-- ============================================================
-- STEP 1: Fix academic_years unique constraint to be per-tenant
-- Global UNIQUE(year) means two schools cannot share a year string (e.g. "2026").
-- Replace with a composite unique across (year, tenant_id).
-- ============================================================
ALTER TABLE academic_years DROP CONSTRAINT IF EXISTS academic_years_year_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_year_tenant
  ON academic_years (year, tenant_id);

-- ============================================================
-- STEP 2: Seed academic_years for tenants that have none
-- ============================================================
INSERT INTO academic_years (tenant_id, year, start_date, end_date, is_current)
SELECT
  t.id,
  '2026',
  '2026-01-01',
  '2026-12-31',
  true
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM academic_years ay WHERE ay.tenant_id = t.id
)
AND t.status IN ('active', 'trial');

-- ============================================================
-- STEP 3: Seed financial_years for tenants that have none
-- Links to the tenant's current academic year.
-- ============================================================
INSERT INTO financial_years
  (tenant_id, academic_year_id, year_name, start_date, end_date, status, is_current, is_active)
SELECT
  ay.tenant_id,
  ay.id,
  ay.year,
  ay.start_date,
  ay.end_date,
  'active',
  true,
  true
FROM academic_years ay
WHERE ay.is_current = true
  AND ay.tenant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM financial_years fy WHERE fy.tenant_id = ay.tenant_id
  )
ON CONFLICT (academic_year_id) DO NOTHING;

-- ============================================================
-- STEP 4: Seed settings for tenants that have none
-- Pulls school_name, school_code, email, phone from tenants table.
-- ============================================================
INSERT INTO settings
  (tenant_id, school_name, school_code, email, phone,
   current_academic_year, timezone, currency, date_format, time_format)
SELECT
  t.id,
  t.school_name,
  t.school_code,
  t.email,
  t.phone,
  '2026',
  'Africa/Nairobi',
  'KES',
  'DD/MM/YYYY',
  '12'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM settings s WHERE s.tenant_id = t.id
)
AND t.status IN ('active', 'trial');
