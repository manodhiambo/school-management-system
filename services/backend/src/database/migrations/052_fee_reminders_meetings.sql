-- Migration 052: Fee Reminders + Parent-Teacher Meetings

-- Fee reminder log
CREATE TABLE IF NOT EXISTS fee_reminder_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id  UUID REFERENCES students(id) ON DELETE CASCADE,
  parent_phone VARCHAR(30),
  balance     NUMERIC(12,2),
  channel     VARCHAR(20) DEFAULT 'sms' CHECK (channel IN ('sms','whatsapp','email')),
  status      VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent','failed','skipped')),
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_reminder_tenant  ON fee_reminder_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_reminder_student ON fee_reminder_log(student_id);

-- Fee reminder schedule config (per tenant)
CREATE TABLE IF NOT EXISTS fee_reminder_config (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  enabled          BOOLEAN DEFAULT TRUE,
  reminder_days    INT[] DEFAULT ARRAY[7,3,1],
  message_template TEXT DEFAULT 'Dear Parent, {student_name}''s school fee balance is KES {balance}. Please pay to avoid inconvenience. Thank you.',
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Parent-Teacher Meeting slots
CREATE TABLE IF NOT EXISTS ptm_slots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  slot_date   DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  is_booked   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ptm_slots_teacher ON ptm_slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ptm_slots_tenant  ON ptm_slots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ptm_slots_date    ON ptm_slots(slot_date);

-- Parent-Teacher Meeting bookings
CREATE TABLE IF NOT EXISTS ptm_bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slot_id       UUID NOT NULL REFERENCES ptm_slots(id) ON DELETE CASCADE,
  parent_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id    UUID REFERENCES students(id) ON DELETE CASCADE,
  agenda        TEXT,
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
  teacher_notes TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ptm_bookings_tenant ON ptm_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ptm_bookings_parent ON ptm_bookings(parent_id);
