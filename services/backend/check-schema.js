import pool from './src/config/database.js';

async function checkSchema() {
  try {
    // Check income_records columns
    console.log('=== INCOME_RECORDS COLUMNS ===');
    const incomeColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'income_records'
      ORDER BY ordinal_position
    `);
    incomeColumns.rows.forEach(col => console.log(`${col.column_name}: ${col.data_type}`));
    
    // Check petty_cash columns
    console.log('\n=== PETTY_CASH COLUMNS ===');
    const pettyCashColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'petty_cash'
      ORDER BY ordinal_position
    `);
    pettyCashColumns.rows.forEach(col => console.log(`${col.column_name}: ${col.data_type}`));
    
    // Check users columns
    console.log('\n=== USERS COLUMNS ===');
    const userColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    userColumns.rows.forEach(col => console.log(`${col.column_name}: ${col.data_type}`));
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkSchema();
