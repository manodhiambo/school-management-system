import pg from 'pg';

const { Pool } = pg;

async function checkInvoices() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== Fee Invoices ===\n');
    
    const invoices = await pool.query('SELECT * FROM fee_invoices ORDER BY created_at DESC LIMIT 10');
    console.log('Total invoices:', invoices.rows.length);
    
    if (invoices.rows.length > 0) {
      console.log('\nRecent invoices:');
      invoices.rows.forEach(inv => {
        console.log(`  - ${inv.invoice_number}: ${inv.net_amount} (status: ${inv.status})`);
      });
    }
    
    console.log('\n=== Fee Statistics ===\n');
    const stats = await pool.query(`
      SELECT
        COALESCE(SUM(net_amount), 0)::numeric as total_amount,
        COALESCE(SUM(paid_amount), 0)::numeric as total_collected,
        COALESCE(SUM(balance_amount), 0)::numeric as total_pending,
        COUNT(*)::int as total_invoices
      FROM fee_invoices
    `);
    console.log('Stats:', stats.rows[0]);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkInvoices();
