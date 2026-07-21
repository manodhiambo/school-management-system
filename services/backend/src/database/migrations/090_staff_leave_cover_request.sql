-- Cover-request workflow for staff leave: a leave application must name a
-- colleague to cover for the applicant, who then accepts or declines. Kept
-- nullable at the DB level (existing rows predate this) — enforced as
-- required by the application layer on new submissions.
ALTER TABLE staff_leave_requests
  ADD COLUMN IF NOT EXISTS covering_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cover_status VARCHAR(20) DEFAULT 'pending' CHECK (cover_status IN ('pending','accepted','declined')),
  ADD COLUMN IF NOT EXISTS cover_responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cover_response_note TEXT;

CREATE INDEX IF NOT EXISTS idx_staff_leave_requests_covering_staff ON staff_leave_requests(covering_staff_id);
