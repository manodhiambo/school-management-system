const pkg = require('pg');
const { Pool } = pkg;
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require', 
  ssl: { rejectUnauthorized: false } 
});
async function test(name, sql, params) {
  try { const r = await pool.query(sql, params); console.log('OK:', name, '(rows:', r.rows.length + ')'); }
  catch(e) { console.log('FAIL:', name, '->', e.message); }
}
async function run() {
  // Test the full student POST flow queries
  const T = '11111111-1111-1111-1111-111111111111';
  
  // 1. Check email exists query
  await test('check email', 'SELECT id FROM users WHERE email = $1', ['test@test.com']);
  
  // 2. Get last student admission number
  await test('get last admission number', 
    `SELECT admission_number FROM students WHERE admission_number LIKE $1 AND tenant_id = $2 ORDER BY admission_number DESC LIMIT 1`,
    ['STD2026%', T]);
  
  // 3. Full SELECT after insert (simulated with real data)
  await test('select new student after insert',
    `SELECT s.*, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1`,
    ['00000000-0000-0000-0000-000000000000']);

  // 4. Test old GET /classes query (what AddStudentModal uses)
  const r = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='classes' ORDER BY ordinal_position LIMIT 10");
  await test('GET /classes list',
    `SELECT c.*, u.email as teacher_email FROM classes c LEFT JOIN users u ON c.class_teacher_id = u.id WHERE c.tenant_id = $1 ORDER BY c.name`,
    [T]);
    
  // 5. Test what columns classes.routes.js might query
  await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='classes'")
    .then(r => console.log('classes table exists:', r.rows.length > 0));
    
  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
