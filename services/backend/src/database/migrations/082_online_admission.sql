-- Migration 082: Online Admission Module
-- Genuinely new -- no applicant/application concept existed anywhere in the
-- schema before this (students.admission_number is an enrolled-student
-- field, unrelated). application_number is scoped UNIQUE(tenant_id, ...)
-- from the start, matching the fix already applied to pr_number and
-- asset_tag earlier this session -- no separate cleanup migration needed.
--
-- CAUTION for future migration authors: this repo's migration runner splits
-- each file on every literal semicolon character, including ones inside
-- double-dash comments. Do not use semicolons in prose within comments here.

CREATE TABLE IF NOT EXISTS admission_settings (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  application_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_open                BOOLEAN NOT NULL DEFAULT TRUE,
  academic_year          VARCHAR(9),
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admission_applications (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  application_number     VARCHAR(30) NOT NULL,

  first_name             VARCHAR(100) NOT NULL,
  last_name              VARCHAR(100) NOT NULL,
  date_of_birth          DATE,
  gender                 VARCHAR(10) CHECK (gender IN ('male','female','other')),
  education_level        VARCHAR(30),
  previous_school        VARCHAR(200),

  guardian_name          VARCHAR(150) NOT NULL,
  guardian_phone         VARCHAR(20) NOT NULL,
  guardian_email         VARCHAR(150),
  guardian_relationship  VARCHAR(30),

  documents              JSONB DEFAULT '[]',

  status                 VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN (
                            'submitted','document_review','fee_pending','fee_paid',
                            'interview_scheduled','interviewed','offered','rejected',
                            'enrolled','withdrawn'
                          )),
  document_verified_at   TIMESTAMPTZ,
  document_verified_by   UUID REFERENCES users(id) ON DELETE SET NULL,

  metadata               JSONB DEFAULT '{}',

  interview_date         DATE,
  interview_time         VARCHAR(10),
  interview_venue        VARCHAR(150),
  interviewer_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  interview_notes        TEXT,

  decision                VARCHAR(20) DEFAULT 'pending' CHECK (decision IN ('pending','offered','rejected')),
  decision_notes          TEXT,
  decided_by              UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at               TIMESTAMPTZ,

  enrolled_student_id    UUID REFERENCES students(id) ON DELETE SET NULL,

  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, application_number)
);

CREATE INDEX IF NOT EXISTS idx_admission_apps_tenant   ON admission_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admission_apps_status    ON admission_applications(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_admission_apps_enrolled  ON admission_applications(enrolled_student_id);
