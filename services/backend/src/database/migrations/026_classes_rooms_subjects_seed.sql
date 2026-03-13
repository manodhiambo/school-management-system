-- ============================================================
-- Migration 026: Rooms table + Class/Subject structure cleanup
-- ============================================================

-- ── 1. ROOMS TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  room_number VARCHAR(30),
  capacity INTEGER DEFAULT 45,
  building VARCHAR(100),
  floor VARCHAR(20),
  room_type VARCHAR(30) DEFAULT 'classroom' CHECK (room_type IN (
    'classroom','laboratory','computer_lab','library','hall','sports_room',
    'art_room','music_room','staffroom','office','store','other'
  )),
  features TEXT[],          -- e.g. ['projector','smart_board','AC']
  is_available BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_rooms_tenant ON rooms(tenant_id);

-- ── 2. ADD room_id + sort_order TO classes ────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='room_id') THEN
    ALTER TABLE classes ADD COLUMN room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='sort_order') THEN
    ALTER TABLE classes ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='grade_number') THEN
    ALTER TABLE classes ADD COLUMN grade_number INTEGER;
  END IF;
  -- ensure education_level exists (may have been added in 024/025)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='education_level') THEN
    ALTER TABLE classes ADD COLUMN education_level VARCHAR(50);
  END IF;
END $$;

-- ── 3. ADD subject_group + is_elective + sort_order to subjects ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='subject_group') THEN
    ALTER TABLE subjects ADD COLUMN subject_group VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='is_elective') THEN
    ALTER TABLE subjects ADD COLUMN is_elective BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='education_level') THEN
    ALTER TABLE subjects ADD COLUMN education_level VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='weekly_periods') THEN
    ALTER TABLE subjects ADD COLUMN weekly_periods INTEGER DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='sort_order') THEN
    ALTER TABLE subjects ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='color') THEN
    ALTER TABLE subjects ADD COLUMN color VARCHAR(20);
  END IF;
END $$;

-- ── 4. CLASS–SUBJECT LINK TABLE (which subjects belong to which class) ──
CREATE TABLE IF NOT EXISTS class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_optional BOOLEAN DEFAULT FALSE,
  weekly_periods INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_class_subjects_class ON class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject ON class_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_tenant ON class_subjects(tenant_id);
