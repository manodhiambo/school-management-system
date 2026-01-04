import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function checkExpenses() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT id, expense_number, description, status, approval_status, amount
      FROM expense_records
      WHERE id IN (9, 10)
    `);
    
    console.log('📊 EXPENSE STATUS CHECK:\n');
    result.rows.forEach(exp => {
      console.log(`ID: ${exp.id} - ${exp.expense_number}`);
      console.log(`  Description: ${exp.description}`);
      console.log(`  Status: ${exp.status}`);
      console.log(`  Approval Status: ${exp.approval_status}`);
      console.log(`  Amount: ${exp.amount}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkExpenses();
