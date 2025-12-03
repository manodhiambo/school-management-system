import pg from 'pg';

const { Pool } = pg;

async function testStudents() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== Testing Students Query ===\n');
    
    // Test the exact query from studentRoutes
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
    
    console.log('Students found:', students.rows.length);
    console.log('Students:', JSON.stringify(students.rows, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testStudents();
