import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function checkFeeStructure() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('📊 FEE MANAGEMENT SYSTEM ANALYSIS\n');
    console.log('=' .repeat(60));
    
    // Check fee_structures table
    console.log('\n1. FEE_STRUCTURES TABLE');
    const feeStructures = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fee_structures'
      ORDER BY ordinal_position
    `);
    
    if (feeStructures.rows.length > 0) {
      console.log('   Columns:');
      feeStructures.rows.forEach(col => console.log(`   - ${col.column_name}: ${col.data_type}`));
      
      const count = await client.query('SELECT COUNT(*) FROM fee_structures');
      console.log(`   Records: ${count.rows[0].count}`);
    } else {
      console.log('   ❌ Table does not exist');
    }
    
    // Check fee_payments table
    console.log('\n2. FEE_PAYMENTS TABLE');
    const feePayments = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fee_payments'
      ORDER BY ordinal_position
    `);
    
    if (feePayments.rows.length > 0) {
      console.log('   Columns:');
      feePayments.rows.forEach(col => console.log(`   - ${col.column_name}: ${col.data_type}`));
      
      const count = await client.query('SELECT COUNT(*) FROM fee_payments');
      console.log(`   Records: ${count.rows[0].count}`);
      
      // Get sample payment data
      const sample = await client.query(`
        SELECT * FROM fee_payments 
        ORDER BY created_at DESC 
        LIMIT 3
      `);
      
      if (sample.rows.length > 0) {
        console.log('\n   Sample Payment:');
        console.log('   ', JSON.stringify(sample.rows[0], null, 2).split('\n').join('\n   '));
      }
    } else {
      console.log('   ❌ Table does not exist');
    }
    
    // Check fee_categories or fee_types
    console.log('\n3. FEE CATEGORIES/TYPES');
    const feeCats = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%fee%' 
      AND table_schema = 'public'
    `);
    
    console.log('   Fee-related tables:');
    feeCats.rows.forEach(table => console.log(`   - ${table.table_name}`));
    
    // Check student_fees or fee_assignments
    console.log('\n4. STUDENT FEE ASSIGNMENTS');
    const studentFees = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('student_fees', 'fee_assignments')
      ORDER BY table_name, ordinal_position
    `);
    
    if (studentFees.rows.length > 0) {
      console.log('   Columns:');
      studentFees.rows.forEach(col => console.log(`   - ${col.column_name}: ${col.data_type}`));
    } else {
      console.log('   ❌ No student fee assignment table found');
    }
    
    // Get summary statistics
    console.log('\n5. FEE SUMMARY STATISTICS');
    
    try {
      const totalPayments = await client.query(`
        SELECT 
          COUNT(*) as payment_count,
          SUM(amount) as total_amount,
          MIN(payment_date) as earliest_payment,
          MAX(payment_date) as latest_payment
        FROM fee_payments
      `);
      
      if (totalPayments.rows.length > 0) {
        const stats = totalPayments.rows[0];
        console.log(`   Total Payments: ${stats.payment_count}`);
        console.log(`   Total Amount: KES ${Number(stats.total_amount || 0).toLocaleString()}`);
        console.log(`   Date Range: ${stats.earliest_payment} to ${stats.latest_payment}`);
      }
    } catch (e) {
      console.log('   ⚠️  Could not fetch payment statistics');
    }
    
    // Check payment methods
    try {
      const methods = await client.query(`
        SELECT payment_method, COUNT(*) as count, SUM(amount) as total
        FROM fee_payments
        GROUP BY payment_method
      `);
      
      if (methods.rows.length > 0) {
        console.log('\n   Payment Methods:');
        methods.rows.forEach(m => {
          console.log(`   - ${m.payment_method}: ${m.count} payments, KES ${Number(m.total).toLocaleString()}`);
        });
      }
    } catch (e) {
      console.log('   ⚠️  Could not fetch payment methods');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Analysis complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkFeeStructure();
