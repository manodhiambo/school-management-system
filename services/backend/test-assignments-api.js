import pg from 'pg';

const { Pool } = pg;

async function test() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test with Sharon's user_id
    const userId = '3c1cd0a9-3a54-437f-b65c-a74cd3240670';
    
    console.log('Testing with user_id:', userId);
    
    // Get student info
    const student = await pool.query(
      'SELECT id, class_id FROM students WHERE id = $1 OR user_id = $1',
      [userId]
    );
    
    console.log('Student found:', student.rows);
    
    if (student.rows.length > 0 && student.rows[0].class_id) {
      const studentId = student.rows[0].id;
      const classId = student.rows[0].class_id;
      
      console.log('Student ID:', studentId);
      console.log('Class ID:', classId);
      
      // Query assignments like the route does
      const assignments = await pool.query(`
        SELECT a.*,
          c.name as class_name,
          s.name as subject_name,
          CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
          sub.id as submission_id,
          sub.status as submission_status,
          sub.score,
          sub.submitted_at
        FROM assignments a
        LEFT JOIN classes c ON a.class_id = c.id
        LEFT JOIN subjects s ON a.subject_id = s.id
        LEFT JOIN teachers t ON a.teacher_id = t.id
        LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id AND sub.student_id = $1
        WHERE a.class_id = $2 AND a.is_active = true
        ORDER BY a.due_date ASC
      `, [studentId, classId]);
      
      console.log('\nAssignments found:', assignments.rows.length);
      assignments.rows.forEach(a => {
        console.log(`  - ${a.title} (${a.subject_name}) - Due: ${a.due_date}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

test();
