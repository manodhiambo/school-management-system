CREATE TABLE IF NOT EXISTS subjects (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  category ENUM('core', 'elective', 'co_curricular', 'extra_curricular') DEFAULT 'core',
  credits INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_is_active (is_active)
);

CREATE TABLE IF NOT EXISTS classes (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  numeric_value INT NOT NULL,
  section VARCHAR(10) NOT NULL,
  class_teacher_id VARCHAR(36),
  max_students INT DEFAULT 40,
  current_strength INT DEFAULT 0,
  room_number VARCHAR(20),
  academic_year VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_class_section_year (name, section, academic_year),
  INDEX idx_academic_year (academic_year),
  INDEX idx_class_teacher (class_teacher_id),
  FOREIGN KEY (class_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS class_subjects (
  id VARCHAR(36) PRIMARY KEY,
  class_id VARCHAR(36) NOT NULL,
  subject_id VARCHAR(36) NOT NULL,
  teacher_id VARCHAR(36),
  is_optional BOOLEAN DEFAULT FALSE,
  weekly_hours INT DEFAULT 0,
  passing_marks DECIMAL(5,2) DEFAULT 33.00,
  max_marks DECIMAL(5,2) DEFAULT 100.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_class_subject (class_id, subject_id),
  INDEX idx_class_id (class_id),
  INDEX idx_teacher_id (teacher_id),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS exams (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type ENUM('unit_test', 'term', 'half_yearly', 'final', 'practical', 'internal') NOT NULL,
  session VARCHAR(20) NOT NULL,
  class_id VARCHAR(36),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  max_marks DECIMAL(6,2) NOT NULL,
  passing_marks DECIMAL(6,2) NOT NULL,
  weightage DECIMAL(3,2) DEFAULT 1.00,
  is_results_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP NULL,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_session (session),
  INDEX idx_class_id (class_id),
  INDEX idx_dates (start_date, end_date),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS exam_results (
  id VARCHAR(36) PRIMARY KEY,
  exam_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  subject_id VARCHAR(36) NOT NULL,
  marks_obtained DECIMAL(6,2) NOT NULL,
  grade VARCHAR(5),
  is_absent BOOLEAN DEFAULT FALSE,
  remarks TEXT,
  teacher_id VARCHAR(36),
  entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_exam_student_subject (exam_id, student_id, subject_id),
  INDEX idx_exam_id (exam_id),
  INDEX idx_student_id (student_id),
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS gradebook (
  id VARCHAR(36) PRIMARY KEY,
  class_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  subject_id VARCHAR(36) NOT NULL,
  assessment_type ENUM('homework', 'classwork', 'project', 'presentation', 'quiz', 'behavior', 'participation') NOT NULL,
  title VARCHAR(255) NOT NULL,
  marks DECIMAL(6,2) NOT NULL,
  max_marks DECIMAL(6,2) NOT NULL,
  grade VARCHAR(5),
  teacher_id VARCHAR(36),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_student_date (student_id, date),
  INDEX idx_class_subject (class_id, subject_id),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);
