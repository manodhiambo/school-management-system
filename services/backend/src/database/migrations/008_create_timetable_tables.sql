CREATE TABLE IF NOT EXISTS periods (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  period_number INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_break BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_period_number (period_number)
);

CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(36) PRIMARY KEY,
  room_number VARCHAR(20) UNIQUE NOT NULL,
  room_name VARCHAR(100),
  building VARCHAR(50),
  floor INT,
  capacity INT DEFAULT 40,
  room_type ENUM('classroom', 'laboratory', 'library', 'auditorium', 'sports', 'other') DEFAULT 'classroom',
  facilities JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timetable (
  id VARCHAR(36) PRIMARY KEY,
  class_id VARCHAR(36) NOT NULL,
  subject_id VARCHAR(36) NOT NULL,
  teacher_id VARCHAR(36) NOT NULL,
  period_id VARCHAR(36) NOT NULL,
  room_id VARCHAR(36),
  day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_slot (day_of_week, period_id, class_id, academic_year),
  INDEX idx_class_day (class_id, day_of_week),
  INDEX idx_teacher_day (teacher_id, day_of_week),
  INDEX idx_room_day (room_id, day_of_week),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS substitutions (
  id VARCHAR(36) PRIMARY KEY,
  timetable_id VARCHAR(36),
  original_teacher_id VARCHAR(36) NOT NULL,
  substitute_teacher_id VARCHAR(36) NOT NULL,
  class_id VARCHAR(36) NOT NULL,
  subject_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  period_id VARCHAR(36) NOT NULL,
  reason TEXT,
  status ENUM('pending', 'approved', 'completed', 'cancelled') DEFAULT 'pending',
  notified_at TIMESTAMP NULL,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date),
  INDEX idx_substitute_teacher (substitute_teacher_id),
  FOREIGN KEY (timetable_id) REFERENCES timetable(id) ON DELETE SET NULL,
  FOREIGN KEY (original_teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY (substitute_teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
