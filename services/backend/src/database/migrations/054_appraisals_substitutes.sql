-- Migration 054: Staff Appraisals + Substitute Teachers

CREATE TABLE IF NOT EXISTS appraisal_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,
  criteria    JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_appraisals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appraiser_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  template_id     UUID REFERENCES appraisal_templates(id) ON DELETE SET NULL,
  period          VARCHAR(50) NOT NULL,
  scores          JSONB DEFAULT '{}',
  total_score     NUMERIC(5,2) DEFAULT 0,
  max_score       NUMERIC(5,2) DEFAULT 100,
  grade           VARCHAR(10),
  comments        TEXT,
  status          VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','submitted','acknowledged')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appraisals_tenant ON staff_appraisals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appraisals_staff  ON staff_appraisals(staff_id);

-- Substitute Teachers
CREATE TABLE IF NOT EXISTS substitute_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  absent_teacher   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  substitute       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id         UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id       UUID REFERENCES subjects(id) ON DELETE SET NULL,
  assignment_date  DATE NOT NULL,
  period           VARCHAR(50),
  reason           TEXT,
  status           VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_substitutes_tenant ON substitute_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_substitutes_date   ON substitute_assignments(assignment_date);
