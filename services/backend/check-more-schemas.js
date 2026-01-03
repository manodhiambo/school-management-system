import pool from './src/config/database.js';

async function checkSchemas() {
  try {
    // Check expense_records columns
    console.log('=== EXPENSE_RECORDS COLUMNS ===');
    const expenseColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'expense_records'
      ORDER BY ordinal_position
    `);
    
    if (expenseColumns.rows.length > 0) {
      expenseColumns.rows.forEach(col => console.log(`${col.column_name}: ${col.data_type}`));
    } else {
      console.log('Table does not exist or has no columns');
    }
    
    // Check vendors columns
    console.log('\n=== VENDORS COLUMNS ===');
    const vendorColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vendors'
      ORDER BY ordinal_position
    `);
    
    if (vendorColumns.rows.length > 0) {
      vendorColumns.rows.forEach(col => console.log(`${col.column_name}: ${col.data_type}`));
    } else {
      console.log('Table does not exist or has no columns');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkSchemas();
