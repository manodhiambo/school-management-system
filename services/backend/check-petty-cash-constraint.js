import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://REDACTED:REDACTED@REDACTED/neondb?sslmode=require';

async function checkConstraint() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT pg_get_constraintdef(oid) as constraint_def
      FROM pg_constraint
      WHERE conname = 'petty_cash_transaction_type_check'
    `);
    
    console.log('✅ PETTY CASH TRANSACTION_TYPE CONSTRAINT:');
    console.log(result.rows[0].constraint_def);
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkConstraint();
