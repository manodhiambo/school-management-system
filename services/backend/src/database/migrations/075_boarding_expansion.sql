-- Migration 075: Boarding Management expansion
-- Extends the existing hostel module (hostels/hostel_rooms/hostel_allocations/
-- hostel_movements from migration 056) rather than duplicating it — adds
-- dorm leadership fields, a waiting list, roll call & attendance, two-stage
-- leave/outpass approval with gate verification, laundry, and inspections.
-- Also adds a nullable student_id to the existing gate-module visitor_visits
-- table so a boarding visit can record which boarder is being visited,
-- instead of building a second visitor system.

-- ── Dormitory leadership ────────────────────────────────────────────────────
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS deputy_warden_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS prefect_student_id UUID REFERENCES students(id) ON DELETE SET NULL;

-- ── Waiting list ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hostel_waiting_list (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  hostel_id     UUID REFERENCES hostels(id) ON DELETE SET NULL,
  requested_at  TIMESTAMPTZ DEFAULT NOW(),
  priority      INT DEFAULT 0,
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','allocated','cancelled')),
  notes         TEXT,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hostel_wl_tenant  ON hostel_waiting_list(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hostel_wl_student ON hostel_waiting_list(student_id);

-- ── Roll call & attendance ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hostel_roll_calls (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hostel_id      UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  roll_call_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session        VARCHAR(20) NOT NULL CHECK (session IN ('morning','evening','night')),
  taken_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hostel_id, roll_call_date, session)
);
CREATE INDEX IF NOT EXISTS idx_hostel_rc_tenant ON hostel_roll_calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hostel_rc_hostel ON hostel_roll_calls(hostel_id, roll_call_date);

CREATE TABLE IF NOT EXISTS hostel_roll_call_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_call_id UUID NOT NULL REFERENCES hostel_roll_calls(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status       VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late')),
  remarks      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(roll_call_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_hostel_rce_rollcall ON hostel_roll_call_entries(roll_call_id);
CREATE INDEX IF NOT EXISTS idx_hostel_rce_student   ON hostel_roll_call_entries(student_id);

-- ── Leave/outpass: two-stage approval + gate verification + expected return ──
ALTER TABLE hostel_movements ADD COLUMN IF NOT EXISTS expected_return_at TIMESTAMPTZ;
ALTER TABLE hostel_movements ADD COLUMN IF NOT EXISTS parent_approved_at TIMESTAMPTZ;
ALTER TABLE hostel_movements ADD COLUMN IF NOT EXISTS parent_approved_by VARCHAR(150);
ALTER TABLE hostel_movements ADD COLUMN IF NOT EXISTS gate_verified_out_at TIMESTAMPTZ;
ALTER TABLE hostel_movements ADD COLUMN IF NOT EXISTS gate_verified_in_at TIMESTAMPTZ;
ALTER TABLE hostel_movements ADD COLUMN IF NOT EXISTS gate_verified_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- ── Laundry management ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hostel_laundry_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  room_id           UUID REFERENCES hostel_rooms(id) ON DELETE SET NULL,
  collected_at      TIMESTAMPTZ DEFAULT NOW(),
  items_count       INT DEFAULT 0,
  expected_delivery DATE,
  delivered_at      TIMESTAMPTZ,
  status            VARCHAR(20) DEFAULT 'collected' CHECK (status IN ('collected','washing','ready','delivered','missing')),
  missing_items     TEXT,
  charge_amount     NUMERIC(10,2) DEFAULT 0,
  notes             TEXT,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hostel_laundry_tenant  ON hostel_laundry_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hostel_laundry_student ON hostel_laundry_batches(student_id);

-- ── Dormitory inspections ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hostel_inspections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id           UUID NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
  inspected_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  inspection_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  cleanliness_score INT CHECK (cleanliness_score BETWEEN 1 AND 5),
  damages           TEXT,
  student_remarks   TEXT,
  photo_urls        JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hostel_insp_tenant ON hostel_inspections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hostel_insp_room    ON hostel_inspections(room_id, inspection_date);

-- ── Gate module: link a visit to the boarder being visited ──────────────────
ALTER TABLE visitor_visits ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_visitor_visits_student ON visitor_visits(student_id);
