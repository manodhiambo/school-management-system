import pg from 'pg';

const { Pool } = pg;

async function fixAttendance() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check and add remarks column
    const checkRemarks = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'attendance' AND column_name = 'remarks'
    `);
    
    if (checkRemarks.rows.length === 0) {
      await pool.query(`ALTER TABLE attendance ADD COLUMN remarks TEXT`);
      console.log('Added remarks column to attendance table');
    } else {
      console.log('remarks column already exists');
    }

    // Check and add updated_at column
    const checkUpdatedAt = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'attendance' AND column_name = 'updated_at'
    `);
    
    if (checkUpdatedAt.rows.length === 0) {
      await pool.query(`ALTER TABLE attendance ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()`);
      console.log('Added updated_at column to attendance table');
    } else {
      console.log('updated_at column already exists');
    }

    // Show current attendance table structure
    const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'attendance'
    `);
    console.log('\nAttendance table columns:');
    cols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixAttendance();
