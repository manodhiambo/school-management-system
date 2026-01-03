import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function checkTable() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'financial_years'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ financial_years table does not exist');
      return;
    }
    
    console.log('✅ financial_years table exists\n');
    
    // Get columns
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'financial_years'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Get sample data
    const data = await client.query('SELECT * FROM financial_years LIMIT 1');
    
    if (data.rows.length > 0) {
      console.log('\nSample record:');
      console.log(JSON.stringify(data.rows[0], null, 2));
    } else {
      console.log('\n⚠️  No records in table');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTable();
