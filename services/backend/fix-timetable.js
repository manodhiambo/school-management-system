import pg from 'pg';

const { Pool } = pg;

async function fixTimetable() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Delete entries with null class_id
    const result = await pool.query('DELETE FROM timetable WHERE class_id IS NULL');
    console.log('Deleted', result.rowCount, 'invalid timetable entries');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixTimetable();
