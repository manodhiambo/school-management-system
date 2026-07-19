-- Migration 083: School CRM Module
-- Lead capture and nurturing layer that feeds into the existing Online
-- Admission pipeline (migration 082) -- a converted lead creates a real
-- admission_applications row rather than a second parallel workflow.
--
-- CAUTION for future migration authors: this repo's migration runner splits
-- each file on every literal semicolon character, including ones inside
-- double-dash comments. Do not use semicolons in prose within comments here.

CREATE TABLE IF NOT EXISTS crm_leads (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_number              VARCHAR(30) NOT NULL,

  source                   VARCHAR(20) NOT NULL CHECK (source IN (
                              'admission_enquiry','walk_in','website','referral',
                              'social_media','phone','other'
                            )),
  applicant_name           VARCHAR(150) NOT NULL,
  education_level_interested VARCHAR(30),

  guardian_name            VARCHAR(150) NOT NULL,
  guardian_phone           VARCHAR(20) NOT NULL,
  guardian_email           VARCHAR(150),

  status                   VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN (
                              'new','contacted','follow_up','qualified','converted','lost'
                            )),
  assigned_to              UUID REFERENCES users(id) ON DELETE SET NULL,
  next_follow_up_date      DATE,
  notes                    TEXT,

  converted_application_id UUID REFERENCES admission_applications(id) ON DELETE SET NULL,
  lost_reason              TEXT,

  created_by               UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, lead_number)
);

CREATE TABLE IF NOT EXISTS crm_lead_activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id       UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('call','email','sms','whatsapp','meeting','note')),
  notes         TEXT,
  performed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('sms','email','whatsapp','open_day','school_tour')),
  message     TEXT,
  event_date  DATE,
  status      VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','completed')),
  sent_count  INTEGER DEFAULT 0,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  sent_at     TIMESTAMPTZ
);

ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_leads_tenant       ON crm_leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status        ON crm_leads(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_lead_activities_lead ON crm_lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_tenant    ON crm_campaigns(tenant_id);
