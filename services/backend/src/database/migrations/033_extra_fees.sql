-- Migration 033: Extra / Miscellaneous Fees
-- Allows admins to define named extra fees per class or per individual student
-- These appear on report cards and add to the fee total.

CREATE TABLE IF NOT EXISTS extra_fees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  amount          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  -- Scope: either class-level OR student-level (or both null = all students)
  class_id        UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id      UUID REFERENCES students(id) ON DELETE CASCADE,
  term            VARCHAR(20),          -- 'term1','term2','term3', NULL = every term
  academic_year   VARCHAR(10),          -- e.g. '2025', NULL = every year
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extra_fees_tenant      ON extra_fees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_extra_fees_class       ON extra_fees(class_id);
CREATE INDEX IF NOT EXISTS idx_extra_fees_student     ON extra_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_extra_fees_term        ON extra_fees(term, academic_year);
