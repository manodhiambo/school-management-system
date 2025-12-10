import pg from 'pg';

const { Pool } = pg;

async function check() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== Students ===');
    const students = await pool.query('SELECT id, user_id, first_name, last_name FROM students');
    students.rows.forEach(s => {
      console.log(`  ${s.first_name} ${s.last_name}: student_id=${s.id}, user_id=${s.user_id}`);
    });

    console.log('\n=== Attendance Records ===');
    const attendance = await pool.query(`
      SELECT a.*, s.first_name, s.last_name 
      FROM attendance a 
      LEFT JOIN students s ON a.student_id = s.id
      ORDER BY a.date DESC
      LIMIT 10
    `);
    console.log('Total records:', attendance.rows.length);
    attendance.rows.forEach(a => {
      console.log(`  ${a.date}: ${a.first_name} ${a.last_name} - ${a.status} (student_id: ${a.student_id})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
