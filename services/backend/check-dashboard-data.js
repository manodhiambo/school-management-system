import pg from 'pg';

const { Pool } = pg;

async function checkData() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== Dashboard Data Check ===\n');
    
    // Test exact dashboard queries
    const studentStats = await pool.query(`
      SELECT
        COUNT(*) as total_students,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_students,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_students
      FROM students
    `);
    console.log('Student stats query result:', studentStats.rows[0]);
    console.log('Parsed total:', parseInt(studentStats.rows[0]?.total_students));

    const teacherStats = await pool.query(`
      SELECT
        COUNT(*) as total_teachers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_teachers
      FROM teachers
    `);
    console.log('\nTeacher stats query result:', teacherStats.rows[0]);
    console.log('Parsed total:', parseInt(teacherStats.rows[0]?.total_teachers));

    // Raw counts
    const studentsRaw = await pool.query('SELECT COUNT(*) as count FROM students');
    console.log('\nRaw students count:', studentsRaw.rows[0]);

    const teachersRaw = await pool.query('SELECT COUNT(*) as count FROM teachers');
    console.log('Raw teachers count:', teachersRaw.rows[0]);

    // List all students
    const students = await pool.query('SELECT id, first_name, last_name, status FROM students');
    console.log('\nAll students:', students.rows);

    // List all teachers
    const teachers = await pool.query('SELECT id, first_name, last_name, status FROM teachers');
    console.log('\nAll teachers:', teachers.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();
