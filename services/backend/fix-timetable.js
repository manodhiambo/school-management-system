import pg from 'pg';

const { Pool } = pg;

async function fixTimetable() {
  const pool = new Pool({
    connectionString: 'postgresql://REDACTED:REDACTED@REDACTED/neondb?sslmode=require',
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
