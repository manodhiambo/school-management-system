import { query } from '../config/database.js';

// Whitelisted criteria keys -> the students column they filter on. Never
// accept raw SQL or arbitrary column names from the client - only these
// keys are ever consulted. Each key accepts either a scalar or an array
// (rendered as `= $n` or `= ANY($n)` respectively).
//
// NOTE: students.grade_level is intentionally NOT a criteria key even
// though the column exists - confirmed live, it is never populated by any
// admission/enrollment flow in this codebase (0 non-null rows across every
// tenant). The real per-grade signal is classes.grade_number (e.g. "Grade
// 9" = grade_number 9, shared across every stream/section) - see
// grade_number below, which resolves via a class lookup instead of a
// direct students-column equality.
const CRITERIA_FIELDS = {
  education_level: 's.education_level',
  student_type: 's.student_type',
  gender: 's.gender',
  special_needs: 's.special_needs',
  class_id: 's.class_id',
};

// Builds the WHERE fragment + params for the direct students-column
// criteria (everything in CRITERIA_FIELDS). Returns { conditions, params }.
function buildDirectConditions(criteria, startIndex) {
  const conditions = [];
  const params = [];
  let pi = startIndex;
  for (const key of Object.keys(criteria || {})) {
    if (key === 'grade_number') continue; // handled separately, see below
    const column = CRITERIA_FIELDS[key];
    const value = criteria[key];
    if (!column || value === null || value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      if (!value.length) continue;
      conditions.push(`${column} = ANY($${pi}::text[])`);
      params.push(value.map(String));
    } else {
      conditions.push(`${column} = $${pi}`);
      params.push(value);
    }
    pi++;
  }
  return { conditions, params };
}

// grade_number spans multiple classes (every stream/section of that
// grade), so it resolves to a set of class ids first, then filters
// students by s.class_id = ANY(...) - this is what actually makes "all of
// Grade 9" work, since no per-student grade column is reliably populated.
async function buildGradeNumberCondition(tenantId, criteria, startIndex) {
  if (criteria.grade_number === null || criteria.grade_number === undefined || criteria.grade_number === '') {
    return { condition: null, param: null };
  }
  const values = Array.isArray(criteria.grade_number) ? criteria.grade_number : [criteria.grade_number];
  const numericValues = values.map(v => parseInt(v, 10)).filter(v => !Number.isNaN(v));
  if (!numericValues.length) return { condition: null, param: null };

  const classRows = await query(
    `SELECT id FROM classes WHERE tenant_id = $1 AND grade_number = ANY($2::int[])`,
    [tenantId, numericValues]
  );
  const classIds = classRows.map(r => r.id);
  if (!classIds.length) return { condition: `FALSE`, param: null }; // no matching classes -> matches nobody
  return { condition: `s.class_id = ANY($${startIndex}::uuid[])`, param: classIds };
}

// Resolves a saved category (by id) to its full set of tenant-scoped
// active student ids: the union of dynamic-criteria matches (if
// is_dynamic) and manually-added members. Returns null if the category
// doesn't exist for this tenant (closes the same "forgot the tenant
// filter" hole this whole effort is fixing elsewhere).
export async function getCategoryStudentIds(tenantId, categoryId) {
  const catRows = await query(
    'SELECT * FROM student_categories WHERE id = $1 AND tenant_id = $2',
    [categoryId, tenantId]
  );
  if (!catRows.length) return null;
  const category = catRows[0];

  let dynamicIds = [];
  if (category.is_dynamic) {
    dynamicIds = await resolveCriteriaStudentIds(tenantId, category.criteria || {});
  }
  // A dynamic category with no criteria set yet matches nobody
  // automatically - it must not accidentally resolve to "every student".

  const memberRows = await query(
    'SELECT student_id FROM student_category_members WHERE category_id = $1',
    [categoryId]
  );
  const manualIds = memberRows.map(r => r.student_id);

  return Array.from(new Set([...dynamicIds, ...manualIds]));
}

async function resolveCriteriaStudentIds(tenantId, criteria) {
  const { conditions, params } = buildDirectConditions(criteria, 2);
  const { condition: gradeCondition, param: gradeParam } = await buildGradeNumberCondition(
    tenantId, criteria, 2 + params.length
  );
  if (gradeCondition === 'FALSE') return [];
  if (gradeCondition) { conditions.push(gradeCondition); if (gradeParam) params.push(gradeParam); }

  if (!conditions.length) return [];
  const rows = await query(
    `SELECT s.id FROM students s
     WHERE s.tenant_id = $1 AND s.status = 'active' AND ${conditions.join(' AND ')}`,
    [tenantId, ...params]
  );
  return rows.map(r => r.id);
}

// Preview: resolve criteria that hasn't been saved yet (used by the
// create-category form to show "this matches N students" before saving).
export async function previewCriteriaStudentIds(tenantId, criteria) {
  return resolveCriteriaStudentIds(tenantId, criteria || {});
}

export const STUDENT_CATEGORY_CRITERIA_KEYS = [...Object.keys(CRITERIA_FIELDS), 'grade_number'];
