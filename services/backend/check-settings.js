import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgresql://REDACTED:REDACTED@REDACTED/neondb?sslmode=require"
});

async function checkSettings() {
  try {
    // Check table structure
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'settings'
      ORDER BY ordinal_position
    `);
    
    console.log('Settings table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Check current data
    const settings = await pool.query('SELECT * FROM settings LIMIT 1');
    console.log('\nCurrent settings:', settings.rows[0] || 'No settings found');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSettings();
