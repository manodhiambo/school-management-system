-- Migration 055: Counseling & Intervention Tracking

CREATE TABLE IF NOT EXISTS counseling_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  counselor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  session_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  session_type    VARCHAR(50) DEFAULT 'general' CHECK (session_type IN ('general','academic','behavioral','emotional','career','disciplinary','other')),
  notes           TEXT,
  follow_up_date  DATE,
  is_confidential BOOLEAN DEFAULT TRUE,
  status          VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','resolved','referred','follow-up')),
  referred_to     VARCHAR(150),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_counseling_tenant  ON counseling_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_counseling_student ON counseling_sessions(student_id);

CREATE TABLE IF NOT EXISTS student_interventions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  flagged_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  flag_type       VARCHAR(50) CHECK (flag_type IN ('academic','behavioral','attendance','emotional','health','other')),
  description     TEXT NOT NULL,
  priority        VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  action_taken    TEXT,
  resolved_at     TIMESTAMPTZ,
  is_resolved     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interventions_tenant  ON student_interventions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interventions_student ON student_interventions(student_id);
