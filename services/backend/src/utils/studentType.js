// Student boarding types (migration 095). A student is exactly one of these.
export const STUDENT_TYPES = ['day_scholar', 'full_time_boarder', 'weekly_boarder'];
export const BOARDER_STUDENT_TYPES = ['full_time_boarder', 'weekly_boarder'];

// Fee structures additionally accept 'all' (every student) and the legacy generic
// 'boarder' (both boarder subtypes) so a fee that doesn't differ between full-time and
// weekly boarding (e.g. a shared facility fee) doesn't need two near-duplicate structures.
export const FEE_STRUCTURE_STUDENT_TYPES = ['all', 'day_scholar', 'boarder', 'full_time_boarder', 'weekly_boarder'];

// Does a fee structure tagged `feeStudentType` apply to a student of `studentType`?
export function feeAppliesToStudentType(feeStudentType, studentType) {
  if (!feeStudentType || feeStudentType === 'all') return true;
  if (feeStudentType === studentType) return true;
  if (feeStudentType === 'boarder') return BOARDER_STUDENT_TYPES.includes(studentType);
  return false;
}

// SQL equivalent of feeAppliesToStudentType, for use inline in query strings.
// `alias` is the fee_structure table alias (e.g. 'fs'); `paramIndex` is the position of
// the already-bound student_type parameter (the SAME param is referenced twice, which
// postgres allows).
export function sqlFeeTypeMatch(alias, paramIndex) {
  return `(${alias}.student_type = 'all' OR ${alias}.student_type = $${paramIndex} OR (${alias}.student_type = 'boarder' AND $${paramIndex} = ANY(ARRAY['full_time_boarder','weekly_boarder'])))`;
}
