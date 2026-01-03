import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function verifyIntegration() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ INTEGRATION VERIFICATION\n');
    console.log('=' .repeat(60));
    
    // Check income records from fees
    const incomeRecords = await client.query(`
      SELECT 
        COUNT(*) as count,
        SUM(total_amount) as total
      FROM income_records
      WHERE income_category = 'Student Fees'
    `);
    
    console.log('\n📊 INCOME RECORDS (from fees)');
    console.log(`   Records: ${incomeRecords.rows[0].count}`);
    console.log(`   Total Amount: KES ${Number(incomeRecords.rows[0].total || 0).toLocaleString()}`);
    
    // Check fee payments
    const feePayments = await client.query(`
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total
      FROM fee_payments
      WHERE status = 'success'
    `);
    
    console.log('\n💰 FEE PAYMENTS');
    console.log(`   Records: ${feePayments.rows[0].count}`);
    console.log(`   Total Amount: KES ${Number(feePayments.rows[0].total || 0).toLocaleString()}`);
    
    // Check fee collection summary view
    const summary = await client.query(`SELECT * FROM v_fee_collection_summary`);
    
    console.log('\n📈 FEE COLLECTION SUMMARY');
    const s = summary.rows[0];
    console.log(`   Total Students: ${s.total_students}`);
    console.log(`   Total Invoices: ${s.total_invoices}`);
    console.log(`   Total Billed: KES ${Number(s.total_billed).toLocaleString()}`);
    console.log(`   Total Collected: KES ${Number(s.total_collected).toLocaleString()}`);
    console.log(`   Outstanding: KES ${Number(s.total_outstanding).toLocaleString()}`);
    console.log(`   Collection Rate: ${s.collection_rate}%`);
    console.log(`   Status Breakdown:`);
    console.log(`     - Paid: ${s.paid_invoices}`);
    console.log(`     - Partial: ${s.partial_invoices}`);
    console.log(`     - Pending: ${s.pending_invoices}`);
    console.log(`     - Overdue: ${s.overdue_invoices}`);
    
    // Sample income record
    const sample = await client.query(`
      SELECT * FROM income_records 
      WHERE income_category = 'Student Fees'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (sample.rows.length > 0) {
      console.log('\n📄 SAMPLE INCOME RECORD');
      console.log(`   Number: ${sample.rows[0].income_number}`);
      console.log(`   Date: ${sample.rows[0].income_date}`);
      console.log(`   Amount: KES ${Number(sample.rows[0].total_amount).toLocaleString()}`);
      console.log(`   Method: ${sample.rows[0].payment_method}`);
      console.log(`   Description: ${sample.rows[0].description}`);
    }
    
    // Check trigger exists
    const trigger = await client.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name = 'trigger_sync_fee_to_income'
    `);
    
    console.log('\n🔄 AUTO-SYNC TRIGGER');
    console.log(`   Status: ${trigger.rows.length > 0 ? '✅ Active' : '❌ Not Found'}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Verification Complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

verifyIntegration();
