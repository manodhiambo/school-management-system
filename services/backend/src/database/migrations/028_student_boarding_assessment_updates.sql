-- Migration 028: Student boarding type, assessment exam period/result code, staff leave requests

-- 1. Add student_type (boarder/day_scholar) to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS student_type VARCHAR(20) DEFAULT 'day_scholar'
    CHECK (student_type IN ('boarder', 'day_scholar'));

-- 2. Add exam_period to cbc_assessments (mid_term / end_term)
ALTER TABLE cbc_assessments
  ADD COLUMN IF NOT EXISTS exam_period VARCHAR(20)
    CHECK (exam_period IN ('mid_term', 'end_term', NULL));

-- 3. Add result_code to cbc_assessments (WD = withheld, Y = missed exam)
ALTER TABLE cbc_assessments
  ADD COLUMN IF NOT EXISTS result_code VARCHAR(5)
    CHECK (result_code IN ('WD', 'Y', NULL));

-- 4. Staff leave/permission requests table
CREATE TABLE IF NOT EXISTS staff_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_name VARCHAR(200),
  staff_role VARCHAR(50),
  leave_type VARCHAR(30) NOT NULL
    CHECK (leave_type IN ('annual', 'sick', 'maternity', 'paternity', 'compassionate', 'permission', 'unpaid', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested INTEGER,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_leave_tenant ON staff_leave_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_leave_user ON staff_leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_leave_status ON staff_leave_requests(status);
