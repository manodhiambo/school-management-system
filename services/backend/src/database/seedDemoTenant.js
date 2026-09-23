/**
 * Finds (or creates) the single public demo tenant and resets it to a fresh,
 * realistic showcase dataset — called once at server startup and nightly by
 * jobs/demoResetJob.js. The tenant row itself is kept stable across resets
 * (same id/email/school_code); only its child data is wiped and reseeded, so
 * anything a visitor did during the day is gone by morning.
 *
 * Uses the shared `query()` helper like the rest of the codebase (no
 * dedicated transaction wrapper exists here) — reuses seedTenantData(), the
 * same idempotent baseline seeder every real tenant registration calls, for
 * chart of accounts / finance settings / school settings / academic year /
 * financial year, so it has to run against already-wiped rows, not
 * mid-transaction ones.
 */
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import { seedTenantData } from '../utils/seedTenantData.js';
import { setDemoTenantId } from '../services/demoTenant.js';

const DEMO_SCHOOL_EMAIL = 'demo@skulmanager.org';
const DEMO_ADMIN_EMAIL = 'admin@demo.skulmanager.org';
const DEMO_TEACHER_EMAIL = 'teacher@demo.skulmanager.org';
const DEMO_PARENT_EMAIL = 'parent@demo.skulmanager.org';
const DEMO_STUDENT1_EMAIL = 'student1@demo.skulmanager.org';
const DEMO_STUDENT2_EMAIL = 'student2@demo.skulmanager.org';
const DEMO_FINANCE_EMAIL = 'finance@demo.skulmanager.org';
const DEMO_DRIVER_EMAIL = 'driver@demo.skulmanager.org';
const DEMO_SECURITY_EMAIL = 'security@demo.skulmanager.org';
const DEMO_TECHNICIAN_EMAIL = 'technician@demo.skulmanager.org';
const DEMO_ALUMNI_EMAIL = 'alumni@demo.skulmanager.org';

// The showcase accounts offered on the login page's "log in as" picker (see
// GET /auth/demo-users in authRoutes.js). seedShowcaseData() below also
// creates many more background people (extra students/parents/teachers) to
// make the tenant's lists/reports look realistic - those must NOT show up
// in the picker, so authRoutes.js filters to exactly this set rather than
// querying "every user in the demo tenant".
export const DEMO_SHOWCASE_EMAILS = [
  DEMO_ADMIN_EMAIL, DEMO_TEACHER_EMAIL, DEMO_PARENT_EMAIL,
  DEMO_STUDENT1_EMAIL, DEMO_STUDENT2_EMAIL, DEMO_FINANCE_EMAIL,
  DEMO_DRIVER_EMAIL, DEMO_SECURITY_EMAIL, DEMO_TECHNICIAN_EMAIL, DEMO_ALUMNI_EMAIL,
];

// Builds one multi-row INSERT from an array of value-tuples. The demo reset
// runs inside a Vercel function with a 30s hard timeout (vercel.json), and
// this seeder creates several hundred rows - issuing one round-trip per row
// (as the rest of this codebase's query() call sites normally do) would
// burn most of that budget on network latency alone. Batching per table
// keeps the whole reset to a couple dozen round-trips regardless of how
// much showcase data it creates. `table`/`columns` must be static trusted
// strings (never request input) since they're interpolated directly.
async function insertRows(table, columns, rows) {
  if (!rows.length) return;
  const values = [];
  const tuples = rows.map((row) => {
    const placeholders = row.map((v) => { values.push(v); return `$${values.length}`; });
    return `(${placeholders.join(',')})`;
  });
  await query(`INSERT INTO ${table} (${columns.join(',')}) VALUES ${tuples.join(',')}`, values);
}

function cbeGrade(percentage) {
  if (percentage >= 75) return 'EE';
  if (percentage >= 50) return 'ME';
  if (percentage >= 25) return 'AE';
  return 'BE';
}

async function findOrCreateDemoTenant() {
  const existing = await query('SELECT * FROM tenants WHERE is_demo = TRUE LIMIT 1');
  if (existing.length > 0) return existing[0];

  const byEmail = await query('SELECT * FROM tenants WHERE email = $1', [DEMO_SCHOOL_EMAIL]);
  if (byEmail.length > 0) {
    const updated = await query(
      `UPDATE tenants SET is_demo = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [byEmail[0].id]
    );
    return updated[0];
  }

  const created = await query(
    `INSERT INTO tenants (
       school_name, email, phone, address, county, country,
       admin_email, school_code, subdomain, schema_name,
       status, is_demo, updated_at
     ) VALUES ($1,$2,$3,$4,$5,'Kenya',$6,$7,$8,$9,'active',TRUE,NOW())
     RETURNING *`,
    [
      'SkulManager Demo Academy', DEMO_SCHOOL_EMAIL, '+254700000000',
      'Nairobi, Kenya', 'Nairobi', DEMO_ADMIN_EMAIL,
      'SKULDEMO01', 'skulmanager-demo', 'tenant_skuldemo01',
    ]
  );
  return created[0];
}

// Discovers every table that (directly or transitively) has a foreign key
// pointing at one of `rootTables`, and deletes its tenant-scoped rows in
// dependency order (deepest descendants first) BEFORE the caller deletes
// the root tables themselves. This is what actually failed before: the
// explicit DELETE FROM teachers below has no idea an `assignments` table
// (or any of the ~30 other tables that reference students/teachers/
// classes/subjects) exists, so any FK violation there aborted the whole
// reset and left the tenant half-wiped (this is the exact bug behind the
// "My Fees: student not found" report on 2026-07-28 — the reset had
// silently been failing every night since, so students were deleted but
// never re-seeded). Reading the FK graph from information_schema instead
// of hand-listing tables means a newly added table can never reintroduce
// this failure mode.
async function wipeTenantRowsReferencing(tenantId, rootTables) {
  const fkRows = await query(`
    SELECT tc.table_name AS child_table, kcu.column_name AS child_column, ccu.table_name AS parent_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      AND tc.table_name != ccu.table_name
  `);

  // Indexed by PARENT table: childrenOf['teachers'] = every FK edge whose
  // referenced table is 'teachers' (i.e. every table that points AT it).
  const childrenOf = {};
  for (const r of fkRows) {
    (childrenOf[r.parent_table] ||= []).push(r);
  }

  // Post-order DFS from the root tables: every descendant is visited (and
  // pushed to `order`) before the table that references it, so `order`
  // lists deepest descendants first, root tables last.
  const rootSet = new Set(rootTables);
  const visited = new Set();
  const order = [];
  const scopeOf = {}; // table -> { column, parent } — the FK edge used to reach it
  function visit(table, viaColumn, viaParent) {
    if (visited.has(table)) return;
    visited.add(table);
    if (viaColumn) scopeOf[table] = { column: viaColumn, parent: viaParent };
    for (const fk of (childrenOf[table] || [])) {
      visit(fk.child_table, fk.child_column, table);
    }
    order.push(table);
  }
  for (const t of rootTables) visit(t);

  // Builds "<table>.<col> IN (SELECT id FROM <parent> WHERE <parent's own
  // scope>)" recursively, bottoming out at a root table's tenant_id — NOT
  // at the immediate parent's tenant_id, which most non-root tables don't
  // have. Memoized since the same parent chain is reused by many siblings.
  const scopeSqlCache = {};
  function scopeSql(table) {
    if (scopeSqlCache[table]) return scopeSqlCache[table];
    const sql = rootSet.has(table)
      ? `"${table}".tenant_id = $1`
      : (() => {
          const { column, parent } = scopeOf[table];
          return `"${table}"."${column}" IN (SELECT id FROM "${parent}" WHERE ${scopeSql(parent)})`;
        })();
    scopeSqlCache[table] = sql;
    return sql;
  }

  for (const table of order) {
    if (rootSet.has(table)) continue; // caller deletes root tables itself
    await query(`DELETE FROM "${table}" WHERE ${scopeSql(table)}`, [tenantId]).catch(err => {
      logger.warn(`Demo wipe: could not clear "${table}" — ${err.message}`);
    });
  }
}

async function wipeDemoTenantData(tenantId) {
  await query('DELETE FROM exam_results WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM exams WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM attendance WHERE tenant_id = $1', [tenantId]);
  // A DB trigger (trigger_sync_fee_to_income) auto-creates income_records from
  // fee_payments; delete via the student join since this must run before
  // students are deleted (that FK has no ON DELETE CASCADE).
  await query(
    'DELETE FROM income_records WHERE student_id IN (SELECT id FROM students WHERE tenant_id = $1)',
    [tenantId]
  );
  await query('DELETE FROM fee_payments WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM fee_invoices WHERE tenant_id = $1', [tenantId]);
  await query(
    'DELETE FROM parent_students WHERE student_id IN (SELECT id FROM students WHERE tenant_id = $1)',
    [tenantId]
  );
  // transport_routes.driver_user_id and visitors.blacklisted_by are both
  // nullable/no-FK-constraint columns (see migration 048's deliberate
  // "nofk" choice for the former) — neither table is reachable by the
  // generic FK-graph walker below, nor cascades from any root table's
  // deletion, so without this they'd silently accumulate across every
  // nightly reset instead of being cleared. student_transport/visitor_visits
  // both cascade off these via ON DELETE CASCADE, so deleting the parent
  // row here is sufficient for both pairs.
  await query('DELETE FROM transport_routes WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM visitors WHERE tenant_id = $1', [tenantId]);
  // Clears every table that references teachers/students/classes/subjects/
  // parents/users (assignments, timetable, library_members, payroll_entries,
  // exam_attempts, staff_leave_requests, and everything else the FK graph
  // turns up) before the explicit deletes below run.
  await wipeTenantRowsReferencing(tenantId, ['teachers', 'students', 'classes', 'subjects', 'parents', 'users']);
  await query('DELETE FROM students WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM parents WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM teachers WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM classes WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM subjects WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM financial_years WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM academic_years WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM chart_of_accounts WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM finance_settings WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM settings WHERE tenant_id = $1', [tenantId]);
  // alumni_profiles/donations/event_registrations cascade off users.id, but
  // alumni_events/alumni_job_postings only SET NULL their creator FK, so
  // they'd otherwise survive as orphans across resets — delete explicitly.
  await query('DELETE FROM alumni_event_registrations WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM alumni_events WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM alumni_job_postings WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM alumni_donations WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM alumni_profiles WHERE tenant_id = $1', [tenantId]);
  await query('DELETE FROM users WHERE tenant_id = $1', [tenantId]);
}

async function randomPasswordHash() {
  // Never surfaced anywhere — the demo is only ever entered via the
  // one-click /auth/demo-login endpoint, so there's no credential to guess
  // or leak.
  return bcrypt.hash(crypto.randomBytes(24).toString('hex'), 12);
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function randomScore(base) {
  const val = Math.round(base + (Math.random() * 30 - 15));
  return Math.min(98, Math.max(20, val));
}

// Class/subject/teacher layout ─────────────────────────────────────────────
// classIndex order below is reused throughout (students, transport, exams).
const CLASS_DEFS = [
  ['Grade 3', 'Red', 'lower_primary', 3],
  ['Grade 5', 'Blue', 'lower_primary', 5],
  ['Grade 8', 'Gold', 'junior_secondary', 8],
  ['Grade 10', 'Green', 'senior_secondary', 10],
];
const SUBJECT_DEFS = [
  ['English', 'ENG'], ['Mathematics', 'MAT'], ['Kiswahili', 'KIS'],
  ['Integrated Science', 'SCI'], ['Social Studies', 'SST'],
];
// [firstName, lastName, email|null (null = auto-generated), subjectIndex, classTeacherOfClassIndex|null, qualification]
const TEACHER_DEFS = [
  ['Jane', 'Wanjiru', DEMO_TEACHER_EMAIL, 1, 1, 'B.Ed Mathematics'],
  ['Peter', 'Mwangi', null, 0, 0, 'B.Ed English'],
  ['Grace', 'Achieng', null, 3, 2, 'B.Ed Science'],
  ['Samuel', 'Kiprotich', null, 4, 3, 'B.Ed Social Studies'],
  ['Mary', 'Njeri', null, 2, null, 'B.Ed Kiswahili'],
];
// [firstName, lastName, gender, classIndex, email|null]
const STUDENT_DEFS = [
  ['Faith', 'Wambui', 'female', 0, null],
  ['Kevin', 'Mutiso', 'male', 0, null],
  ['Rebecca', 'Nyambura', 'female', 0, null],
  ['Victor', 'Omondi', 'male', 0, null],
  ['Gladys', 'Cherono', 'female', 0, null],
  ['Amina', 'Otieno', 'female', 1, DEMO_STUDENT1_EMAIL],
  ['Diana', 'Chebet', 'female', 1, null],
  ['Joseph', 'Kariuki', 'male', 1, null],
  ['Esther', 'Chepkoech', 'female', 1, null],
  ['Anthony', 'Mbugua', 'male', 1, null],
  ['Brian', 'Otieno', 'male', 2, DEMO_STUDENT2_EMAIL],
  ['Lucy', 'Naliaka', 'female', 2, null],
  ['Dennis', 'Mbugua', 'male', 2, null],
  ['Winnie', 'Auma', 'female', 2, null],
  ['Collins', 'Rotich', 'male', 2, null],
  ['Sharon', 'Kiptoo', 'female', 3, null],
  ['Michael', 'Wafula', 'male', 3, null],
  ['Purity', 'Wanjiku', 'female', 3, null],
  ['Emmanuel', 'Kiplangat', 'male', 3, null],
  ['Felix', 'Barasa', 'male', 3, null],
];
// Families group students under one or more guardians (indices into
// STUDENT_DEFS) — covers single-parent, multi-child, and multi-guardian
// (both father and mother linked to the same child) demo scenarios, all
// via the parent_students junction table.
const FAMILY_DEFS = [
  { studentIndices: [5, 10], parents: [
    ['Peter', 'Otieno', 'father', DEMO_PARENT_EMAIL, '+254711000000', 'Engineer'],
    ['Grace', 'Otieno', 'mother', null, '+254711000001', 'Nurse'],
  ] },
  { studentIndices: [9, 12], parents: [['Francis', 'Mbugua', 'father', null, '+254711000002', 'Businessman']] },
  { studentIndices: [0], parents: [['Mary', 'Wambui', 'mother', null, '+254711000010', 'Teacher']] },
  { studentIndices: [1], parents: [['John', 'Mutiso', 'father', null, '+254711000011', 'Farmer']] },
  { studentIndices: [2], parents: [['Alice', 'Nyambura', 'mother', null, '+254711000012', 'Accountant']] },
  { studentIndices: [3], parents: [['George', 'Omondi', 'father', null, '+254711000013', 'Bus Driver']] },
  { studentIndices: [4], parents: [['Ruth', 'Cherono', 'mother', null, '+254711000014', 'Nurse']] },
  { studentIndices: [6], parents: [['Daniel', 'Chebet', 'father', null, '+254711000015', 'Mechanic']] },
  { studentIndices: [7], parents: [['Elizabeth', 'Kariuki', 'mother', null, '+254711000016', 'Shopkeeper']] },
  { studentIndices: [8], parents: [['Simon', 'Chepkoech', 'father', null, '+254711000017', 'Clergy']] },
  { studentIndices: [11], parents: [['Agnes', 'Naliaka', 'mother', null, '+254711000018', 'Trader']] },
  { studentIndices: [13], parents: [['Tom', 'Auma', 'father', null, '+254711000019', 'Electrician']] },
  { studentIndices: [14], parents: [['Nancy', 'Rotich', 'mother', null, '+254711000020', 'Nurse']] },
  { studentIndices: [15], parents: [['Paul', 'Kiptoo', 'father', null, '+254711000021', 'Police Officer']] },
  { studentIndices: [16], parents: [['Catherine', 'Wafula', 'mother', null, '+254711000022', 'Doctor']] },
  { studentIndices: [17], parents: [['Stephen', 'Wanjiku', 'father', null, '+254711000023', 'Lawyer']] },
  { studentIndices: [18], parents: [['Josephine', 'Kiplangat', 'mother', null, '+254711000024', 'Banker']] },
  { studentIndices: [19], parents: [['Robert', 'Barasa', 'father', null, '+254711000025', 'Pilot']] },
];
const EDUCATION_LEVEL_FEES = { lower_primary: 12000, upper_primary: 13000, junior_secondary: 15000, senior_secondary: 18000 };

async function seedShowcaseData(tenant) {
  const tenantId = tenant.id;
  const currentYear = new Date().getFullYear().toString();
  const today = new Date();
  // Reused for every generated user's password hash — it's never checked
  // anywhere (the demo is only ever entered via the passwordless one-click
  // /auth/demo-login endpoint), so hashing once instead of once-per-user
  // saves ~50 bcrypt calls (~150ms each) against the 30s serverless budget.
  const passwordHash = await randomPasswordHash();

  // ── People: build every user row up front, then insert in one batch ─────
  const userRows = []; // [id, email, password, role, tenantId, firstName, lastName, is_active, is_verified]
  const addUser = (email, role, firstName, lastName) => {
    const id = uuidv4();
    userRows.push([id, email, passwordHash, role, tenantId, firstName, lastName, true, true]);
    return id;
  };

  const adminUserId = addUser(DEMO_ADMIN_EMAIL, 'admin', 'Demo', 'Admin');
  addUser(DEMO_FINANCE_EMAIL, 'finance_officer', 'Susan', 'Kamau');
  const driverUserId = addUser(DEMO_DRIVER_EMAIL, 'driver', 'Moses', 'Kiptoo');
  const securityUserId = addUser(DEMO_SECURITY_EMAIL, 'security', 'James', 'Mwangi');
  const technicianUserId = addUser(DEMO_TECHNICIAN_EMAIL, 'technician', 'David', 'Mutua');
  const alumniUserId = addUser(DEMO_ALUMNI_EMAIL, 'alumni', 'Esther', 'Wambui');

  const teacherUserIds = TEACHER_DEFS.map(([firstName, lastName, email]) =>
    addUser(email || `teacher.${firstName}${lastName}`.toLowerCase() + '@demo.skulmanager.org', 'teacher', firstName, lastName));

  const familyParents = []; // flattened [{userId, firstName, lastName, relationship, phone, occupation}]
  const familyByStudentIndex = new Map(); // studentIndex -> array of parent entries
  for (const family of FAMILY_DEFS) {
    const entries = family.parents.map(([firstName, lastName, relationship, email, phone, occupation]) => {
      const id = addUser(email || `parent.${firstName}${lastName}`.toLowerCase() + '@demo.skulmanager.org', 'parent', firstName, lastName);
      const entry = { userId: id, firstName, lastName, relationship, phone, occupation };
      familyParents.push(entry);
      return entry;
    });
    for (const studentIndex of family.studentIndices) familyByStudentIndex.set(studentIndex, entries);
  }

  const studentUserIds = STUDENT_DEFS.map(([firstName, lastName, , , email]) =>
    addUser(email || `student.${firstName}${lastName}`.toLowerCase() + '@demo.skulmanager.org', 'student', firstName, lastName));

  await insertRows('users',
    ['id', 'email', 'password', 'role', 'tenant_id', 'first_name', 'last_name', 'is_active', 'is_verified'],
    userRows);

  await insertRows('alumni_profiles',
    ['id', 'tenant_id', 'user_id', 'first_name', 'last_name', 'graduation_year', 'current_occupation', 'employer', 'university', 'is_mentor', 'is_public'],
    [[uuidv4(), tenantId, alumniUserId, 'Esther', 'Wambui', 2020, 'Software Engineer', 'Acme Kenya Ltd', 'University of Nairobi', true, true]]);

  // ── Academics: classes + subjects + teachers ─────────────────────────────
  const subjectIds = SUBJECT_DEFS.map(() => uuidv4());
  await insertRows('subjects', ['id', 'name', 'code', 'credits', 'is_active', 'category', 'tenant_id'],
    SUBJECT_DEFS.map(([name, code], i) => [subjectIds[i], name, code, 1, true, 'core', tenantId]));

  const teacherIds = TEACHER_DEFS.map(() => uuidv4());
  await insertRows('teachers',
    ['id', 'user_id', 'tenant_id', 'first_name', 'last_name', 'employee_id', 'qualification', 'specialization', 'status'],
    TEACHER_DEFS.map(([firstName, lastName, , subjectIndex, , qualification], i) =>
      [teacherIds[i], teacherUserIds[i], tenantId, firstName, lastName, `DEMO-T${String(i + 1).padStart(3, '0')}`, qualification, SUBJECT_DEFS[subjectIndex][0], 'active']));

  await insertRows('parents',
    ['id', 'user_id', 'first_name', 'last_name', 'relationship', 'phone_primary', 'occupation', 'tenant_id'],
    familyParents.map((p) => {
      p.id = uuidv4();
      return [p.id, p.userId, p.firstName, p.lastName, p.relationship, p.phone, p.occupation, tenantId];
    }));

  const classIds = CLASS_DEFS.map(() => uuidv4());
  await insertRows('classes',
    ['id', 'name', 'section', 'capacity', 'academic_year', 'education_level', 'grade_number', 'tenant_id', 'is_active', 'class_teacher_id'],
    CLASS_DEFS.map(([name, section, level, grade], classIndex) => {
      const homeroomTeacher = TEACHER_DEFS.findIndex(([, , , , classTeacherOf]) => classTeacherOf === classIndex);
      return [classIds[classIndex], name, section, 40, currentYear, level, grade, tenantId, true,
        homeroomTeacher >= 0 ? teacherUserIds[homeroomTeacher] : null];
    }));

  // Every subject taught by its one specialist teacher, across all 4 classes.
  const classSubjectRows = [];
  for (const classId of classIds) {
    TEACHER_DEFS.forEach(([, , , subjectIndex], teacherIndex) => {
      classSubjectRows.push([uuidv4(), classId, subjectIds[subjectIndex], teacherUserIds[teacherIndex], tenantId]);
    });
  }
  await insertRows('class_subjects', ['id', 'class_id', 'subject_id', 'teacher_id', 'tenant_id'], classSubjectRows);

  // ── Students ──────────────────────────────────────────────────────────
  const studentIds = STUDENT_DEFS.map(() => uuidv4());
  const admissionDate = today.toISOString().slice(0, 10);
  await insertRows('students',
    ['id', 'user_id', 'admission_number', 'first_name', 'last_name', 'gender', 'class_id', 'parent_id', 'admission_date', 'tenant_id', 'status', 'education_level'],
    STUDENT_DEFS.map(([firstName, lastName, gender, classIndex], i) => {
      const primaryParent = familyByStudentIndex.get(i)[0];
      return [studentIds[i], studentUserIds[i], `DEMO${currentYear}${String(i + 1).padStart(4, '0')}`,
        firstName, lastName, gender, classIds[classIndex], primaryParent.id, admissionDate, tenantId, 'active', CLASS_DEFS[classIndex][2]];
    }));

  const parentStudentRows = [];
  STUDENT_DEFS.forEach((_, i) => {
    for (const parent of familyByStudentIndex.get(i)) {
      parentStudentRows.push([parent.id, studentIds[i]]);
    }
  });
  await insertRows('parent_students', ['parent_id', 'student_id'], parentStudentRows);

  // ── Finance: baseline (chart of accounts, settings, academic/financial year) ──
  // Must run after wipeDemoTenantData() has fully removed the old rows, since
  // this is idempotent and no-ops if it finds a settings/academic_year row
  // already there.
  await seedTenantData(tenantId, {
    schoolName: tenant.school_name,
    email: tenant.email,
    phone: tenant.phone,
    schoolCode: tenant.school_code,
  });

  // ── Finance: one invoice per student, a realistic spread of payment states ──
  const invoiceRows = [];
  const paymentRows = [];
  STUDENT_DEFS.forEach(([, , , classIndex], i) => {
    const total = EDUCATION_LEVEL_FEES[CLASS_DEFS[classIndex][2]];
    const invoiceId = uuidv4();
    const state = i % 3; // 0=paid, 1=partial, 2=pending (unpaid)
    const paid = state === 0 ? total : state === 1 ? Math.round(total * 0.55) : 0;
    const status = state === 0 ? 'paid' : state === 1 ? 'partial' : 'pending';
    invoiceRows.push([invoiceId, `DEMO-INV-${String(i + 1).padStart(4, '0')}`, studentIds[i], total, total, paid, total - paid, addDays(30), status, tenantId]);
    if (paid > 0) {
      paymentRows.push([uuidv4(), invoiceId, studentIds[i], paid, i % 2 === 0 ? 'mpesa' : 'cash', `DEMO-RCT-${String(i + 1).padStart(4, '0')}`, 'success', today, tenantId]);
    }
  });
  await insertRows('fee_invoices',
    ['id', 'invoice_number', 'student_id', 'total_amount', 'net_amount', 'paid_amount', 'balance_amount', 'due_date', 'status', 'tenant_id'],
    invoiceRows);
  await insertRows('fee_payments',
    ['id', 'invoice_id', 'student_id', 'amount', 'payment_method', 'receipt_number', 'status', 'payment_date', 'tenant_id'],
    paymentRows);

  // ── Exams: all 3 terms per class, term1+term2 published, term3 pending ───
  const TERM_DEFS = [
    { term: 'term1', label: 'Term 1', startOffset: -150, endOffset: -148, published: true },
    { term: 'term2', label: 'Term 2', startOffset: -60, endOffset: -58, published: true },
    { term: 'term3', label: 'Term 3', startOffset: -5, endOffset: -3, published: false },
  ];
  const examRows = [];
  const examResultRows = [];
  const studentAbility = studentIds.map(() => 45 + Math.random() * 40); // per-student baseline, kept across terms/subjects for realism
  classIds.forEach((classId, classIndex) => {
    const studentIndicesInClass = STUDENT_DEFS.map((s, i) => (s[3] === classIndex ? i : -1)).filter((i) => i >= 0);
    TERM_DEFS.forEach(({ term, label, startOffset, endOffset, published }, termIndex) => {
      const examId = uuidv4();
      examRows.push([examId, `${label} Exam`, `${label} end-of-term assessment`, 'endterm', currentYear, term,
        addDays(startOffset), addDays(endOffset), classId, 'offline', tenantId, true, published]);
      for (const studentIndex of studentIndicesInClass) {
        for (let subjectIndex = 0; subjectIndex < subjectIds.length; subjectIndex++) {
          const marks = randomScore(studentAbility[studentIndex] + termIndex * 3);
          examResultRows.push([uuidv4(), tenantId, examId, studentIds[studentIndex], subjectIds[subjectIndex], marks, 100, cbeGrade(marks), false]);
        }
      }
    });
  });
  await insertRows('exams',
    ['id', 'name', 'description', 'exam_type', 'academic_year', 'term', 'start_date', 'end_date', 'class_id', 'mode', 'tenant_id', 'is_active', 'is_results_published'],
    examRows);
  await insertRows('exam_results',
    ['id', 'tenant_id', 'exam_id', 'student_id', 'subject_id', 'marks_obtained', 'max_marks', 'cbc_grade', 'is_absent'],
    examResultRows);

  // ── Attendance: last 8 school weekdays, mostly present with a little variety ──
  const attendanceRows = [];
  studentIds.forEach((studentId) => {
    for (let dayOffset = 1; dayOffset <= 8; dayOffset++) {
      const roll = Math.random();
      const status = roll < 0.05 ? 'absent' : roll < 0.12 ? 'late' : 'present';
      attendanceRows.push([uuidv4(), studentId, addDays(-dayOffset), status, tenantId]);
    }
  });
  await insertRows('attendance', ['id', 'student_id', 'date', 'status', 'tenant_id'], attendanceRows);

  // ── Transport: one route with a real driver + vehicle, 8 students on it ──
  const routeId = uuidv4();
  await insertRows('transport_routes',
    ['id', 'route_name', 'route_code', 'vehicle_registration', 'vehicle_capacity', 'driver_name', 'driver_phone', 'driver_user_id',
     'morning_pickup_time', 'afternoon_dropoff_time', 'stops', 'monthly_fee', 'term_fee', 'tenant_id', 'is_active'],
    [[routeId, 'Route A - Town Loop', 'RT-A', 'KDA 123A', 33, 'Moses Kiptoo', '+254712000000', driverUserId,
      '06:30', '16:30', JSON.stringify(['Town Center', 'Riverside', 'Greenfield Estate', 'School Gate']), 3500, 9000, tenantId, true]]);

  const transportStudentIndices = [0, 2, 5, 7, 10, 13, 15, 18]; // 2 per class
  const stopNames = ['Town Center', 'Riverside', 'Greenfield Estate'];
  await insertRows('student_transport', ['id', 'student_id', 'route_id', 'pickup_stop', 'dropoff_stop', 'assigned_date', 'is_active', 'tenant_id'],
    transportStudentIndices.map((studentIndex, i) => {
      const stop = stopNames[i % stopNames.length];
      return [uuidv4(), studentIds[studentIndex], routeId, stop, stop, admissionDate, true, tenantId];
    }));

  // ── Gate security: a visitor currently on campus + one already checked out ──
  const visitorIds = [uuidv4(), uuidv4()];
  await insertRows('visitors', ['id', 'tenant_id', 'full_name', 'phone', 'email', 'gender', 'organization', 'notes'],
    [
      [visitorIds[0], tenantId, 'Susan Achieng', '+254722000001', null, 'female', null, 'Visiting to discuss child\'s progress'],
      [visitorIds[1], tenantId, 'David Kimani', '+254722000002', 'david@buildright.co.ke', 'male', 'BuildRight Contractors', 'Termly maintenance contractor'],
    ]);
  await insertRows('visitor_visits',
    ['id', 'tenant_id', 'visitor_id', 'purpose', 'purpose_details', 'host_user_id', 'host_name', 'pass_number', 'status', 'check_in_time', 'check_out_time', 'registered_by', 'gate'],
    [
      [uuidv4(), tenantId, visitorIds[0], 'parent', 'Meeting with class teacher', adminUserId, 'Demo Admin', 'PASS-DEMO-0001', 'checked_in', new Date(), null, securityUserId, 'Main Gate'],
      [uuidv4(), tenantId, visitorIds[1], 'contractor', 'Quarterly plumbing inspection', adminUserId, 'Demo Admin', 'PASS-DEMO-0002', 'checked_out', addDays(-2), addDays(-2), securityUserId, 'Main Gate'],
    ]);

  // ── Maintenance: one job in progress, one completed ──────────────────────
  await insertRows('maintenance_requests',
    ['id', 'tenant_id', 'request_number', 'category', 'priority', 'title', 'description', 'location', 'requested_by', 'status', 'assigned_technician_id', 'assigned_at', 'started_at', 'completed_at'],
    [
      [uuidv4(), tenantId, 'DEMO-MR-0001', 'electrical', 'high', 'Flickering lights in Grade 8 classroom',
        'Lights flicker intermittently, may be a wiring issue', 'Grade 8 classroom', teacherUserIds[2], 'in_progress', technicianUserId, addDays(-2), addDays(-1), null],
      [uuidv4(), tenantId, 'DEMO-MR-0002', 'plumbing', 'medium', 'Leaking tap in staff washroom',
        'Tap has been dripping constantly for a few days', 'Staff washroom', adminUserId, 'completed', technicianUserId, addDays(-6), addDays(-5), addDays(-4)],
    ]);
}

// force=true always wipes and reseeds (the nightly 03:00 cron — "fresh every
// day" is the whole point). force=false (server startup) only creates the
// tenant if it's missing and otherwise leaves existing data alone — every
// backend restart calling this unconditionally used to wipe out anything an
// admin had set up (e.g. teacher class/subject assignments) or a visitor had
// done, which looked like changes silently "undoing themselves".
export async function resetDemoTenant(force = false) {
  const existingRows = await query('SELECT * FROM tenants WHERE is_demo = TRUE LIMIT 1');
  const alreadyExists = existingRows.length > 0;
  const tenant = alreadyExists ? existingRows[0] : await findOrCreateDemoTenant();

  if (alreadyExists && !force) {
    setDemoTenantId(tenant.id);
    logger.info(`Demo tenant already initialized (tenant=${tenant.id}) — skipping startup wipe`);
    return tenant.id;
  }

  try {
    await wipeDemoTenantData(tenant.id);
    await seedShowcaseData(tenant);
    setDemoTenantId(tenant.id);
    logger.info(`Demo tenant reset complete (tenant=${tenant.id})`);
    return tenant.id;
  } catch (err) {
    logger.error('Demo tenant reset failed (tenant left partially reset until next run):', err.message);
    // Still point the guard/login flow at the tenant — a partially-seeded
    // demo is better than none, and it self-heals on the next successful run.
    setDemoTenantId(tenant.id);
    throw err;
  }
}
