import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function fixTable() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Fixing budget_allocations table...\n');
    
    // Drop the table if it exists
    console.log('Dropping existing table...');
    await client.query(`DROP TABLE IF EXISTS budget_allocations CASCADE;`);
    console.log('✓ Table dropped');
    
    // Create the table with correct structure
    console.log('Creating table with correct structure...');
    await client.query(`
      CREATE TABLE budget_allocations (
        id SERIAL PRIMARY KEY,
        budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        allocated_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        spent_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        variance NUMERIC(15,2) GENERATED ALWAYS AS (allocated_amount - spent_amount) STORED,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Table created');
    
    // Create indexes
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX idx_budget_allocations_budget_id ON budget_allocations(budget_id);
    `);
    await client.query(`
      CREATE INDEX idx_budget_allocations_period ON budget_allocations(period_start, period_end);
    `);
    console.log('✓ Indexes created');
    
    // Verify the structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'budget_allocations'
      ORDER BY ordinal_position
    `);
    
    console.log('\n✅ Table structure verified:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('\n👋 Done');
  }
}

fixTable();
