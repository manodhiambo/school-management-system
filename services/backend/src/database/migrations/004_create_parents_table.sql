CREATE TABLE IF NOT EXISTS parents (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  relationship ENUM('father', 'mother', 'guardian', 'other'),
  occupation VARCHAR(100),
  annual_income DECIMAL(12,2),
  education VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  phone_primary VARCHAR(15) NOT NULL,
  phone_secondary VARCHAR(15),
  email_secondary VARCHAR(255),
  aadhar_number VARCHAR(12),
  profile_photo_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone_primary (phone_primary),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS parent_students (
  id VARCHAR(36) PRIMARY KEY,
  parent_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  relationship ENUM('father', 'mother', 'guardian', 'other') NOT NULL,
  is_primary_contact BOOLEAN DEFAULT FALSE,
  can_pickup BOOLEAN DEFAULT FALSE,
  receive_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_parent_student (parent_id, student_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_student_id (student_id),
  FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
