import pg from 'pg';

const { Pool } = pg;

async function checkTeacherData() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== Teacher Data Check ===\n');
    
    // Get all teachers with their user IDs
    const teachers = await pool.query(`
      SELECT t.id as teacher_id, t.user_id, t.first_name, t.last_name, u.email
      FROM teachers t
      JOIN users u ON t.user_id = u.id
    `);
    console.log('Teachers:');
    teachers.rows.forEach(t => {
      console.log(`  - ${t.first_name} ${t.last_name}`);
      console.log(`    Teacher ID: ${t.teacher_id}`);
      console.log(`    User ID: ${t.user_id}`);
      console.log(`    Email: ${t.email}`);
    });

    // Get all timetable entries
    const timetable = await pool.query(`
      SELECT t.*, c.name as class_name, s.name as subject_name,
             CONCAT(te.first_name, ' ', te.last_name) as teacher_name
      FROM timetable t
      LEFT JOIN classes c ON t.class_id = c.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN teachers te ON t.teacher_id = te.id
      WHERE t.is_active = true
    `);
    console.log('\nTimetable entries:', timetable.rows.length);
    timetable.rows.forEach(t => {
      console.log(`  - Class: ${t.class_name}, Subject: ${t.subject_name}, Teacher: ${t.teacher_name || 'Not assigned'}`);
      console.log(`    Teacher ID in timetable: ${t.teacher_id}`);
      console.log(`    Day: ${t.day_of_week}, Time: ${t.start_time} - ${t.end_time}`);
    });

    // Get classes
    const classes = await pool.query('SELECT id, name FROM classes');
    console.log('\nClasses:', classes.rows);

    // Get subjects
    const subjects = await pool.query('SELECT id, name FROM subjects');
    console.log('\nSubjects:', subjects.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTeacherData();
