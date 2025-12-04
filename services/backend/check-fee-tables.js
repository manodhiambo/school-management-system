import pg from 'pg';

const { Pool } = pg;

async function checkFeeTables() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== Fee Invoices Table Structure ===\n');
    
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'fee_invoices'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns:');
    cols.rows.forEach(c => {
      console.log(`  - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable}, default: ${c.column_default || 'none'})`);
    });

    // Check constraints
    console.log('\n=== Constraints ===\n');
    const constraints = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'fee_invoices'::regclass
    `);
    constraints.rows.forEach(c => console.log(`  - ${c.conname}: ${c.definition}`));

    // Try a test insert to see what fails
    console.log('\n=== Test Insert ===\n');
    try {
      const testResult = await pool.query(`
        INSERT INTO fee_invoices (id, invoice_number, student_id, description, gross_amount, net_amount, balance_amount, due_date, status)
        VALUES (gen_random_uuid(), 'TEST-001', (SELECT id FROM students LIMIT 1), 'Test', 1000, 1000, 1000, NOW() + INTERVAL '30 days', 'pending')
        RETURNING id
      `);
      console.log('Test insert succeeded:', testResult.rows[0].id);
      // Clean up
      await pool.query('DELETE FROM fee_invoices WHERE invoice_number = $1', ['TEST-001']);
      console.log('Test record cleaned up');
    } catch (insertError) {
      console.log('Test insert failed:', insertError.message);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkFeeTables();
