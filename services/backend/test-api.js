import pg from 'pg';

const { Pool } = pg;

async function testQueries() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== Testing Dashboard Query ===\n');
    
    // Test dashboard students query
    const studentStats = await pool.query(`
      SELECT
        COUNT(*) as total_students,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_students
      FROM students
    `);
    console.log('Student stats:', studentStats.rows[0]);

    // Test dashboard teachers query  
    const teacherStats = await pool.query(`
      SELECT
        COUNT(*) as total_teachers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_teachers
      FROM teachers
    `);
    console.log('Teacher stats:', teacherStats.rows[0]);

    // Test students list query
    const students = await pool.query(`
      SELECT 
        s.*,
        u.email,
        u.is_active,
        c.name as class_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      ORDER BY s.created_at DESC
    `);
    console.log('\nStudents list count:', students.rows.length);
    console.log('Students data type:', Array.isArray(students.rows) ? 'array' : typeof students.rows);

    // Test teachers list query
    const teachers = await pool.query(`
      SELECT t.*, u.email
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.first_name
    `);
    console.log('\nTeachers list count:', teachers.rows.length);
    console.log('Teachers:', teachers.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testQueries();
