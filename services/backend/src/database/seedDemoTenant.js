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

async function createUser({ email, role, tenantId, firstName, lastName }) {
  const id = uuidv4();
  const hash = await randomPasswordHash();
  await query(
    `INSERT INTO users (id, email, password, role, tenant_id, first_name, last_name, is_active, is_verified, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true,true,NOW(),NOW())`,
    [id, email, hash, role, tenantId, firstName, lastName]
  );
  return id;
}

async function seedShowcaseData(tenant) {
  const tenantId = tenant.id;
  const currentYear = new Date().getFullYear().toString();

  // ── People ──────────────────────────────────────────────────────────────
  await createUser({ email: DEMO_ADMIN_EMAIL, role: 'admin', tenantId, firstName: 'Demo', lastName: 'Admin' });

  const teacherUserId = await createUser({ email: DEMO_TEACHER_EMAIL, role: 'teacher', tenantId, firstName: 'Jane', lastName: 'Wanjiru' });
  const teacherId = uuidv4();
  await query(
    `INSERT INTO teachers (id, user_id, tenant_id, first_name, last_name, employee_id, qualification, specialization, status)
     VALUES ($1,$2,$3,'Jane','Wanjiru',$4,'B.Ed Mathematics','Mathematics','active')`,
    [teacherId, teacherUserId, tenantId, 'DEMO-T001']
  );

  const parentUserId = await createUser({ email: DEMO_PARENT_EMAIL, role: 'parent', tenantId, firstName: 'Peter', lastName: 'Otieno' });
  const parentId = uuidv4();
  await query(
    `INSERT INTO parents (id, user_id, first_name, last_name, relationship, phone_primary, occupation, tenant_id)
     VALUES ($1,$2,'Peter','Otieno','father','+254711000000','Engineer',$3)`,
    [parentId, parentUserId, tenantId]
  );

  // These 4 roles have no dedicated profile table (matches driverRoutes.js /
  // gateRoutes.js / financeRoutes.js / maintenanceRoutes.js, which all key
  // off users.role directly) — a plain login-capable user is the whole demo.
  await createUser({ email: DEMO_FINANCE_EMAIL, role: 'finance_officer', tenantId, firstName: 'Susan', lastName: 'Kamau' });
  await createUser({ email: DEMO_DRIVER_EMAIL, role: 'driver', tenantId, firstName: 'Moses', lastName: 'Kiptoo' });
  await createUser({ email: DEMO_SECURITY_EMAIL, role: 'security', tenantId, firstName: 'James', lastName: 'Mwangi' });
  await createUser({ email: DEMO_TECHNICIAN_EMAIL, role: 'technician', tenantId, firstName: 'David', lastName: 'Mutua' });

  const alumniUserId = await createUser({ email: DEMO_ALUMNI_EMAIL, role: 'alumni', tenantId, firstName: 'Esther', lastName: 'Wambui' });
  await query(
    `INSERT INTO alumni_profiles (id, tenant_id, user_id, first_name, last_name, graduation_year, current_occupation, employer, university, is_mentor, is_public)
     VALUES ($1,$2,$3,'Esther','Wambui',2020,'Software Engineer','Acme Kenya Ltd','University of Nairobi',true,true)`,
    [uuidv4(), tenantId, alumniUserId]
  );

  // ── Academics: classes + subjects ──────────────────────────────────────
  const classLowerId = uuidv4();
  await query(
    `INSERT INTO classes (id, name, section, capacity, academic_year, education_level, grade_number, tenant_id, is_active)
     VALUES ($1,'Grade 5','Blue',40,$2,'lower_primary',5,$3,true)`,
    [classLowerId, currentYear, tenantId]
  );
  const classJuniorId = uuidv4();
  await query(
    `INSERT INTO classes (id, name, section, capacity, academic_year, education_level, grade_number, tenant_id, is_active)
     VALUES ($1,'Grade 8','Gold',40,$2,'junior_secondary',8,$3,true)`,
    [classJuniorId, currentYear, tenantId]
  );

  const subjectDefs = [
    ['English', 'ENG'], ['Mathematics', 'MAT'], ['Kiswahili', 'KIS'],
    ['Integrated Science', 'SCI'], ['Social Studies', 'SST'],
  ];
  const subjectIds = [];
  for (const [name, code] of subjectDefs) {
    const id = uuidv4();
    subjectIds.push(id);
    await query(
      `INSERT INTO subjects (id, name, code, credits, is_active, category, tenant_id)
       VALUES ($1,$2,$3,1,true,'core',$4)`,
      [id, name, code, tenantId]
    );
  }

  // ── Students ────────────────────────────────────────────────────────────
  const student1UserId = await createUser({ email: DEMO_STUDENT1_EMAIL, role: 'student', tenantId, firstName: 'Amina', lastName: 'Otieno' });
  const student1Id = uuidv4();
  await query(
    `INSERT INTO students (id, user_id, admission_number, first_name, last_name, gender, class_id, parent_id, admission_date, tenant_id, status, education_level)
     VALUES ($1,$2,$3,'Amina','Otieno','female',$4,$5,CURRENT_DATE,$6,'active','lower_primary')`,
    [student1Id, student1UserId, `DEMO${currentYear}0001`, classLowerId, parentId, tenantId]
  );

  const student2UserId = await createUser({ email: DEMO_STUDENT2_EMAIL, role: 'student', tenantId, firstName: 'Brian', lastName: 'Otieno' });
  const student2Id = uuidv4();
  await query(
    `INSERT INTO students (id, user_id, admission_number, first_name, last_name, gender, class_id, parent_id, admission_date, tenant_id, status, education_level)
     VALUES ($1,$2,$3,'Brian','Otieno','male',$4,$5,CURRENT_DATE,$6,'active','junior_secondary')`,
    [student2Id, student2UserId, `DEMO${currentYear}0002`, classJuniorId, parentId, tenantId]
  );

  for (const studentId of [student1Id, student2Id]) {
    await query(
      'INSERT INTO parent_students (parent_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [parentId, studentId]
    );
  }

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

  // ── Finance: a paid invoice and a partially-paid invoice ─────────────────
  const invoice1Id = uuidv4();
  await query(
    `INSERT INTO fee_invoices (id, invoice_number, student_id, total_amount, net_amount, paid_amount, balance_amount, due_date, status, tenant_id)
     VALUES ($1,'DEMO-INV-0001',$2,15000,15000,15000,0,CURRENT_DATE + INTERVAL '30 days','paid',$3)`,
    [invoice1Id, student1Id, tenantId]
  );
  await query(
    `INSERT INTO fee_payments (id, invoice_id, student_id, amount, payment_method, receipt_number, status, payment_date, tenant_id)
     VALUES ($1,$2,$3,15000,'mpesa','DEMO-RCT-0001','success',NOW(),$4)`,
    [uuidv4(), invoice1Id, student1Id, tenantId]
  );

  const invoice2Id = uuidv4();
  await query(
    `INSERT INTO fee_invoices (id, invoice_number, student_id, total_amount, net_amount, paid_amount, balance_amount, due_date, status, tenant_id)
     VALUES ($1,'DEMO-INV-0002',$2,18000,18000,8000,10000,CURRENT_DATE + INTERVAL '30 days','partial',$3)`,
    [invoice2Id, student2Id, tenantId]
  );
  await query(
    `INSERT INTO fee_payments (id, invoice_id, student_id, amount, payment_method, receipt_number, status, payment_date, tenant_id)
     VALUES ($1,$2,$3,8000,'cash','DEMO-RCT-0002','success',NOW(),$4)`,
    [uuidv4(), invoice2Id, student2Id, tenantId]
  );

  // ── Exams + published results, one per class ─────────────────────────────
  const examScores = [82, 68, 55, 91, 38]; // one per subject, drives a spread of CBE grades
  for (const [classId, studentId] of [[classLowerId, student1Id], [classJuniorId, student2Id]]) {
    const examId = uuidv4();
    await query(
      `INSERT INTO exams (id, name, description, exam_type, academic_year, term, start_date, end_date, class_id, mode, tenant_id, is_active, is_results_published)
       VALUES ($1,'Term 2 Opener Exam','Opener assessment for Term 2','opener',$2,'term2',CURRENT_DATE - INTERVAL '10 days',CURRENT_DATE - INTERVAL '8 days',$3,'offline',$4,true,true)`,
      [examId, currentYear, classId, tenantId]
    );
    for (let i = 0; i < subjectIds.length; i++) {
      const marks = examScores[i];
      await query(
        `INSERT INTO exam_results (id, tenant_id, exam_id, student_id, subject_id, marks_obtained, max_marks, cbc_grade, is_absent)
         VALUES ($1,$2,$3,$4,$5,$6,100,$7,false)`,
        [uuidv4(), tenantId, examId, studentId, subjectIds[i], marks, cbeGrade(marks)]
      );
    }
  }

  // ── Attendance: last 5 weekdays, mostly present ──────────────────────────
  for (const studentId of [student1Id, student2Id]) {
    for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
      const status = dayOffset === 3 ? 'late' : 'present';
      await query(
        `INSERT INTO attendance (id, student_id, date, status, tenant_id)
         VALUES ($1,$2, CURRENT_DATE - $3::int, $4, $5)`,
        [uuidv4(), studentId, dayOffset, status, tenantId]
      );
    }
  }
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
