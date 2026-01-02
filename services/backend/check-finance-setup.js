import pool from './src/config/database.js';

async function checkFinanceSetup() {
  try {
    console.log('=== FINANCE MODULE SETUP CHECK ===\n');

    // Check ALL tables
    console.log('📋 All Database Tables:');
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    allTables.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    // Check user roles
    console.log('\n👥 User Roles:');
    const roles = await pool.query(`
      SELECT DISTINCT role, COUNT(*) as count 
      FROM users 
      GROUP BY role 
      ORDER BY role
    `);
    roles.rows.forEach(row => console.log(`  - ${row.role}: ${row.count} users`));
    
    // Check fee structure (correct table name)
    console.log('\n💰 Fee Structure:');
    const feeStructure = await pool.query(`
      SELECT * FROM fee_structure LIMIT 5
    `);
    console.log(`  Total records: ${feeStructure.rows.length}`);
    if (feeStructure.rows.length > 0) {
      console.log('  Sample:', feeStructure.rows[0]);
    }
    
    // Check fee payments
    console.log('\n💵 Fee Payments:');
    const feePayments = await pool.query(`
      SELECT COUNT(*) as count, SUM(amount) as total 
      FROM fee_payments
    `);
    console.log(`  Total Payments: ${feePayments.rows[0].count}`);
    console.log(`  Total Amount: KSH ${feePayments.rows[0].total || 0}`);
    
    // Check fee invoices
    console.log('\n📄 Fee Invoices:');
    const invoices = await pool.query(`
      SELECT COUNT(*) as count FROM fee_invoices
    `);
    console.log(`  Total Invoices: ${invoices.rows[0].count}`);
    
    // Check finance settings
    console.log('\n⚙️  Finance Settings:');
    const settings = await pool.query(`
      SELECT * FROM finance_settings LIMIT 1
    `);
    if (settings.rows.length > 0) {
      console.log('  Settings exist:', settings.rows[0]);
    } else {
      console.log('  No settings found - needs initialization');
    }
    
    // Check academic years
    console.log('\n📅 Academic Years:');
    const academicYears = await pool.query(`
      SELECT id, year_name, start_date, end_date, is_current 
      FROM academic_years 
      ORDER BY start_date DESC
    `);
    academicYears.rows.forEach(row => {
      console.log(`  - ${row.year_name} (${row.start_date} to ${row.end_date}) ${row.is_current ? '✓ CURRENT' : ''}`);
    });
    
    // Check if finance routes exist
    console.log('\n🛣️  Checking Finance Routes...');
    const fs = await import('fs');
    const routesPath = './src/routes/';
    const files = fs.readdirSync(routesPath);
    const financeFiles = files.filter(f => f.toLowerCase().includes('finance'));
    if (financeFiles.length > 0) {
      console.log('  Finance route files found:');
      financeFiles.forEach(f => console.log(`    - ${f}`));
    } else {
      console.log('  ❌ No finance route files found!');
    }
    
    console.log('\n=== CHECK COMPLETE ===');
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkFinanceSetup();
