import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function fixAllColumns() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log('Checking all columns in bank_transactions...\n');
    
    // Get existing columns
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bank_transactions'
      ORDER BY ordinal_position
    `);
    
    const existingColumns = result.rows.map(row => row.column_name);
    console.log('Existing columns:', existingColumns.join(', '), '\n');
    
    // Required columns
    const requiredColumns = [
      { name: 'to_account_id', type: 'INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL' },
      { name: 'reference_number', type: 'VARCHAR(100)' },
      { name: 'created_by', type: 'UUID REFERENCES users(id)' },
      { name: 'created_at', type: 'TIMESTAMP DEFAULT NOW()' },
      { name: 'updated_at', type: 'TIMESTAMP DEFAULT NOW()' }
    ];
    
    for (const col of requiredColumns) {
      if (!existingColumns.includes(col.name)) {
        console.log(`Adding missing column: ${col.name}...`);
        await client.query(`ALTER TABLE bank_transactions ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ Added ${col.name}\n`);
      }
    }
    
    console.log('✅ All columns verified!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixAllColumns();
