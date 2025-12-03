import pg from 'pg';

const { Pool } = pg;

async function testTeacherTimetable() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    const userId = 'dfa01e6f-16fd-464a-826c-39e1c20ccde9'; // teacher user_id
    const teacherId = 'f2bb9a01-25eb-4979-954e-994316efa953'; // teacher_id
    
    console.log('=== Testing Teacher Timetable Queries ===\n');
    
    // Test 1: Find teacher by user_id
    const teacher = await pool.query(
      'SELECT id FROM teachers WHERE id = $1 OR user_id = $1',
      [userId]
    );
    console.log('1. Find teacher by user_id:', userId);
    console.log('   Result:', teacher.rows);
    
    // Test 2: Get timetable by teacher_id
    const timetable1 = await pool.query(
      `SELECT t.*, c.name as class_name, s.name as subject_name
       FROM timetable t
       LEFT JOIN classes c ON t.class_id = c.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE t.teacher_id = $1 AND t.is_active = true
       ORDER BY t.day_of_week, t.start_time`,
      [teacherId]
    );
    console.log('\n2. Timetable by teacher_id:', teacherId);
    console.log('   Entries:', timetable1.rows.length);
    timetable1.rows.forEach(t => {
      console.log(`   - ${t.class_name}, ${t.subject_name}, Day: ${t.day_of_week}`);
    });
    
    // Test 3: Get timetable using the resolved teacher_id from user_id
    if (teacher.rows.length > 0) {
      const resolvedTeacherId = teacher.rows[0].id;
      const timetable2 = await pool.query(
        `SELECT t.*, c.name as class_name, s.name as subject_name
         FROM timetable t
         LEFT JOIN classes c ON t.class_id = c.id
         LEFT JOIN subjects s ON t.subject_id = s.id
         WHERE t.teacher_id = $1 AND t.is_active = true
         ORDER BY t.day_of_week, t.start_time`,
        [resolvedTeacherId]
      );
      console.log('\n3. Timetable by resolved teacher_id:', resolvedTeacherId);
      console.log('   Entries:', timetable2.rows.length);
    }

    // Test 4: Check all timetable entries
    const allTimetable = await pool.query('SELECT * FROM timetable WHERE is_active = true');
    console.log('\n4. All active timetable entries:', allTimetable.rows.length);
    allTimetable.rows.forEach(t => {
      console.log(`   - ID: ${t.id}, Teacher: ${t.teacher_id}, Class: ${t.class_id}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testTeacherTimetable();
