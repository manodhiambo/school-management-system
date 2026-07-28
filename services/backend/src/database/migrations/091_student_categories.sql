-- Migration 091: Student Categories
-- Lets an admin define named student groupings for reporting purposes,
-- e.g. "Grade 9" (dynamic rule: grade_level = 'grade9', spans every stream)
-- or "Special Needs" (dynamic rule: special_needs = true), or a fully
-- manual hand-picked list (e.g. "Bursary recipients") when is_dynamic=false.
-- student_category_members holds manual additions layered on top of a
-- dynamic category, OR the entire membership when is_dynamic is false.
--
-- CAUTION for future migration authors: this repo's migration runner splits
-- each file on every literal semicolon character, including ones inside
-- double-dash comments. Do not use semicolons in prose within comments here.

CREATE TABLE IF NOT EXISTS student_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         VARCHAR(150) NOT NULL,
  description  TEXT,
  is_dynamic   BOOLEAN DEFAULT TRUE,
  criteria     JSONB DEFAULT '{}',
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_category_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID NOT NULL REFERENCES student_categories(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  added_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_categories_tenant ON student_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_category_members_tenant ON student_category_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_category_members_category ON student_category_members(category_id);
CREATE INDEX IF NOT EXISTS idx_student_category_members_student ON student_category_members(student_id);
