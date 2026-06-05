-- Migration 057: Bursary/Scholarship + Inventory Management

-- Bursary funders
CREATE TABLE IF NOT EXISTS bursary_funders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  funder_type VARCHAR(50) CHECK (funder_type IN ('government','cdf','ngo','private','church','other')),
  contact     VARCHAR(150),
  phone       VARCHAR(30),
  email       VARCHAR(150),
  notes       TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Bursaries / Scholarships
CREATE TABLE IF NOT EXISTS bursaries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  funder_id     UUID REFERENCES bursary_funders(id) ON DELETE SET NULL,
  name          VARCHAR(200) NOT NULL,
  academic_year VARCHAR(20),
  total_amount  NUMERIC(14,2) DEFAULT 0,
  per_student   NUMERIC(12,2) DEFAULT 0,
  deadline      DATE,
  description   TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Bursary applications
CREATE TABLE IF NOT EXISTS bursary_applications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bursary_id   UUID NOT NULL REFERENCES bursaries(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount_req   NUMERIC(12,2),
  reason       TEXT,
  documents    JSONB DEFAULT '[]',
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','disbursed')),
  amount_awarded NUMERIC(12,2) DEFAULT 0,
  reviewed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  disbursed_at TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bursary_funders_tenant ON bursary_funders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bursaries_tenant       ON bursaries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bursary_apps_tenant    ON bursary_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bursary_apps_student   ON bursary_applications(student_id);

-- Inventory categories
CREATE TABLE IF NOT EXISTS inventory_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory items
CREATE TABLE IF NOT EXISTS inventory_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  sku             VARCHAR(50),
  unit            VARCHAR(30) DEFAULT 'pieces',
  quantity        NUMERIC(10,2) DEFAULT 0,
  reorder_level   NUMERIC(10,2) DEFAULT 5,
  unit_cost       NUMERIC(10,2) DEFAULT 0,
  location        VARCHAR(150),
  condition       VARCHAR(30) DEFAULT 'good' CHECK (condition IN ('new','good','fair','poor','damaged')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory transactions (stock in/out)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id     UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  type        VARCHAR(20) CHECK (type IN ('stock_in','stock_out','damaged','adjustment','transfer')),
  quantity    NUMERIC(10,2) NOT NULL,
  reference   VARCHAR(150),
  notes       TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_categories_tenant ON inventory_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_tenant      ON inventory_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_txn_tenant        ON inventory_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_txn_item          ON inventory_transactions(item_id);
