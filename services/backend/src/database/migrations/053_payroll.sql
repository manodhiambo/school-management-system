-- Migration 053: Payroll Module

CREATE TABLE IF NOT EXISTS salary_structures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  basic_salary    NUMERIC(12,2) NOT NULL DEFAULT 0,
  house_allowance NUMERIC(12,2) DEFAULT 0,
  transport_allow NUMERIC(12,2) DEFAULT 0,
  medical_allow   NUMERIC(12,2) DEFAULT 0,
  other_allowance NUMERIC(12,2) DEFAULT 0,
  nssf_rate       NUMERIC(5,4) DEFAULT 0.06,
  nhif_amount     NUMERIC(10,2) DEFAULT 500,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_structures_tenant ON salary_structures(tenant_id);

CREATE TABLE IF NOT EXISTS staff_salary_assignments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  salary_structure_id UUID REFERENCES salary_structures(id) ON DELETE SET NULL,
  basic_override      NUMERIC(12,2),
  effective_from      DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_year   INT NOT NULL,
  period_month  INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  status        VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
  processed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at  TIMESTAMPTZ,
  approved_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at   TIMESTAMPTZ,
  total_gross   NUMERIC(14,2) DEFAULT 0,
  total_net     NUMERIC(14,2) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant ON payroll_runs(tenant_id);

CREATE TABLE IF NOT EXISTS payslips (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payroll_run_id      UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  basic_salary        NUMERIC(12,2) DEFAULT 0,
  house_allowance     NUMERIC(12,2) DEFAULT 0,
  transport_allow     NUMERIC(12,2) DEFAULT 0,
  medical_allow       NUMERIC(12,2) DEFAULT 0,
  other_allowance     NUMERIC(12,2) DEFAULT 0,
  gross_salary        NUMERIC(12,2) DEFAULT 0,
  paye_tax            NUMERIC(12,2) DEFAULT 0,
  nssf_deduction      NUMERIC(12,2) DEFAULT 0,
  nhif_deduction      NUMERIC(12,2) DEFAULT 0,
  other_deductions    NUMERIC(12,2) DEFAULT 0,
  net_salary          NUMERIC(12,2) DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payslips_tenant ON payslips(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payslips_run    ON payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payslips_user   ON payslips(user_id);
