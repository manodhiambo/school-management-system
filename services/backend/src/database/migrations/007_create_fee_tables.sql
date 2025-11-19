CREATE TABLE IF NOT EXISTS fee_structure (
  id VARCHAR(36) PRIMARY KEY,
  class_id VARCHAR(36),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  frequency ENUM('monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time') NOT NULL,
  due_day INT DEFAULT 10,
  late_fee_amount DECIMAL(10,2) DEFAULT 0,
  late_fee_per_day DECIMAL(10,2) DEFAULT 0,
  grace_period_days INT DEFAULT 0,
  is_mandatory BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_class_id (class_id),
  INDEX idx_academic_year (academic_year),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fee_discounts (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type ENUM('percentage', 'fixed') NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  applicable_to ENUM('all', 'specific') DEFAULT 'all',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_fee_discounts (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  discount_id VARCHAR(36) NOT NULL,
  applied_by VARCHAR(36),
  reason TEXT,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_student_id (student_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (discount_id) REFERENCES fee_discounts(id) ON DELETE CASCADE,
  FOREIGN KEY (applied_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS fee_invoices (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  month DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  late_fee_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  balance_amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_student_month (student_id, month),
  INDEX idx_status (status),
  INDEX idx_invoice_number (invoice_number),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS fee_invoice_items (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36) NOT NULL,
  fee_structure_id VARCHAR(36),
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice_id (invoice_id),
  FOREIGN KEY (invoice_id) REFERENCES fee_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (fee_structure_id) REFERENCES fee_structure(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS fee_payments (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36) NOT NULL,
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  payment_method ENUM('cash', 'cheque', 'card', 'upi', 'net_banking', 'wallet', 'other') NOT NULL,
  transaction_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  collected_by VARCHAR(36),
  bank_name VARCHAR(100),
  cheque_number VARCHAR(50),
  cheque_date DATE,
  gateway_response JSON,
  receipt_url VARCHAR(500),
  remarks TEXT,
  status ENUM('success', 'pending', 'failed', 'refunded') DEFAULT 'success',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice_id (invoice_id),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_receipt_number (receipt_number),
  FOREIGN KEY (invoice_id) REFERENCES fee_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (collected_by) REFERENCES users(id) ON DELETE SET NULL
);
