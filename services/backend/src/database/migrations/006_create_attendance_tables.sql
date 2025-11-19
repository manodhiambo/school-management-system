CREATE TABLE IF NOT EXISTS attendance_sessions (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  session_id VARCHAR(36),
  status ENUM('present', 'absent', 'late', 'half_day', 'holiday', 'excused') NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  marked_by VARCHAR(36),
  method ENUM('manual', 'biometric', 'qr', 'rfid') DEFAULT 'manual',
  location JSON,
  reason TEXT,
  is_excused BOOLEAN DEFAULT FALSE,
  parent_notified BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_date_session (student_id, date, session_id),
  INDEX idx_date (date),
  INDEX idx_status (status),
  INDEX idx_student_id (student_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (marked_by) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attendance_summary (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  month DATE NOT NULL,
  total_days INT DEFAULT 0,
  present_days INT DEFAULT 0,
  absent_days INT DEFAULT 0,
  late_days INT DEFAULT 0,
  half_days INT DEFAULT 0,
  excused_days INT DEFAULT 0,
  attendance_percentage DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_month (student_id, month),
  INDEX idx_month (month),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
