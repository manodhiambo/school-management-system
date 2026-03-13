const pkg = require('pg');
const { Pool } = pkg;
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require', 
  ssl: { rejectUnauthorized: false } 
});
const T = '11111111-1111-1111-1111-111111111111';
async function test(name, sql, params) {
  try { await pool.query(sql, params); console.log('OK:', name); }
  catch(e) { console.log('FAIL:', name, '->', e.message); }
}
async function run() {
  await test('GET /classes',
    `SELECT c.*, t.first_name || ' ' || t.last_name AS class_teacher_name,
     r.name AS room_name, COUNT(DISTINCT s.id) AS student_count
     FROM classes c
     LEFT JOIN teachers t ON t.user_id = c.class_teacher_id
     LEFT JOIN rooms r ON r.id = c.room_id
     LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active'
     LEFT JOIN class_subjects cs ON cs.class_id = c.id
     WHERE c.tenant_id = $1
     GROUP BY c.id, t.first_name, t.last_name, r.name, r.capacity
     ORDER BY c.sort_order ASC`, [T]);

  await test('GET /schemes',
    `SELECT s.*, sub.name AS subject_name, c.name AS class_name,
     t.first_name || ' ' || t.last_name AS teacher_name, COUNT(sw.id) AS week_count
     FROM schemes_of_work s
     LEFT JOIN subjects sub ON sub.id = s.subject_id
     LEFT JOIN classes c ON c.id = s.class_id
     LEFT JOIN teachers t ON t.user_id = s.teacher_id
     LEFT JOIN scheme_weeks sw ON sw.scheme_id = s.id
     WHERE s.tenant_id = $1
     GROUP BY s.id, sub.name, c.name, t.first_name, t.last_name
     ORDER BY s.created_at DESC`, [T]);

  await test('GET /lesson-plans',
    `SELECT lp.*, sub.name AS subject_name, c.name AS class_name,
     t.first_name || ' ' || t.last_name AS teacher_name
     FROM lesson_plans lp
     LEFT JOIN subjects sub ON sub.id = lp.subject_id
     LEFT JOIN classes c ON c.id = lp.class_id
     LEFT JOIN teachers t ON t.user_id = lp.teacher_id
     WHERE lp.tenant_id = $1
     ORDER BY lp.created_at DESC`, [T]);

  await test('GET /sba',
    `SELECT s.*, sub.name AS subject_name, c.name AS class_name,
     t.first_name || ' ' || t.last_name AS teacher_name,
     COUNT(sr.id) AS submissions_count, COUNT(st.id) AS total_students
     FROM sba_setups s
     LEFT JOIN subjects sub ON sub.id = s.subject_id
     LEFT JOIN classes c ON c.id = s.class_id
     LEFT JOIN teachers t ON t.user_id = s.teacher_id
     LEFT JOIN sba_student_records sr ON sr.sba_setup_id = s.id
     LEFT JOIN students st ON st.class_id = s.class_id AND st.status = 'active'
     WHERE s.tenant_id = $1
     GROUP BY s.id, sub.name, c.name, t.first_name, t.last_name
     ORDER BY s.created_at DESC`, [T]);

  await test('GET /projects',
    `SELECT p.*, sub.name AS subject_name, c.name AS class_name,
     t.first_name || ' ' || t.last_name AS teacher_name
     FROM projects p
     LEFT JOIN subjects sub ON sub.id = p.subject_id
     LEFT JOIN classes c ON c.id = p.class_id
     LEFT JOIN teachers t ON t.user_id = p.teacher_id
     WHERE p.tenant_id = $1
     ORDER BY p.created_at DESC`, [T]);

  await test('GET /materials',
    `SELECT m.*, sub.name AS subject_name,
     t.first_name || ' ' || t.last_name AS uploaded_by_name
     FROM learning_materials m
     LEFT JOIN subjects sub ON sub.id = m.subject_id
     LEFT JOIN classes c ON c.id = m.class_id
     LEFT JOIN teachers t ON t.user_id = m.uploaded_by
     WHERE m.tenant_id = $1
     ORDER BY m.created_at DESC`, [T]);

  await test('GET /promotion/history',
    `SELECT sp.*, s.first_name || ' ' || s.last_name AS student_name,
     fc.name AS from_class_name, t.first_name || ' ' || t.last_name AS promoted_by_name
     FROM student_promotions sp
     JOIN students s ON s.id = sp.student_id
     JOIN classes fc ON fc.id = sp.from_class_id
     LEFT JOIN classes tc ON tc.id = sp.to_class_id
     LEFT JOIN teachers t ON t.user_id = sp.promoted_by
     WHERE sp.tenant_id = $1
     ORDER BY sp.promoted_at DESC`, [T]);

  await test('GET /dashboard',
    `SELECT COUNT(*) AS total, SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) AS approved
     FROM schemes_of_work WHERE tenant_id=$1 AND academic_year=$2 AND term=$3`, [T,'2026',1]);

  await test('GET /setup/status classes',
    `SELECT COUNT(*) FROM classes WHERE tenant_id=$1`, [T]);
  await test('GET /rooms',
    `SELECT r.*, COUNT(c.id) AS class_count FROM rooms r
     LEFT JOIN classes c ON c.room_id = r.id
     WHERE r.tenant_id = $1 GROUP BY r.id ORDER BY r.name`, [T]);

  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
