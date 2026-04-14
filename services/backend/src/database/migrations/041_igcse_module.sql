-- ============================================================
-- Migration 041: IGCSE (Cambridge International) Module
-- Fully isolated from CBC curriculum — opt-in per school
-- ============================================================

-- Grading Systems (A*-G or 9-1 scale, dynamic thresholds)
CREATE TABLE IF NOT EXISTS igcse_grading_systems (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL,
  name          VARCHAR(100) NOT NULL,          -- "IGCSE A*-G"
  scale_type    VARCHAR(20)  NOT NULL DEFAULT 'A_to_G', -- 'A_to_G' | '9_to_1'
  description   TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Grade Boundaries (changeable per session)
CREATE TABLE IF NOT EXISTS igcse_grade_boundaries (
  id                  SERIAL PRIMARY KEY,
  grading_system_id   INTEGER NOT NULL REFERENCES igcse_grading_systems(id) ON DELETE CASCADE,
  exam_session_id     INTEGER,                  -- NULL = global default
  grade               VARCHAR(5) NOT NULL,      -- 'A*','A','B','C','D','E','F','G','U'
  min_score           NUMERIC(6,2) NOT NULL,
  max_score           NUMERIC(6,2) NOT NULL,
  sort_order          INTEGER DEFAULT 0
);

-- Exam Sessions (May/June 2026, Oct/Nov 2026 …)
CREATE TABLE IF NOT EXISTS igcse_exam_sessions (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  name        VARCHAR(150) NOT NULL,            -- "May/June 2026"
  series      VARCHAR(30)  NOT NULL,            -- 'May/June' | 'Oct/Nov'
  year        INTEGER      NOT NULL,
  start_date  DATE,
  end_date    DATE,
  is_active   BOOLEAN DEFAULT false,
  is_locked   BOOLEAN DEFAULT false,            -- lock after results published
  created_at  TIMESTAMP DEFAULT NOW()
);

-- IGCSE Subjects (Cambridge catalogue)
CREATE TABLE IF NOT EXISTS igcse_subjects (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  name            VARCHAR(200) NOT NULL,        -- "Mathematics"
  code            VARCHAR(20)  NOT NULL,        -- "0580"
  subject_group   VARCHAR(100),                 -- "Sciences" | "Languages" | "Humanities" …
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- Syllabi (versioned; a subject can have multiple active versions)
CREATE TABLE IF NOT EXISTS igcse_syllabi (
  id                  SERIAL PRIMARY KEY,
  subject_id          INTEGER NOT NULL REFERENCES igcse_subjects(id) ON DELETE CASCADE,
  syllabus_code       VARCHAR(20) NOT NULL,     -- "0580"
  version             VARCHAR(50),              -- "2023-2025"
  description         TEXT,
  grading_system_id   INTEGER REFERENCES igcse_grading_systems(id),
  has_tiers           BOOLEAN DEFAULT true,     -- core / extended tiers
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMP DEFAULT NOW()
);

-- Assessment Components (Paper 1, Paper 2, Coursework …)
CREATE TABLE IF NOT EXISTS igcse_components (
  id              SERIAL PRIMARY KEY,
  syllabus_id     INTEGER NOT NULL REFERENCES igcse_syllabi(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,        -- "Paper 2 (Extended)"
  component_code  VARCHAR(20),                  -- "22"
  type            VARCHAR(30) NOT NULL DEFAULT 'written', -- 'written'|'coursework'|'practical'|'oral'|'portfolio'
  tier            VARCHAR(20) DEFAULT 'both',   -- 'core'|'extended'|'both'
  weight          NUMERIC(6,2) NOT NULL DEFAULT 100, -- % weight in final grade
  max_marks       NUMERIC(6,2) NOT NULL,
  duration_minutes INTEGER,
  sort_order      INTEGER DEFAULT 0
);

-- Teacher–Subject–Session assignments
CREATE TABLE IF NOT EXISTS igcse_teacher_assignments (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  teacher_id      INTEGER NOT NULL,
  syllabus_id     INTEGER NOT NULL REFERENCES igcse_syllabi(id) ON DELETE CASCADE,
  exam_session_id INTEGER NOT NULL REFERENCES igcse_exam_sessions(id) ON DELETE CASCADE,
  class_id        INTEGER,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, teacher_id, syllabus_id, exam_session_id)
);

-- Student Enrollments per Subject per Session
CREATE TABLE IF NOT EXISTS igcse_student_enrollments (
  id                SERIAL PRIMARY KEY,
  tenant_id         INTEGER NOT NULL,
  student_id        INTEGER NOT NULL,
  syllabus_id       INTEGER NOT NULL REFERENCES igcse_syllabi(id) ON DELETE CASCADE,
  exam_session_id   INTEGER NOT NULL REFERENCES igcse_exam_sessions(id) ON DELETE CASCADE,
  tier              VARCHAR(20) DEFAULT 'extended',  -- 'core'|'extended'
  candidate_number  VARCHAR(30),
  centre_number     VARCHAR(20),
  class_id          INTEGER,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, student_id, syllabus_id, exam_session_id)
);

-- Raw Marks per Component
CREATE TABLE IF NOT EXISTS igcse_marks (
  id              SERIAL PRIMARY KEY,
  enrollment_id   INTEGER NOT NULL REFERENCES igcse_student_enrollments(id) ON DELETE CASCADE,
  component_id    INTEGER NOT NULL REFERENCES igcse_components(id) ON DELETE CASCADE,
  raw_score       NUMERIC(6,2),
  moderated_score NUMERIC(6,2),                -- for coursework moderation
  is_absent       BOOLEAN DEFAULT false,
  is_locked       BOOLEAN DEFAULT false,
  entered_by      INTEGER,
  locked_by       INTEGER,
  entered_at      TIMESTAMP DEFAULT NOW(),
  locked_at       TIMESTAMP,
  notes           TEXT,
  UNIQUE(enrollment_id, component_id)
);

-- Computed Final Grades (server-side cached after all marks entered)
CREATE TABLE IF NOT EXISTS igcse_final_grades (
  id              SERIAL PRIMARY KEY,
  enrollment_id   INTEGER NOT NULL REFERENCES igcse_student_enrollments(id) ON DELETE CASCADE UNIQUE,
  weighted_score  NUMERIC(6,2),
  final_grade     VARCHAR(5),                  -- 'A*','A','B' …
  is_official     BOOLEAN DEFAULT false,
  computed_at     TIMESTAMP DEFAULT NOW()
);

-- Report Cards
CREATE TABLE IF NOT EXISTS igcse_report_cards (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  student_id      INTEGER NOT NULL,
  exam_session_id INTEGER REFERENCES igcse_exam_sessions(id),
  generated_at    TIMESTAMP DEFAULT NOW(),
  generated_by    INTEGER,
  is_released     BOOLEAN DEFAULT false,
  notes           TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_igcse_subjects_tenant         ON igcse_subjects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_igcse_sessions_tenant         ON igcse_exam_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_igcse_syllabi_subject         ON igcse_syllabi(subject_id);
CREATE INDEX IF NOT EXISTS idx_igcse_components_syllabus     ON igcse_components(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_igcse_enrollments_student     ON igcse_student_enrollments(student_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_igcse_enrollments_session     ON igcse_student_enrollments(exam_session_id);
CREATE INDEX IF NOT EXISTS idx_igcse_marks_enrollment        ON igcse_marks(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_igcse_teacher_assign_teacher  ON igcse_teacher_assignments(teacher_id, tenant_id);
