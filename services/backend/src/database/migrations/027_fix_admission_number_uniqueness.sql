-- Migration 027: Fix admission_number to be unique per-tenant (not globally)
-- This allows multiple schools to have STD20260001, STD20260002, etc.

-- Drop the existing global unique constraint
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_admission_number_key;

-- Add a per-tenant composite unique constraint
ALTER TABLE students ADD CONSTRAINT students_admission_number_tenant_unique
  UNIQUE (tenant_id, admission_number);
