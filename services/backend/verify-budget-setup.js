import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function verify() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('📊 Budget System Setup Verification\n');
    console.log('=' .repeat(50));
    
    // Check budgets table
    console.log('\n1. BUDGETS TABLE');
    const budgetsCount = await client.query('SELECT COUNT(*) FROM budgets');
    console.log(`   ✓ Exists with ${budgetsCount.rows[0].count} records`);
    
    // Check budget_items table
    console.log('\n2. BUDGET_ITEMS TABLE');
    const itemsCount = await client.query('SELECT COUNT(*) FROM budget_items');
    console.log(`   ✓ Exists with ${itemsCount.rows[0].count} records`);
    
    // Check trigger
    const triggerCheck = await client.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name = 'trigger_update_budget_spent'
    `);
    console.log(`   ${triggerCheck.rows.length > 0 ? '✓' : '✗'} Trigger exists: trigger_update_budget_spent`);
    
    // Check budget_allocations table
    console.log('\n3. BUDGET_ALLOCATIONS TABLE');
    const allocCount = await client.query('SELECT COUNT(*) FROM budget_allocations');
    console.log(`   ✓ Exists with ${allocCount.rows[0].count} records`);
    
    // Check indexes
    console.log('\n4. INDEXES');
    const indexes = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('budgets', 'budget_items', 'budget_allocations')
      ORDER BY indexname
    `);
    indexes.rows.forEach(idx => {
      console.log(`   ✓ ${idx.indexname}`);
    });
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Budget system is ready!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

verify();
