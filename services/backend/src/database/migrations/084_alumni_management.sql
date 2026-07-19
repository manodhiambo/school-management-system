-- Migration 084: Alumni Management Module
-- Genuinely new -- no alumni concept existed anywhere before this. Follows
-- the same new-stakeholder-role pattern as driver/technician/security: a
-- graduate gets their own role and dashboard rather than a bolt-on to the
-- student role.
--
-- CAUTION for future migration authors: this repo's migration runner splits
-- each file on every literal semicolon character, including ones inside
-- double-dash comments. Do not use semicolons in prose within comments here.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','teacher','student','parent','finance_officer','superadmin','driver','security','technician','alumni'));

CREATE TABLE IF NOT EXISTS alumni_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  student_id          UUID REFERENCES students(id) ON DELETE SET NULL,
  first_name          VARCHAR(100) NOT NULL,
  last_name           VARCHAR(100) NOT NULL,
  graduation_year     INTEGER,
  current_occupation  VARCHAR(150),
  employer            VARCHAR(150),
  university          VARCHAR(150),
  business_details    TEXT,
  phone               VARCHAR(20),
  bio                 TEXT,
  is_mentor           BOOLEAN DEFAULT FALSE,
  is_public           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alumni_donations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  alumni_id     UUID NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
  donation_type VARCHAR(20) NOT NULL CHECK (donation_type IN ('financial','equipment','scholarship','building_project')),
  amount        NUMERIC(12,2),
  description   TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'pledged' CHECK (status IN ('pledged','completed')),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS alumni_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,
  event_type  VARCHAR(20) NOT NULL CHECK (event_type IN ('reunion','fundraiser','networking')),
  event_date  DATE,
  venue       VARCHAR(150),
  description TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alumni_event_registrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id      UUID NOT NULL REFERENCES alumni_events(id) ON DELETE CASCADE,
  alumni_id     UUID NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
  attended      BOOLEAN DEFAULT FALSE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, alumni_id)
);

CREATE TABLE IF NOT EXISTS alumni_job_postings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  posted_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  title        VARCHAR(150) NOT NULL,
  company      VARCHAR(150),
  description  TEXT,
  contact_info VARCHAR(200),
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alumni_profiles_tenant   ON alumni_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alumni_profiles_public   ON alumni_profiles(tenant_id, is_public);
CREATE INDEX IF NOT EXISTS idx_alumni_donations_tenant  ON alumni_donations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alumni_events_tenant     ON alumni_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alumni_event_regs_event  ON alumni_event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_alumni_jobs_tenant       ON alumni_job_postings(tenant_id);
