-- ============================================================
-- Migration 025: Comprehensive CBC Academics Module
-- Kenya Competency-Based Curriculum (CBC) full feature set
-- ============================================================

-- ============================================================
-- 1. SCHEMES OF WORK
-- ============================================================
CREATE TABLE IF NOT EXISTS schemes_of_work (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  academic_year VARCHAR(20) NOT NULL,
  term INTEGER NOT NULL CHECK (term IN (1,2,3)),
  title VARCHAR(200) NOT NULL,
  strand_id UUID REFERENCES cbc_strands(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
  hod_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  hod_approved_at TIMESTAMPTZ,
  hod_remarks TEXT,
  total_weeks INTEGER DEFAULT 13,
  objectives TEXT,
  resources TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheme_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID NOT NULL REFERENCES schemes_of_work(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  topic VARCHAR(300) NOT NULL,
  sub_strand_id UUID REFERENCES cbc_sub_strands(id) ON DELETE SET NULL,
  learning_outcomes TEXT,
  activities TEXT,
  resources TEXT,
  assessment_type VARCHAR(50),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. LESSON PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  scheme_id UUID REFERENCES schemes_of_work(id) ON DELETE SET NULL,
  strand_id UUID REFERENCES cbc_strands(id) ON DELETE SET NULL,
  sub_strand_id UUID REFERENCES cbc_sub_strands(id) ON DELETE SET NULL,
  academic_year VARCHAR(20) NOT NULL,
  term INTEGER NOT NULL CHECK (term IN (1,2,3)),
  week_number INTEGER NOT NULL,
  lesson_number INTEGER DEFAULT 1,
  date DATE,
  duration_minutes INTEGER DEFAULT 40,
  topic VARCHAR(300) NOT NULL,
  learning_objectives TEXT NOT NULL,
  key_vocabulary TEXT,
  prior_knowledge TEXT,
  teaching_methods TEXT,
  introduction TEXT,
  development TEXT,
  conclusion TEXT,
  activities TEXT,
  homework TEXT,
  resources TEXT,
  assessment_method TEXT,
  reflection TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approval_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('document','video','image','link','audio','other')),
  url TEXT,
  file_path TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. SCHOOL BASED ASSESSMENTS (SBA)
-- ============================================================
CREATE TABLE IF NOT EXISTS sba_setups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  strand_id UUID REFERENCES cbc_strands(id) ON DELETE SET NULL,
  sub_strand_id UUID REFERENCES cbc_sub_strands(id) ON DELETE SET NULL,
  academic_year VARCHAR(20) NOT NULL,
  term INTEGER NOT NULL CHECK (term IN (1,2,3)),
  title VARCHAR(200) NOT NULL,
  assessment_type VARCHAR(50) NOT NULL CHECK (assessment_type IN (
    'classwork','project','practical','oral','observation','written','portfolio','group_work','field_work','other'
  )),
  description TEXT,
  max_score NUMERIC(5,2) DEFAULT 100,
  weight_percentage NUMERIC(5,2) DEFAULT 10,
  assessment_date DATE,
  submission_deadline DATE,
  instructions TEXT,
  rubric TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','closed','moderated')),
  moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sba_student_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sba_setup_id UUID NOT NULL REFERENCES sba_setups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  score NUMERIC(5,2),
  cbc_grade VARCHAR(5),           -- EE/ME/AE/BE or WD/D/B
  is_absent BOOLEAN DEFAULT FALSE,
  evidence_url TEXT,
  teacher_remarks TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sba_setup_id, student_id)
);

-- ============================================================
-- 4. PROJECTS MANAGEMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  strand_id UUID REFERENCES cbc_strands(id) ON DELETE SET NULL,
  sub_strand_id UUID REFERENCES cbc_sub_strands(id) ON DELETE SET NULL,
  academic_year VARCHAR(20) NOT NULL,
  term INTEGER NOT NULL CHECK (term IN (1,2,3)),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  project_type VARCHAR(20) NOT NULL DEFAULT 'individual' CHECK (project_type IN ('individual','group')),
  is_stem BOOLEAN DEFAULT FALSE,
  start_date DATE,
  due_date DATE,
  max_score NUMERIC(5,2) DEFAULT 100,
  rubric TEXT,
  learning_outcomes TEXT,
  materials_needed TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  group_name VARCHAR(100),
  leader_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_group_members (
  project_group_id UUID NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY (project_group_id, student_id)
);

CREATE TABLE IF NOT EXISTS project_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  project_group_id UUID REFERENCES project_groups(id) ON DELETE CASCADE,
  title VARCHAR(300),
  description TEXT,
  evidence_urls TEXT[],              -- Array of file/image URLs
  submission_date TIMESTAMPTZ DEFAULT NOW(),
  milestone_id UUID REFERENCES project_milestones(id) ON DELETE SET NULL,
  score NUMERIC(5,2),
  cbc_grade VARCHAR(5),
  teacher_remarks TEXT,
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_late BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. VALUES & LIFE SKILLS (BEHAVIOUR TRACKING - CBC specific)
-- ============================================================
CREATE TABLE IF NOT EXISTS life_skills_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  academic_year VARCHAR(20) NOT NULL,
  term INTEGER NOT NULL CHECK (term IN (1,2,3)),
  -- Core Values (CBC requirement)
  responsibility VARCHAR(5) CHECK (responsibility IN ('EE','ME','AE','BE')),
  respect VARCHAR(5) CHECK (respect IN ('EE','ME','AE','BE')),
  integrity VARCHAR(5) CHECK (integrity IN ('EE','ME','AE','BE')),
  patriotism VARCHAR(5) CHECK (patriotism IN ('EE','ME','AE','BE')),
  -- Social Skills
  communication VARCHAR(5) CHECK (communication IN ('EE','ME','AE','BE')),
  collaboration VARCHAR(5) CHECK (collaboration IN ('EE','ME','AE','BE')),
  critical_thinking VARCHAR(5) CHECK (critical_thinking IN ('EE','ME','AE','BE')),
  creativity VARCHAR(5) CHECK (creativity IN ('EE','ME','AE','BE')),
  -- Digital Literacy
  digital_literacy VARCHAR(5) CHECK (digital_literacy IN ('EE','ME','AE','BE')),
  -- Learning to Learn
  self_management VARCHAR(5) CHECK (self_management IN ('EE','ME','AE','BE')),
  -- Leadership
  leadership VARCHAR(5) CHECK (leadership IN ('EE','ME','AE','BE')),
  -- Sports & PE
  physical_health VARCHAR(5) CHECK (physical_health IN ('EE','ME','AE','BE')),
  -- General teacher observations
  teacher_remarks TEXT,
  areas_of_improvement TEXT,
  strengths TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id, academic_year, term)
);

-- ============================================================
-- 6. CAREER GUIDANCE (CBC Junior Secondary emphasis)
-- ============================================================
CREATE TABLE IF NOT EXISTS career_pathways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('stem','arts','social_sciences','technical','business','health','law','education','other')),
  description TEXT,
  required_subjects TEXT[],
  key_competencies TEXT[],
  institutions TEXT[],
  career_options TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_career_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  academic_year VARCHAR(20) NOT NULL,
  -- Interest inventory responses
  stem_interest INTEGER CHECK (stem_interest BETWEEN 1 AND 5),
  arts_interest INTEGER CHECK (arts_interest BETWEEN 1 AND 5),
  social_sciences_interest INTEGER CHECK (social_sciences_interest BETWEEN 1 AND 5),
  technical_interest INTEGER CHECK (technical_interest BETWEEN 1 AND 5),
  business_interest INTEGER CHECK (business_interest BETWEEN 1 AND 5),
  health_interest INTEGER CHECK (health_interest BETWEEN 1 AND 5),
  -- Pathway recommendations
  recommended_pathway_id UUID REFERENCES career_pathways(id) ON DELETE SET NULL,
  career_aspirations TEXT,
  teacher_recommendation TEXT,
  counselor_notes TEXT,
  subject_combination TEXT,
  recommended_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, academic_year)
);

-- ============================================================
-- 7. LEARNING MATERIALS / ACADEMIC RESOURCES
-- ============================================================
CREATE TABLE IF NOT EXISTS learning_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  strand_id UUID REFERENCES cbc_strands(id) ON DELETE SET NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  material_type VARCHAR(50) NOT NULL CHECK (material_type IN (
    'note','textbook','past_paper','video','audio','presentation','worksheet',
    'curriculum_doc','assessment','project_guide','other'
  )),
  education_level VARCHAR(50),
  academic_year VARCHAR(20),
  term INTEGER CHECK (term IN (1,2,3)),
  file_url TEXT,
  external_url TEXT,
  file_size_kb INTEGER,
  is_public BOOLEAN DEFAULT FALSE,    -- visible to students/parents
  download_count INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. PROMOTION RULES & HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS promotion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  to_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,   -- NULL = graduate
  academic_year VARCHAR(20) NOT NULL,
  min_attendance_percent NUMERIC(5,2) DEFAULT 75.0,
  min_subjects_passed INTEGER DEFAULT 5,
  min_average_percent NUMERIC(5,2) DEFAULT 40.0,
  cbc_min_me_count INTEGER DEFAULT 3,   -- Minimum 'ME' grades to pass
  auto_promote BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_class_id, academic_year)
);

CREATE TABLE IF NOT EXISTS student_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  to_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  academic_year VARCHAR(20) NOT NULL,
  promotion_type VARCHAR(20) NOT NULL CHECK (promotion_type IN ('promoted','repeated','graduated','transferred','withdrawn')),
  attendance_percent NUMERIC(5,2),
  average_score NUMERIC(5,2),
  cbc_overall_grade VARCHAR(5),
  remarks TEXT,
  promoted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  promoted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, academic_year)
);

-- ============================================================
-- 9. ENHANCE EXISTING TABLES
-- ============================================================

-- Add subject group and education level to subjects
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='subject_group') THEN
    ALTER TABLE subjects ADD COLUMN subject_group VARCHAR(50) CHECK (subject_group IN ('stem','arts','humanities','languages','technical','business','sports','other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='education_level') THEN
    ALTER TABLE subjects ADD COLUMN education_level VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='is_elective') THEN
    ALTER TABLE subjects ADD COLUMN is_elective BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='weekly_periods') THEN
    ALTER TABLE subjects ADD COLUMN weekly_periods INTEGER DEFAULT 5;
  END IF;
END $$;

-- Add approval tracking to cbc_assessments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbc_assessments' AND column_name='is_published') THEN
    ALTER TABLE cbc_assessments ADD COLUMN is_published BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbc_assessments' AND column_name='published_at') THEN
    ALTER TABLE cbc_assessments ADD COLUMN published_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add class academic year tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='education_level') THEN
    ALTER TABLE classes ADD COLUMN education_level VARCHAR(50);
  END IF;
END $$;

-- ============================================================
-- 10. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_schemes_tenant ON schemes_of_work(tenant_id);
CREATE INDEX IF NOT EXISTS idx_schemes_class ON schemes_of_work(class_id);
CREATE INDEX IF NOT EXISTS idx_schemes_teacher ON schemes_of_work(teacher_id);
CREATE INDEX IF NOT EXISTS idx_scheme_weeks_scheme ON scheme_weeks(scheme_id);

CREATE INDEX IF NOT EXISTS idx_lesson_plans_tenant ON lesson_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher ON lesson_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_class ON lesson_plans(class_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_date ON lesson_plans(date);

CREATE INDEX IF NOT EXISTS idx_sba_setups_tenant ON sba_setups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sba_setups_class ON sba_setups(class_id);
CREATE INDEX IF NOT EXISTS idx_sba_records_student ON sba_student_records(student_id);
CREATE INDEX IF NOT EXISTS idx_sba_records_setup ON sba_student_records(sba_setup_id);

CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_class ON projects(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON project_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_project ON project_submissions(project_id);

CREATE INDEX IF NOT EXISTS idx_life_skills_student ON life_skills_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_life_skills_class ON life_skills_assessments(class_id);

CREATE INDEX IF NOT EXISTS idx_career_profiles_student ON student_career_profiles(student_id);

CREATE INDEX IF NOT EXISTS idx_materials_tenant ON learning_materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_materials_subject ON learning_materials(subject_id);

CREATE INDEX IF NOT EXISTS idx_promotions_student ON student_promotions(student_id);
CREATE INDEX IF NOT EXISTS idx_promotions_year ON student_promotions(academic_year);

-- ============================================================
-- 11. SEED DEFAULT CAREER PATHWAYS
-- ============================================================
INSERT INTO career_pathways (id, tenant_id, name, category, description, required_subjects, key_competencies, career_options)
SELECT
  gen_random_uuid(),
  t.id,
  p.name,
  p.category,
  p.description,
  p.required_subjects,
  p.key_competencies,
  p.career_options
FROM tenants t
CROSS JOIN (VALUES
  ('STEM Pathway', 'stem', 'Science, Technology, Engineering & Mathematics pathway aligned with CBC JSS',
   ARRAY['Mathematics','Integrated Science','Pre-Technical Studies'],
   ARRAY['Critical thinking','Problem solving','Digital literacy'],
   ARRAY['Engineer','Scientist','Doctor','Programmer','Architect']),
  ('Arts & Creative Pathway', 'arts', 'Creative arts, music, visual arts and performing arts pathway',
   ARRAY['Creative Arts & Crafts','Music','Physical & Health Education'],
   ARRAY['Creativity','Communication','Collaboration'],
   ARRAY['Artist','Musician','Designer','Journalist','Actor']),
  ('Social Sciences Pathway', 'social_sciences', 'Humanities, languages, social studies and religious education',
   ARRAY['English','Kiswahili','Social Studies','Religious Education'],
   ARRAY['Communication','Critical thinking','Research'],
   ARRAY['Lawyer','Teacher','Historian','Diplomat','Sociologist']),
  ('Technical & Vocational Pathway', 'technical', 'Pre-technical studies, business and practical skills (TVET)',
   ARRAY['Pre-Technical Studies','Business Studies','Mathematics'],
   ARRAY['Problem solving','Critical thinking','Practical skills'],
   ARRAY['Technician','Mechanic','Electrician','Plumber','Carpenter']),
  ('Business & Entrepreneurship Pathway', 'business', 'Business studies, economics and entrepreneurship',
   ARRAY['Business Studies','Mathematics','English'],
   ARRAY['Critical thinking','Communication','Leadership'],
   ARRAY['Entrepreneur','Accountant','Manager','Banker','Marketer']),
  ('Health Sciences Pathway', 'health', 'Health, nutrition, physical education and sciences',
   ARRAY['Integrated Science','Physical & Health Education','Mathematics'],
   ARRAY['Critical thinking','Communication','Empathy'],
   ARRAY['Doctor','Nurse','Nutritionist','Pharmacist','Physiotherapist'])
) AS p(name, category, description, required_subjects, key_competencies, career_options)
ON CONFLICT DO NOTHING;
