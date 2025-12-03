import pg from 'pg';

const { Pool } = pg;

async function checkConstraints() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== Fee Structure Table Info ===\n');
    
    // Check table structure
    const cols = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'fee_structure'
    `);
    console.log('Columns:');
    cols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type} (default: ${c.column_default})`));

    // Check constraints
    const constraints = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'fee_structure'::regclass
    `);
    console.log('\nConstraints:');
    constraints.rows.forEach(c => console.log(`  - ${c.conname}: ${c.definition}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkConstraints();
