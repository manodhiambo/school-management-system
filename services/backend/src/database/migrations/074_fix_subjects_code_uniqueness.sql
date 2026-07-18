-- Migration 074: Fix subjects.code to be unique per-tenant, not globally
-- Mirrors migration 027's fix for students.admission_number — the global
-- UNIQUE constraint meant two different schools couldn't both use "MAT" for
-- Mathematics. Safe to apply as-is: any existing data that already satisfies
-- global uniqueness automatically satisfies the weaker per-tenant version.

ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_code_key;

ALTER TABLE subjects ADD CONSTRAINT subjects_code_tenant_unique
  UNIQUE (tenant_id, code);
