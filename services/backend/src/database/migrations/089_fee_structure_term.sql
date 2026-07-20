-- Lets a fee structure vary by term (e.g. Term 1 tuition higher than Term 3)
-- instead of one fixed amount applied identically all year. NULL means the
-- fee applies every term unchanged (transport, lunch, and any other
-- non-term-varying fee types keep working exactly as before).
ALTER TABLE fee_structure ADD COLUMN IF NOT EXISTS term VARCHAR(10);

ALTER TABLE fee_structure DROP CONSTRAINT IF EXISTS fee_structure_term_check;
ALTER TABLE fee_structure ADD CONSTRAINT fee_structure_term_check
  CHECK (term IS NULL OR term IN ('term1', 'term2', 'term3'));

CREATE INDEX IF NOT EXISTS idx_fee_structure_term ON fee_structure(term);
