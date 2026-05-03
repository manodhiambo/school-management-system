-- Migration 047: Safety-net re-apply for 045+046 (idempotent — all IF NOT EXISTS)
-- Fixes cases where 045/046 failed to apply due to pooler multi-statement issues.

-- 1. Users role constraint includes 'driver'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','teacher','student','parent','finance_officer','superadmin','driver'));

-- 2. transport_routes: driver account link + extra columns
ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS driver_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50) DEFAULT 'bus';
ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS notes TEXT;
CREATE INDEX IF NOT EXISTS idx_transport_routes_driver ON transport_routes(driver_user_id);

-- 3. Student pickup tracking
CREATE TABLE IF NOT EXISTS transport_pickups (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  route_id       UUID NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  driver_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  trip_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  trip_type      VARCHAR(10) NOT NULL DEFAULT 'morning' CHECK (trip_type IN ('morning','afternoon')),
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','picked','missed','absent','dropped')),
  pickup_time    TIMESTAMPTZ,
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION,
  notes          TEXT,
  notified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transport_pickups_student ON transport_pickups(student_id, trip_date);
CREATE INDEX IF NOT EXISTS idx_transport_pickups_route   ON transport_pickups(route_id, trip_date);
CREATE INDEX IF NOT EXISTS idx_transport_pickups_driver  ON transport_pickups(driver_id, trip_date);
CREATE INDEX IF NOT EXISTS idx_transport_pickups_tenant  ON transport_pickups(tenant_id, trip_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_transport_pickups   ON transport_pickups(student_id, route_id, trip_date, trip_type);

-- 4. Teacher check-in / check-out
CREATE TABLE IF NOT EXISTS teacher_checkins (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  checkin_time   TIMESTAMPTZ,
  checkout_time  TIMESTAMPTZ,
  checkin_lat    DOUBLE PRECISION,
  checkin_lng    DOUBLE PRECISION,
  checkout_lat   DOUBLE PRECISION,
  checkout_lng   DOUBLE PRECISION,
  status         VARCHAR(20) NOT NULL DEFAULT 'present'
                   CHECK (status IN ('present','late','absent','on_leave')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_teacher_checkins_teacher ON teacher_checkins(teacher_id, checkin_date);
CREATE INDEX IF NOT EXISTS idx_teacher_checkins_tenant  ON teacher_checkins(tenant_id, checkin_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_checkins   ON teacher_checkins(teacher_id, checkin_date);

-- 5. SMS messages log
CREATE TABLE IF NOT EXISTS sms_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sent_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient_type VARCHAR(20) NOT NULL DEFAULT 'parent'
                   CHECK (recipient_type IN ('parent','teacher','student','custom','all_parents','class_parents')),
  recipient_id   UUID,
  phone_number   VARCHAR(30),
  message        TEXT NOT NULL,
  category       VARCHAR(50) DEFAULT 'general'
                   CHECK (category IN ('general','fee_reminder','absence','discipline','results','event','emergency','transport')),
  status         VARCHAR(20) NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued','sent','delivered','failed')),
  provider_ref   VARCHAR(100),
  class_id       UUID REFERENCES classes(id) ON DELETE SET NULL,
  sent_at        TIMESTAMPTZ,
  delivered_at   TIMESTAMPTZ,
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sms_messages_tenant  ON sms_messages(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_messages_sent_by ON sms_messages(sent_by);

-- 6. Settings: configurable teacher check-in hours
ALTER TABLE settings ADD COLUMN IF NOT EXISTS teacher_checkin_start     VARCHAR(5) DEFAULT '08:00';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS teacher_checkin_late_after VARCHAR(5) DEFAULT '08:15';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS teacher_checkin_end       VARCHAR(5) DEFAULT '17:00';

-- 7. Ensure notifications.type can hold custom type strings
ALTER TABLE notifications ALTER COLUMN type TYPE VARCHAR(50);
