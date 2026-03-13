-- Migration 024: Comprehensive Kenya CBC & Education System
-- Safe to re-run: all statements use IF NOT EXISTS

-- ============================================================
-- 1. EDUCATION LEVELS & SCHOOL STRUCTURE
-- ============================================================

-- Expand education_level check on classes to include all Kenyan levels
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS level_category VARCHAR(30) DEFAULT 'lower_primary',
  ADD COLUMN IF NOT EXISTS stream VARCHAR(50),
  ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 45,
  ADD COLUMN IF NOT EXISTS current_enrollment INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS class_teacher_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS academic_year VARCHAR(10);

-- Students: add Kenya-specific fields
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS nemis_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS education_level VARCHAR(30),
  ADD COLUMN IF NOT EXISTS grade_level VARCHAR(20),
  ADD COLUMN IF NOT EXISTS kcpe_index_number VARCHAR(30),
  ADD COLUMN IF NOT EXISTS kcse_index_number VARCHAR(30),
  ADD COLUMN IF NOT EXISTS birth_certificate_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS county VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sub_county VARCHAR(50),
  ADD COLUMN IF NOT EXISTS special_needs BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_needs_details TEXT,
  ADD COLUMN IF NOT EXISTS previous_school VARCHAR(100),
  ADD COLUMN IF NOT EXISTS medical_conditions TEXT,
  ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5),
  ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS transport_id UUID;

-- Teachers: Kenya-specific
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS tsc_number VARCHAR(30),
  ADD COLUMN IF NOT EXISTS id_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS education_level_taught VARCHAR(30),
  ADD COLUMN IF NOT EXISTS is_class_teacher BOOLEAN DEFAULT FALSE;

-- Parents: contact preferences
ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS sms_alerts BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS email_alerts BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS whatsapp_alerts BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS alert_attendance BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS alert_grades BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS alert_fees BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS alert_discipline BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS alert_general BOOLEAN DEFAULT TRUE;

-- ============================================================
-- 2. CBC COMPETENCY FRAMEWORK
-- ============================================================

-- CBC Strands (major content areas within a subject)
CREATE TABLE IF NOT EXISTS cbc_strands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20),
  education_level VARCHAR(30),
  order_index INTEGER DEFAULT 0,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CBC Sub-Strands
CREATE TABLE IF NOT EXISTS cbc_sub_strands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strand_id UUID NOT NULL REFERENCES cbc_strands(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(20),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CBC Learning Outcomes per sub-strand
CREATE TABLE IF NOT EXISTS cbc_learning_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_strand_id UUID NOT NULL REFERENCES cbc_sub_strands(id) ON DELETE CASCADE,
  outcome_text TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. CBC ASSESSMENTS (Formative & Summative)
-- ============================================================

-- Assessment records linked to CBC framework
CREATE TABLE IF NOT EXISTS cbc_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  strand_id UUID REFERENCES cbc_strands(id),
  sub_strand_id UUID REFERENCES cbc_sub_strands(id),
  class_id UUID REFERENCES classes(id),
  assessment_type VARCHAR(20) NOT NULL CHECK (assessment_type IN ('formative','summative','project','portfolio','observation')),
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  term VARCHAR(10) NOT NULL CHECK (term IN ('term1','term2','term3')),
  academic_year VARCHAR(10) NOT NULL,
  -- CBC 4-level grading: EE=4, ME=3, AE=2, BE=1
  cbc_grade VARCHAR(5) CHECK (cbc_grade IN ('EE','ME','AE','BE')),
  -- Pre-primary uses: WD=Well Developed, D=Developing, B=Beginning
  pre_primary_grade VARCHAR(5) CHECK (pre_primary_grade IN ('WD','D','B')),
  score NUMERIC(5,2),
  max_score NUMERIC(5,2),
  teacher_comments TEXT,
  teacher_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student portfolios (CBC evidence collection)
CREATE TABLE IF NOT EXISTS student_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id),
  strand_id UUID REFERENCES cbc_strands(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  evidence_type VARCHAR(30) CHECK (evidence_type IN ('document','image','video','audio','project','other')),
  file_url TEXT,
  term VARCHAR(10) CHECK (term IN ('term1','term2','term3')),
  academic_year VARCHAR(10),
  teacher_feedback TEXT,
  teacher_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. CBC REPORT CARDS (Holistic Learner Profile)
-- ============================================================

CREATE TABLE IF NOT EXISTS cbc_report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  term VARCHAR(10) NOT NULL CHECK (term IN ('term1','term2','term3')),
  academic_year VARCHAR(10) NOT NULL,
  -- Overall CBC performance
  overall_grade VARCHAR(5),
  -- Attendance summary
  days_present INTEGER DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  days_late INTEGER DEFAULT 0,
  -- Learning areas grades (JSONB for flexibility per level)
  learning_areas JSONB DEFAULT '{}',
  -- Values & citizenship
  values_citizenship JSONB DEFAULT '{}',
  -- Co-curricular activities
  co_curricular JSONB DEFAULT '{}',
  -- Teacher's holistic comment
  class_teacher_comment TEXT,
  class_teacher_id UUID REFERENCES users(id),
  -- Head teacher's comment
  head_teacher_comment TEXT,
  -- Parent's comment/acknowledgment
  parent_comment TEXT,
  parent_acknowledged_at TIMESTAMPTZ,
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','published','acknowledged')),
  published_at TIMESTAMPTZ,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, term, academic_year)
);

-- ============================================================
-- 5. PARENT ALERTS & NOTIFICATION SYSTEM
-- ============================================================

-- Alert log (every alert sent to parent)
CREATE TABLE IF NOT EXISTS parent_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN (
    'attendance_absent','attendance_late','attendance_early_exit',
    'grade_published','grade_low','report_card',
    'fee_due','fee_overdue','fee_payment_received','fee_reminder',
    'discipline_incident','discipline_action',
    'exam_schedule','exam_result',
    'assignment_due','assignment_graded',
    'health_incident','transport_delay',
    'general_announcement','system'
  )),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  -- Delivery channels
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  sms_sent BOOLEAN DEFAULT FALSE,
  sms_sent_at TIMESTAMPTZ,
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  whatsapp_sent_at TIMESTAMPTZ,
  in_app_sent BOOLEAN DEFAULT TRUE,
  -- Read tracking
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  -- Reference to triggering entity
  reference_type VARCHAR(30),
  reference_id UUID,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. DISCIPLINE MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS discipline_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id),
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN (
    'absenteeism','lateness','bullying','fighting','vandalism',
    'cheating','insubordination','substance_abuse','theft',
    'cyberbullying','dress_code','other'
  )),
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('minor','moderate','serious','critical')),
  description TEXT NOT NULL,
  location VARCHAR(100),
  witnesses TEXT,
  -- Actions taken
  action_taken VARCHAR(50) CHECK (action_taken IN (
    'verbal_warning','written_warning','detention','suspension',
    'corporal_punishment','parent_meeting','expulsion','counseling','other'
  )),
  action_details TEXT,
  suspension_days INTEGER,
  suspension_start DATE,
  suspension_end DATE,
  -- Involved parties
  reported_by UUID REFERENCES users(id),
  handled_by UUID REFERENCES users(id),
  -- Parent notification
  parent_notified BOOLEAN DEFAULT FALSE,
  parent_notified_at TIMESTAMPTZ,
  parent_response TEXT,
  -- Follow-up
  follow_up_date DATE,
  follow_up_notes TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. STUDENT HEALTH RECORDS
-- ============================================================

CREATE TABLE IF NOT EXISTS student_health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  record_type VARCHAR(30) NOT NULL CHECK (record_type IN (
    'general_checkup','illness','injury','vaccination','vision','dental',
    'hearing','mental_health','allergy_reaction','emergency','other'
  )),
  description TEXT NOT NULL,
  symptoms TEXT,
  diagnosis TEXT,
  treatment TEXT,
  medication TEXT,
  -- Follow-up
  referred_to_hospital BOOLEAN DEFAULT FALSE,
  hospital_name VARCHAR(100),
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  -- Staff
  attended_by VARCHAR(100),
  nurse_teacher_id UUID REFERENCES users(id),
  -- Parent notification
  parent_notified BOOLEAN DEFAULT FALSE,
  parent_notified_at TIMESTAMPTZ,
  -- Emergency
  is_emergency BOOLEAN DEFAULT FALSE,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student allergies & chronic conditions
CREATE TABLE IF NOT EXISTS student_medical_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE UNIQUE,
  allergies TEXT,
  chronic_conditions TEXT,
  current_medications TEXT,
  vaccination_status JSONB DEFAULT '{}',
  disability_details TEXT,
  dietary_requirements TEXT,
  insurance_provider VARCHAR(100),
  insurance_policy_number VARCHAR(50),
  doctor_name VARCHAR(100),
  doctor_phone VARCHAR(20),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID REFERENCES tenants(id)
);

-- ============================================================
-- 8. TRANSPORT MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS transport_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name VARCHAR(100) NOT NULL,
  route_code VARCHAR(20),
  description TEXT,
  -- Vehicle info
  vehicle_registration VARCHAR(20),
  vehicle_capacity INTEGER DEFAULT 30,
  driver_name VARCHAR(100),
  driver_phone VARCHAR(20),
  driver_license VARCHAR(30),
  conductor_name VARCHAR(100),
  conductor_phone VARCHAR(20),
  -- Route details
  morning_pickup_time TIME,
  afternoon_dropoff_time TIME,
  stops JSONB DEFAULT '[]',
  -- Fees
  monthly_fee NUMERIC(10,2) DEFAULT 0,
  term_fee NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students assigned to transport routes
CREATE TABLE IF NOT EXISTS student_transport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
  pickup_stop VARCHAR(100),
  dropoff_stop VARCHAR(100),
  assigned_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, route_id)
);

-- ============================================================
-- 9. ACADEMIC CALENDAR (Kenya terms)
-- ============================================================

CREATE TABLE IF NOT EXISTS academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year VARCHAR(10) NOT NULL,
  term VARCHAR(10) NOT NULL CHECK (term IN ('term1','term2','term3')),
  term_name VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  -- Key dates
  midterm_break_start DATE,
  midterm_break_end DATE,
  half_term_exams_start DATE,
  half_term_exams_end DATE,
  end_term_exams_start DATE,
  end_term_exams_end DATE,
  reopening_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(academic_year, term, tenant_id)
);

-- ============================================================
-- 10. LEARNING AREA COMPETENCY TRACKING
-- ============================================================

-- Per-student, per-subject, per-term competency summary
CREATE TABLE IF NOT EXISTS student_competency_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),
  term VARCHAR(10) NOT NULL CHECK (term IN ('term1','term2','term3')),
  academic_year VARCHAR(10) NOT NULL,
  -- Aggregated CBC grade
  overall_cbc_grade VARCHAR(5) CHECK (overall_cbc_grade IN ('EE','ME','AE','BE')),
  -- Pre-primary grade
  pre_primary_grade VARCHAR(5) CHECK (pre_primary_grade IN ('WD','D','B')),
  -- Strand breakdown (JSONB: {strand_name: grade})
  strand_grades JSONB DEFAULT '{}',
  -- Numerical score if applicable
  total_score NUMERIC(5,2),
  max_score NUMERIC(5,2),
  percentage NUMERIC(5,2),
  -- Teacher comments
  teacher_comments TEXT,
  teacher_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, term, academic_year)
);

-- ============================================================
-- 11. SCHOOL CLUBS & CO-CURRICULAR ACTIVITIES
-- ============================================================

CREATE TABLE IF NOT EXISTS school_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  club_type VARCHAR(30) CHECK (club_type IN ('academic','sports','arts','science','community','religious','other')),
  patron_id UUID REFERENCES users(id),
  meeting_schedule TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES school_clubs(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_date DATE DEFAULT CURRENT_DATE,
  academic_year VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  tenant_id UUID REFERENCES tenants(id),
  UNIQUE(student_id, club_id, academic_year)
);

-- ============================================================
-- 12. HOSTEL/BOARDING MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS hostels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  hostel_type VARCHAR(10) CHECK (hostel_type IN ('boys','girls','mixed')),
  capacity INTEGER DEFAULT 50,
  warden_id UUID REFERENCES users(id),
  warden_name VARCHAR(100),
  warden_phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_hostel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  hostel_id UUID NOT NULL REFERENCES hostels(id),
  room_number VARCHAR(20),
  bed_number VARCHAR(20),
  academic_year VARCHAR(10),
  term VARCHAR(10),
  check_in_date DATE,
  check_out_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  tenant_id UUID REFERENCES tenants(id),
  UNIQUE(student_id, academic_year, term)
);

-- ============================================================
-- 13. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cbc_assessments_student ON cbc_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_cbc_assessments_subject ON cbc_assessments(subject_id);
CREATE INDEX IF NOT EXISTS idx_cbc_assessments_class ON cbc_assessments(class_id);
CREATE INDEX IF NOT EXISTS idx_cbc_assessments_term_year ON cbc_assessments(term, academic_year);
CREATE INDEX IF NOT EXISTS idx_parent_alerts_parent ON parent_alerts(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_alerts_student ON parent_alerts(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_alerts_type ON parent_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_parent_alerts_read ON parent_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_discipline_student ON discipline_incidents(student_id);
CREATE INDEX IF NOT EXISTS idx_discipline_date ON discipline_incidents(incident_date);
CREATE INDEX IF NOT EXISTS idx_health_records_student ON student_health_records(student_id);
CREATE INDEX IF NOT EXISTS idx_transport_route ON student_transport(route_id);
CREATE INDEX IF NOT EXISTS idx_transport_student ON student_transport(student_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_student ON cbc_report_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_term_year ON cbc_report_cards(term, academic_year);
CREATE INDEX IF NOT EXISTS idx_competency_summary_student ON student_competency_summary(student_id);
CREATE INDEX IF NOT EXISTS idx_competency_summary_term ON student_competency_summary(term, academic_year);
CREATE INDEX IF NOT EXISTS idx_strands_subject ON cbc_strands(subject_id);
CREATE INDEX IF NOT EXISTS idx_sub_strands_strand ON cbc_sub_strands(strand_id);
CREATE INDEX IF NOT EXISTS idx_students_nemis ON students(nemis_number);
CREATE INDEX IF NOT EXISTS idx_academic_terms_current ON academic_terms(is_current);
CREATE INDEX IF NOT EXISTS idx_portfolios_student ON student_portfolios(student_id);
