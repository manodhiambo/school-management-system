import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function checkAssets() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    // Check columns
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'assets'
      ORDER BY ordinal_position
    `);
    
    console.log('📦 ASSETS TABLE COLUMNS:\n');
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? '- REQUIRED' : ''}`);
    });
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkAssets();
