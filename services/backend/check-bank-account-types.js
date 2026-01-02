import pool from './src/config/database.js';

async function checkAccountTypes() {
  try {
    const result = await pool.query(`
      SELECT 
        conname AS constraint_name,
        pg_get_constraintdef(c.oid) AS constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conname = 'bank_accounts_account_type_check'
    `);
    
    console.log('Bank Account Type Constraint:');
    console.log(result.rows[0]);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkAccountTypes();
