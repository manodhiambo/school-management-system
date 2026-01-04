import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://REDACTED:REDACTED@REDACTED/neondb?sslmode=require';

async function fixTable() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Checking purchase_orders table...\n');
    
    // Check existing columns
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'purchase_orders'
    `);
    
    console.log('Existing columns:');
    columns.rows.forEach(c => console.log(`  - ${c.column_name}`));
    
    // Add missing columns
    await client.query(`
      ALTER TABLE purchase_orders 
      ADD COLUMN IF NOT EXISTS delivery_date DATE;
    `);
    
    await client.query(`
      ALTER TABLE purchase_orders 
      ADD COLUMN IF NOT EXISTS terms_conditions TEXT;
    `);
    
    await client.query(`
      ALTER TABLE purchase_orders 
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);
    
    console.log('\n✅ Missing columns added!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixTable();
