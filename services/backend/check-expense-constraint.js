import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

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
