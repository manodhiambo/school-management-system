-- Migration 049: Gate Management System (Visitor + Parent Pickup)

-- 1. Add 'security' role to users CHECK constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','teacher','student','parent','finance_officer','superadmin','driver','security'));

-- 2. Visitors master table (person registry)
CREATE TABLE IF NOT EXISTS visitors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name       VARCHAR(255) NOT NULL,
  national_id     VARCHAR(50),
  passport_number VARCHAR(50),
  phone           VARCHAR(30) NOT NULL,
  email           VARCHAR(255),
  gender          VARCHAR(10) CHECK (gender IN ('male','female','other')),
  organization    VARCHAR(255),
  photo_url       TEXT,
  id_copy_url     TEXT,
  is_blacklisted  BOOLEAN DEFAULT FALSE,
  blacklist_reason TEXT,
  blacklisted_at  TIMESTAMPTZ,
  blacklisted_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitors_tenant       ON visitors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitors_national_id  ON visitors(tenant_id, national_id);
CREATE INDEX IF NOT EXISTS idx_visitors_phone        ON visitors(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_visitors_blacklisted  ON visitors(tenant_id, is_blacklisted);

-- 3. Visitor visits (each individual visit instance)
CREATE TABLE IF NOT EXISTS visitor_visits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  visitor_id            UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  -- Visit details
  purpose               VARCHAR(50) NOT NULL DEFAULT 'other'
                          CHECK (purpose IN ('meeting','delivery','parent','contractor','interview','government','maintenance','other')),
  purpose_details       TEXT,
  department            VARCHAR(100),
  host_user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  host_name             VARCHAR(255),
  vehicle_registration  VARCHAR(30),
  items_brought         TEXT,
  expected_duration_mins INTEGER DEFAULT 60,
  -- Pass details
  pass_number           VARCHAR(30) UNIQUE,
  -- Status lifecycle
  status                VARCHAR(20) NOT NULL DEFAULT 'checked_in'
                          CHECK (status IN ('checked_in','checked_out','overstay')),
  -- Times
  check_in_time         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_time        TIMESTAMPTZ,
  expected_out_time     TIMESTAMPTZ,
  -- Security metadata
  registered_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  gate                  VARCHAR(50) DEFAULT 'Main Gate',
  security_notes        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_visits_tenant   ON visitor_visits(tenant_id, check_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_visits_visitor  ON visitor_visits(visitor_id, check_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_visits_status   ON visitor_visits(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_visitor_visits_date     ON visitor_visits(tenant_id, check_in_time);

-- 4. Visitor blacklist
CREATE TABLE IF NOT EXISTS visitor_blacklist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  visitor_id  UUID REFERENCES visitors(id) ON DELETE CASCADE,
  national_id VARCHAR(50),
  full_name   VARCHAR(255) NOT NULL,
  phone       VARCHAR(30),
  reason      TEXT NOT NULL,
  added_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_blacklist_tenant ON visitor_blacklist(tenant_id, is_active);

-- 5. Authorized persons for student pickup
CREATE TABLE IF NOT EXISTS pickup_authorized_persons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  full_name    VARCHAR(255) NOT NULL,
  relationship VARCHAR(100) NOT NULL,
  national_id  VARCHAR(50),
  phone        VARCHAR(30) NOT NULL,
  photo_url    TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  is_blacklisted BOOLEAN DEFAULT FALSE,
  blacklist_reason TEXT,
  added_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pickup_auth_student  ON pickup_authorized_persons(student_id, is_active);
CREATE INDEX IF NOT EXISTS idx_pickup_auth_tenant   ON pickup_authorized_persons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pickup_auth_id_number ON pickup_authorized_persons(national_id);

-- 6. Pickup transactions (student release records)
CREATE TABLE IF NOT EXISTS pickup_transactions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id                UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  authorized_person_id      UUID REFERENCES pickup_authorized_persons(id) ON DELETE SET NULL,
  -- Captured at time of pickup (immutable snapshot)
  pickup_person_name        VARCHAR(255) NOT NULL,
  pickup_person_relationship VARCHAR(100),
  pickup_person_id_number   VARCHAR(50),
  pickup_person_phone       VARCHAR(30),
  -- Verification
  verification_method       VARCHAR(20) DEFAULT 'id_check'
                              CHECK (verification_method IN ('id_check','otp','qr_code','manual')),
  is_authorized             BOOLEAN DEFAULT TRUE,
  -- Details
  pickup_time               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  gate                      VARCHAR(50) DEFAULT 'Main Gate',
  approved_by               UUID REFERENCES users(id) ON DELETE SET NULL,
  remarks                   TEXT,
  photo_evidence_url        TEXT,
  -- Notifications
  parent_notified           BOOLEAN DEFAULT FALSE,
  parent_notified_at        TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pickup_tx_student  ON pickup_transactions(student_id, pickup_time DESC);
CREATE INDEX IF NOT EXISTS idx_pickup_tx_tenant   ON pickup_transactions(tenant_id, pickup_time DESC);
CREATE INDEX IF NOT EXISTS idx_pickup_tx_date     ON pickup_transactions(tenant_id, pickup_time);
CREATE INDEX IF NOT EXISTS idx_pickup_tx_unauth   ON pickup_transactions(tenant_id, is_authorized) WHERE is_authorized = FALSE;

-- 7. OTP requests for temporary/one-time pickup authorization
CREATE TABLE IF NOT EXISTS pickup_otp_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id           UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  otp_code             VARCHAR(6) NOT NULL,
  pickup_person_name   VARCHAR(255),
  pickup_person_phone  VARCHAR(30),
  is_used              BOOLEAN DEFAULT FALSE,
  expires_at           TIMESTAMPTZ NOT NULL,
  used_at              TIMESTAMPTZ,
  requested_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pickup_otp_student  ON pickup_otp_requests(student_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_pickup_otp_tenant   ON pickup_otp_requests(tenant_id);

-- 8. Guardian blacklist
CREATE TABLE IF NOT EXISTS guardian_blacklist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id  UUID REFERENCES students(id) ON DELETE CASCADE,
  full_name   VARCHAR(255) NOT NULL,
  national_id VARCHAR(50),
  phone       VARCHAR(30),
  reason      TEXT NOT NULL,
  added_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guardian_blacklist_tenant  ON guardian_blacklist(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_guardian_blacklist_student ON guardian_blacklist(student_id);
