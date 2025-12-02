import pg from 'pg';

const { Pool } = pg;

async function checkData() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== Database Contents ===\n');
    
    // Check users
    const users = await pool.query('SELECT id, email, role, is_active FROM users');
    console.log('Users:', users.rows.length);
    users.rows.forEach(u => console.log(`  - ${u.email} (${u.role}) active=${u.is_active}`));
    
    // Check students
    const students = await pool.query('SELECT id, first_name, last_name, status FROM students');
    console.log('\nStudents:', students.rows.length);
    students.rows.forEach(s => console.log(`  - ${s.first_name} ${s.last_name} (${s.status})`));
    
    // Check teachers
    const teachers = await pool.query('SELECT id, first_name, last_name, status FROM teachers');
    console.log('\nTeachers:', teachers.rows.length);
    teachers.rows.forEach(t => console.log(`  - ${t.first_name} ${t.last_name} (${t.status})`));
    
    // Check classes
    const classes = await pool.query('SELECT id, name, section FROM classes');
    console.log('\nClasses:', classes.rows.length);
    classes.rows.forEach(c => console.log(`  - ${c.name} ${c.section || ''}`));
    
    // Check parents
    const parents = await pool.query('SELECT id, first_name, last_name FROM parents');
    console.log('\nParents:', parents.rows.length);
    parents.rows.forEach(p => console.log(`  - ${p.first_name} ${p.last_name}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();
