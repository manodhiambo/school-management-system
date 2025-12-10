import pg from 'pg';

const { Pool } = pg;

async function check() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== Student Users ===');
    const users = await pool.query(`
      SELECT u.id as user_id, u.email, s.id as student_id, s.first_name, s.last_name
      FROM users u
      JOIN students s ON u.id = s.user_id
      WHERE u.role = 'student'
    `);
    
    users.rows.forEach(u => {
      console.log(`\nEmail: ${u.email}`);
      console.log(`  user_id: ${u.user_id}`);
      console.log(`  student_id: ${u.student_id}`);
      console.log(`  Name: ${u.first_name} ${u.last_name}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
