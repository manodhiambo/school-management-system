import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function runMigration() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to database...\n');
    
    // Create budget_items table
    console.log('Creating budget_items table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_items (
        id SERIAL PRIMARY KEY,
        budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        account_id INTEGER REFERENCES chart_of_accounts(id),
        allocated_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        spent_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ budget_items table created');
    
    // Create indexes for budget_items
    console.log('Creating budget_items indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON budget_items(budget_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_budget_items_account_id ON budget_items(account_id);
    `);
    console.log('✓ budget_items indexes created');
    
    // Create trigger function
    console.log('Creating trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_budget_spent_amount()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE budgets 
        SET spent_amount = (
          SELECT COALESCE(SUM(spent_amount), 0) 
          FROM budget_items 
          WHERE budget_id = COALESCE(NEW.budget_id, OLD.budget_id)
        ),
        updated_at = NOW()
        WHERE id = COALESCE(NEW.budget_id, OLD.budget_id);
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✓ Trigger function created');
    
    // Drop existing trigger if exists
    console.log('Creating trigger...');
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_budget_spent ON budget_items;
    `);
    
    // Create trigger
    await client.query(`
      CREATE TRIGGER trigger_update_budget_spent
      AFTER INSERT OR UPDATE OR DELETE ON budget_items
      FOR EACH ROW
      EXECUTE FUNCTION update_budget_spent_amount();
    `);
    console.log('✓ Trigger created');
    
    // Create budget_allocations table
    console.log('Creating budget_allocations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_allocations (
        id SERIAL PRIMARY KEY,
        budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        allocated_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        spent_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ budget_allocations table created');
    
    // Create indexes for budget_allocations - now that table exists
    console.log('Creating budget_allocations indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_budget_allocations_budget_id ON budget_allocations(budget_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_budget_allocations_period ON budget_allocations(period_start, period_end);
    `);
    console.log('✓ budget_allocations indexes created');
    
    // Check if variance column exists, if not add it as computed column
    console.log('Setting up variance column...');
    const varianceCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'budget_allocations' 
      AND column_name = 'variance'
    `);
    
    if (varianceCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE budget_allocations 
        ADD COLUMN variance NUMERIC(15,2) GENERATED ALWAYS AS (allocated_amount - spent_amount) STORED;
      `);
      console.log('✓ Variance column added');
    } else {
      console.log('✓ Variance column already exists');
    }
    
    console.log('\n✅ All migrations completed successfully!');
    
    // Show table structure and counts
    console.log('\n📊 Database Status:');
    
    const budgetItemsCount = await client.query('SELECT COUNT(*) FROM budget_items');
    console.log('\nbudget_items:');
    console.log('  - Records:', budgetItemsCount.rows[0].count);
    
    const budgetAllocationsCount = await client.query('SELECT COUNT(*) FROM budget_allocations');
    console.log('\nbudget_allocations:');
    console.log('  - Records:', budgetAllocationsCount.rows[0].count);
    
    const budgetsCount = await client.query('SELECT COUNT(*) FROM budgets');
    console.log('\nbudgets:');
    console.log('  - Total:', budgetsCount.rows[0].count);
    
    const budgetsByStatus = await client.query(`
      SELECT status, COUNT(*) as count 
      FROM budgets 
      GROUP BY status
    `);
    console.log('  - By Status:');
    budgetsByStatus.rows.forEach(row => {
      console.log(`    * ${row.status}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n👋 Database connection closed.');
  }
}

runMigration();
