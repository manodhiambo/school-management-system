-- Migration 080: Maintenance Management
-- Genuinely new (no ticket/workflow system existed anywhere). Requests can
-- optionally reference an existing proc_assets row (procurement module) --
-- deliberately NOT creating a third asset table, and deliberately NOT
-- consolidating proc_assets with the separate legacy finance `assets` table
-- either (both are live/routed, and that would be a much bigger, riskier
-- migration than this slice needs). The technician role mirrors the existing
-- driver role pattern (migrations 045/047/048/049) exactly.
--
-- CAUTION for future migration authors: this repo's migration runner
-- (runMigrations.js) splits each file on every literal semicolon character,
-- including ones inside double-dash comments. Do not use semicolons in
-- prose within migration comments, or you will silently corrupt the next
-- statement.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','teacher','student','parent','finance_officer','superadmin','driver','security','technician'));

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  request_number         VARCHAR(30),
  category               VARCHAR(20) NOT NULL CHECK (category IN (
                            'electrical','plumbing','carpentry','ict','civil_works',
                            'painting','vehicles','furniture','grounds','other'
                          )),
  priority               VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','emergency')),
  title                  VARCHAR(200) NOT NULL,
  description            TEXT,
  location               VARCHAR(150),
  photo_urls             JSONB DEFAULT '[]',
  asset_id               UUID REFERENCES proc_assets(id) ON DELETE SET NULL,
  requested_by           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status                 VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN (
                            'submitted','under_review','assigned','in_progress',
                            'inspection','completed','verified','rejected','cancelled'
                          )),
  assigned_technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at            TIMESTAMPTZ,
  started_at             TIMESTAMPTZ,
  completed_at           TIMESTAMPTZ,
  verified_at            TIMESTAMPTZ,
  verified_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  repair_cost            NUMERIC(12,2),
  inspection_notes       TEXT,
  rejection_reason       TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, request_number)
);
CREATE INDEX IF NOT EXISTS idx_maint_req_tenant     ON maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maint_req_status      ON maintenance_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_maint_req_technician  ON maintenance_requests(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_maint_req_asset       ON maintenance_requests(asset_id);
CREATE INDEX IF NOT EXISTS idx_maint_req_requester   ON maintenance_requests(requested_by);

CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  asset_id               UUID REFERENCES proc_assets(id) ON DELETE SET NULL,
  title                  VARCHAR(200) NOT NULL,
  category               VARCHAR(20) CHECK (category IN (
                            'electrical','plumbing','carpentry','ict','civil_works',
                            'painting','vehicles','furniture','grounds','other'
                          )),
  frequency              VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly','monthly','quarterly','annually')),
  next_due_date          DATE NOT NULL,
  last_completed_date    DATE,
  assigned_technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active              BOOLEAN DEFAULT TRUE,
  notes                  TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_maint_sched_tenant ON maintenance_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maint_sched_due     ON maintenance_schedules(tenant_id, next_due_date) WHERE is_active = TRUE;
