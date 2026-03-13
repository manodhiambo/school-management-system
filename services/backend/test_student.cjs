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
  await test('GET /students list',
    `SELECT s.*, u.email, u.is_active, c.name as class_name,
     p.first_name as parent_first_name, p.last_name as parent_last_name
     FROM students s
     JOIN users u ON s.user_id = u.id
     LEFT JOIN classes c ON s.class_id = c.id
     LEFT JOIN parents p ON s.parent_id = p.id
     WHERE s.tenant_id = $1 ORDER BY s.created_at DESC`, [T]);

  await test('GET /student/:id',
    `SELECT s.*, u.email, c.name as class_name
     FROM students s
     JOIN users u ON s.user_id = u.id
     LEFT JOIN classes c ON s.class_id = c.id
     WHERE s.id = $1 AND s.tenant_id = $2`,
    ['11111111-1111-1111-1111-111111111112', T]);

  await test('POST /students - select new student',
    `SELECT s.*, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1`,
    ['11111111-1111-1111-1111-111111111112']);

  // Test the INSERT structure (just validate columns exist)
  await test('students INSERT columns',
    `SELECT id, user_id, admission_number, first_name, last_name, date_of_birth,
     gender, blood_group, class_id, parent_id, admission_date,
     address, city, state, pincode, phone, tenant_id, status FROM students LIMIT 0`, []);

  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
