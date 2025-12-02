import pg from 'pg';

const { Pool } = pg;

async function checkTimetable() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== Timetable Data ===\n');
    
    const timetable = await pool.query('SELECT * FROM timetable');
    console.log('Timetable entries:', timetable.rows.length);
    console.log('Data:', JSON.stringify(timetable.rows, null, 2));
    
    console.log('\n=== Classes ===');
    const classes = await pool.query('SELECT id, name FROM classes');
    console.log('Classes:', classes.rows);
    
    console.log('\n=== Subjects ===');
    const subjects = await pool.query('SELECT id, name FROM subjects');
    console.log('Subjects:', subjects.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTimetable();
