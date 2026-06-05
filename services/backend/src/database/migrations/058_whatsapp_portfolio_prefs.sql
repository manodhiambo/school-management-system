-- Migration 058: WhatsApp Config + SMS Keywords + Portfolio Items + User Preferences

-- WhatsApp message log
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  to_phone     VARCHAR(30) NOT NULL,
  template     VARCHAR(100),
  body         TEXT NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','read','failed')),
  meta_msg_id  VARCHAR(100),
  error        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_tenant ON whatsapp_messages(tenant_id);

-- WhatsApp config per tenant
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number_id VARCHAR(50),
  access_token    TEXT,
  is_enabled      BOOLEAN DEFAULT FALSE,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Two-way SMS keywords
CREATE TABLE IF NOT EXISTS sms_keywords (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  keyword     VARCHAR(30) NOT NULL,
  description VARCHAR(200),
  handler     VARCHAR(50) NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, keyword)
);

-- Student portfolio items (extends existing student_portfolios)
CREATE TABLE IF NOT EXISTS student_portfolio_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  item_type     VARCHAR(50) DEFAULT 'work_sample' CHECK (item_type IN ('work_sample','achievement','reflection','project','certificate','photo','other')),
  file_url      TEXT,
  subject_id    UUID REFERENCES subjects(id) ON DELETE SET NULL,
  term          VARCHAR(30),
  academic_year VARCHAR(20),
  is_featured   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_items_tenant  ON student_portfolio_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_student ON student_portfolio_items(student_id);

-- User language preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  language    VARCHAR(10) DEFAULT 'en' CHECK (language IN ('en','sw')),
  theme       VARCHAR(20) DEFAULT 'light',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- NEMIS export config
CREATE TABLE IF NOT EXISTS nemis_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  nemis_code  VARCHAR(50),
  county      VARCHAR(100),
  sub_county  VARCHAR(100),
  ward        VARCHAR(100),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default SMS keywords
INSERT INTO sms_keywords (tenant_id, keyword, description, handler)
SELECT t.id, 'BAL', 'Get fee balance', 'balance'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM sms_keywords sk WHERE sk.tenant_id = t.id AND sk.keyword = 'BAL'
);

INSERT INTO sms_keywords (tenant_id, keyword, description, handler)
SELECT t.id, 'ATT', 'Get attendance summary', 'attendance'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM sms_keywords sk WHERE sk.tenant_id = t.id AND sk.keyword = 'ATT'
);

INSERT INTO sms_keywords (tenant_id, keyword, description, handler)
SELECT t.id, 'RESULT', 'Get latest exam results', 'results'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM sms_keywords sk WHERE sk.tenant_id = t.id AND sk.keyword = 'RESULT'
);
