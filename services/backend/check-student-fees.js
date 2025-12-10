import pg from 'pg';

const { Pool } = pg;

async function check() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== Fee Invoices ===');
    const invoices = await pool.query(`
      SELECT fi.*, s.first_name, s.last_name, s.user_id
      FROM fee_invoices fi
      LEFT JOIN students s ON fi.student_id = s.id
      ORDER BY fi.created_at DESC
    `);
    console.log('Total invoices:', invoices.rows.length);
    invoices.rows.forEach(inv => {
      console.log(`\n  Invoice: ${inv.invoice_number}`);
      console.log(`    Student: ${inv.first_name} ${inv.last_name} (student_id: ${inv.student_id}, user_id: ${inv.user_id})`);
      console.log(`    Total: ${inv.total_amount}, Paid: ${inv.total_amount - inv.balance_amount}, Balance: ${inv.balance_amount}`);
      console.log(`    Status: ${inv.status}, Due: ${inv.due_date}`);
    });

    console.log('\n=== Fee Payments ===');
    const payments = await pool.query(`
      SELECT fp.*, fi.invoice_number, s.first_name, s.last_name
      FROM fee_payments fp
      LEFT JOIN fee_invoices fi ON fp.invoice_id = fi.id
      LEFT JOIN students s ON fi.student_id = s.id
      ORDER BY fp.payment_date DESC
    `);
    console.log('Total payments:', payments.rows.length);
    payments.rows.forEach(p => {
      console.log(`  ${p.first_name} ${p.last_name}: ${p.amount} via ${p.payment_method} on ${p.payment_date}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
