import pool from './src/config/database.js';

async function checkBudgetSchema() {
  try {
    console.log('=== BUDGETS TABLE COLUMNS ===');
    const budgetColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'budgets'
      ORDER BY ordinal_position
    `);
    
    if (budgetColumns.rows.length > 0) {
      budgetColumns.rows.forEach(col => console.log(`${col.column_name}: ${col.data_type}`));
    } else {
      console.log('Table does not exist');
    }
    
    console.log('\n=== BUDGET_ITEMS TABLE COLUMNS ===');
    const budgetItemColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'budget_items'
      ORDER BY ordinal_position
    `);
    
    if (budgetItemColumns.rows.length > 0) {
      budgetItemColumns.rows.forEach(col => console.log(`${col.column_name}: ${col.data_type}`));
    } else {
      console.log('Table does not exist');
    }
    
    console.log('\n=== PURCHASE_ORDERS TABLE COLUMNS ===');
    const poColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'purchase_orders'
      ORDER BY ordinal_position
    `);
    
    if (poColumns.rows.length > 0) {
      poColumns.rows.forEach(col => console.log(`${col.column_name}: ${col.data_type}`));
    } else {
      console.log('Table does not exist');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkBudgetSchema();
