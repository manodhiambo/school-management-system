import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://REDACTED:REDACTED@REDACTED/neondb?sslmode=require';

async function checkConstraint() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    // Get the constraint definition
    const result = await client.query(`
      SELECT pg_get_constraintdef(oid) as constraint_def
      FROM pg_constraint
      WHERE conname = 'expense_records_status_check'
    `);
    
    console.log('✅ EXPENSE STATUS CONSTRAINT:');
    console.log(result.rows[0].constraint_def);
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkConstraint();
