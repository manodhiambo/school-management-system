import pg from 'pg';

const { Pool } = pg;

async function check() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== Exams ===');
    const exams = await pool.query('SELECT * FROM exams');
    console.log('Total exams:', exams.rows.length);
    exams.rows.forEach(e => {
      console.log(`  - ${e.name} (${e.exam_type}) - ${e.academic_year} ${e.term}`);
    });

    console.log('\n=== Exam Results ===');
    const results = await pool.query(`
      SELECT er.*, e.name as exam_name, s.first_name, s.last_name, sub.name as subject_name
      FROM exam_results er
      LEFT JOIN exams e ON er.exam_id = e.id
      LEFT JOIN students s ON er.student_id = s.id
      LEFT JOIN subjects sub ON er.subject_id = sub.id
      LIMIT 20
    `);
    console.log('Total exam results:', results.rows.length);
    results.rows.forEach(r => {
      console.log(`  - ${r.first_name} ${r.last_name}: ${r.subject_name} - ${r.marks_obtained}/${r.max_marks} (${r.grade})`);
    });

    console.log('\n=== Subjects ===');
    const subjects = await pool.query('SELECT id, name, code FROM subjects');
    console.log('Total subjects:', subjects.rows.length);
    subjects.rows.forEach(s => {
      console.log(`  - ${s.name} (${s.code}) - ID: ${s.id}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
