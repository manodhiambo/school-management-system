import pool from './src/config/database.js';

async function checkSchema() {
  const client = await pool.connect();
  try {
    console.log('Checking existing table structures...\n');

    const tables = ['users', 'students', 'teachers', 'academic_years', 'classes', 'fee_payments'];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      if (result.rows.length > 0) {
        console.log(`\n=== ${table.toUpperCase()} ===`);
        result.rows.forEach(col => {
          console.log(`  ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
        });
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();
