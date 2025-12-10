import pg from 'pg';

const { Pool } = pg;

async function test() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test with user_id (what frontend sends)
    const userId = '3c1cd0a9-3a54-437f-b65c-a74cd3240670'; // Sharon's user_id
    
    console.log('Testing with user_id:', userId);
    
    // This is what the route does
    const student = await pool.query(
      'SELECT id FROM students WHERE id = $1 OR user_id = $1',
      [userId]
    );
    
    console.log('Student lookup result:', student.rows);
    
    if (student.rows.length > 0) {
      const actualStudentId = student.rows[0].id;
      console.log('Actual student_id:', actualStudentId);
      
      const attendance = await pool.query(`
        SELECT * FROM attendance WHERE student_id = $1 ORDER BY date DESC
      `, [actualStudentId]);
      
      console.log('Attendance records found:', attendance.rows.length);
      attendance.rows.forEach(a => {
        console.log(`  ${a.date}: ${a.status}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

test();
