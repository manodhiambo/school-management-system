-- Migration 017: Kenya CBC Curriculum Support
-- Safe to re-run: all statements use IF NOT EXISTS or ADD COLUMN IF NOT EXISTS

-- ============================================================
-- ALTER EXISTING TABLES
-- ============================================================

-- Classes: add education_level and grade_number
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS education_level VARCHAR(30) DEFAULT 'lower_primary'
    CHECK (education_level IN ('playgroup','pre_primary','lower_primary',
      'upper_primary','junior_secondary','senior_secondary','university')),
  ADD COLUMN IF NOT EXISTS grade_number INTEGER;

-- Subjects: add education_level + category
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS education_level VARCHAR(30) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'core'
    CHECK (category IN ('core','elective','co_curricular','extra_curricular'));

-- Exams: add class scoping, mode, online exam fields
ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id),
  ADD COLUMN IF NOT EXISTS mode VARCHAR(10) DEFAULT 'offline'
    CHECK (mode IN ('online','offline')),
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS is_results_published BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Exam results: CBC grade + absent flag
ALTER TABLE exam_results
  ADD COLUMN IF NOT EXISTS cbc_grade VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_absent BOOLEAN DEFAULT FALSE;

-- ============================================================
-- NEW TABLES
-- ============================================================

-- Online exam questions
CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('multiple_choice','short_answer','true_false')),
  options JSONB DEFAULT NULL,
  correct_answer TEXT DEFAULT NULL,
  marks INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student exam attempts (online exams)
CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ DEFAULT NULL,
  time_spent_seconds INTEGER DEFAULT 0,
  total_score NUMERIC(5,2) DEFAULT 0,
  max_score NUMERIC(5,2) DEFAULT 0,
  cbc_grade VARCHAR(20) DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','submitted','graded')),
  UNIQUE(exam_id, student_id)
);

-- Per-question answers in an attempt
CREATE TABLE IF NOT EXISTS exam_attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  answer_text TEXT DEFAULT NULL,
  is_correct BOOLEAN DEFAULT NULL,
  marks_awarded NUMERIC(4,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_exams_class_id ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_student ON exam_attempts(exam_id, student_id);
CREATE INDEX IF NOT EXISTS idx_classes_education_level ON classes(education_level);
CREATE INDEX IF NOT EXISTS idx_subjects_education_level ON subjects(education_level);
