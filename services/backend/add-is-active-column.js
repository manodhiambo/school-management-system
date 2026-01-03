import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function addColumn() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Adding is_active column to financial_years...\n');
    
    // Add is_active column (copy from is_current)
    await client.query(`
      ALTER TABLE financial_years 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
    `);
    
    // Copy is_current values to is_active
    await client.query(`
      UPDATE financial_years 
      SET is_active = is_current;
    `);
    
    // Also add to bank_accounts if missing
    await client.query(`
      ALTER TABLE bank_accounts 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);
    
    // Verify
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'financial_years' 
      AND column_name IN ('is_active', 'is_current')
    `);
    
    console.log('✅ Columns in financial_years:');
    result.rows.forEach(row => console.log(`   - ${row.column_name}`));
    
    const data = await client.query('SELECT * FROM financial_years LIMIT 1');
    if (data.rows.length > 0) {
      console.log('\n✅ Sample record:');
      console.log(`   is_active: ${data.rows[0].is_active}`);
      console.log(`   is_current: ${data.rows[0].is_current}`);
    }
    
    console.log('\n✅ Column added successfully!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

addColumn();
