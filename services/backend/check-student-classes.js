import pg from 'pg';

const { Pool } = pg;

async function check() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== Students and their Classes ===');
    const students = await pool.query(`
      SELECT s.id, s.user_id, s.first_name, s.last_name, s.class_id, c.name as class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
    `);
    students.rows.forEach(s => {
      console.log(`  ${s.first_name} ${s.last_name}: class_id=${s.class_id}, class_name=${s.class_name}`);
    });

    console.log('\n=== Assignments and their Classes ===');
    const assignments = await pool.query(`
      SELECT a.id, a.title, a.class_id, c.name as class_name, a.is_active
      FROM assignments a
      LEFT JOIN classes c ON a.class_id = c.id
    `);
    assignments.rows.forEach(a => {
      console.log(`  ${a.title}: class_id=${a.class_id}, class_name=${a.class_name}, active=${a.is_active}`);
    });

    console.log('\n=== All Classes ===');
    const classes = await pool.query('SELECT id, name FROM classes');
    classes.rows.forEach(c => {
      console.log(`  ${c.name}: id=${c.id}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
