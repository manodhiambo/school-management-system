import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function checkFeeInvoices() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('📋 FEE INVOICES ANALYSIS\n');
    console.log('=' .repeat(60));
    
    // Check fee_invoices structure
    console.log('\n1. FEE_INVOICES TABLE');
    const invoices = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fee_invoices'
      ORDER BY ordinal_position
    `);
    
    invoices.rows.forEach(col => console.log(`   - ${col.column_name}: ${col.data_type}`));
    
    const invoiceCount = await client.query('SELECT COUNT(*) FROM fee_invoices');
    console.log(`\n   Total Invoices: ${invoiceCount.rows[0].count}`);
    
    // Sample invoice
    const sampleInvoice = await client.query(`
      SELECT * FROM fee_invoices 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (sampleInvoice.rows.length > 0) {
      console.log('\n   Sample Invoice:');
      console.log('   ', JSON.stringify(sampleInvoice.rows[0], null, 2).split('\n').join('\n   '));
    }
    
    // Check fee_invoice_items
    console.log('\n\n2. FEE_INVOICE_ITEMS TABLE');
    const items = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fee_invoice_items'
      ORDER BY ordinal_position
    `);
    
    items.rows.forEach(col => console.log(`   - ${col.column_name}: ${col.data_type}`));
    
    const itemCount = await client.query('SELECT COUNT(*) FROM fee_invoice_items');
    console.log(`\n   Total Items: ${itemCount.rows[0].count}`);
    
    // Check fee_structure
    console.log('\n\n3. FEE_STRUCTURE TABLE');
    const structure = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fee_structure'
      ORDER BY ordinal_position
    `);
    
    structure.rows.forEach(col => console.log(`   - ${col.column_name}: ${col.data_type}`));
    
    const structureCount = await client.query('SELECT COUNT(*) FROM fee_structure');
    console.log(`\n   Total Fee Types: ${structureCount.rows[0].count}`);
    
    // Get fee structure data
    const feeTypes = await client.query('SELECT * FROM fee_structure LIMIT 5');
    if (feeTypes.rows.length > 0) {
      console.log('\n   Fee Types:');
      feeTypes.rows.forEach(ft => {
        console.log(`   - ${ft.fee_type}: KES ${Number(ft.amount).toLocaleString()}`);
      });
    }
    
    // Check if income_records has any fee-related entries
    console.log('\n\n4. EXISTING FINANCE INTEGRATION');
    try {
      const financeEntries = await client.query(`
        SELECT COUNT(*) as count
        FROM income_records
        WHERE description LIKE '%fee%' OR description LIKE '%tuition%'
      `);
      console.log(`   Fee-related income records: ${financeEntries.rows[0].count}`);
    } catch (e) {
      console.log('   ⚠️  No finance integration yet');
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkFeeInvoices();
