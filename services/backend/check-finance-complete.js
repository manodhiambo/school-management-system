import pool from './src/config/database.js';

async function checkFinanceComplete() {
  try {
    console.log('=== COMPLETE FINANCE MODULE CHECK ===\n');

    // Check academic_years structure
    console.log('📅 Academic Years Table Structure:');
    const academicCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'academic_years'
      ORDER BY ordinal_position
    `);
    academicCols.rows.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));
    
    const academicYears = await pool.query(`SELECT * FROM academic_years ORDER BY start_date DESC LIMIT 3`);
    console.log('\nAcademic Years Data:', academicYears.rows);
    
    // Check financial_years
    console.log('\n💼 Financial Years:');
    const financialYears = await pool.query(`SELECT * FROM financial_years ORDER BY start_date DESC`);
    console.log(`  Total: ${financialYears.rows.length}`);
    financialYears.rows.forEach(fy => {
      console.log(`  - ${fy.year_name || fy.name}: ${fy.start_date} to ${fy.end_date} ${fy.is_active ? '✓' : ''}`);
    });
    
    // Check chart of accounts
    console.log('\n📊 Chart of Accounts:');
    const accounts = await pool.query(`
      SELECT account_type, COUNT(*) as count 
      FROM chart_of_accounts 
      GROUP BY account_type
    `);
    accounts.rows.forEach(acc => console.log(`  - ${acc.account_type}: ${acc.count} accounts`));
    
    // Check budgets
    console.log('\n💰 Budgets:');
    const budgets = await pool.query(`SELECT COUNT(*) as count FROM budgets`);
    console.log(`  Total Budgets: ${budgets.rows[0].count}`);
    
    // Check vendors
    console.log('\n🏢 Vendors:');
    const vendors = await pool.query(`SELECT COUNT(*) as count FROM vendors`);
    console.log(`  Total Vendors: ${vendors.rows[0].count}`);
    
    // Check purchase orders
    console.log('\n📝 Purchase Orders:');
    const pos = await pool.query(`SELECT COUNT(*) as count FROM purchase_orders`);
    console.log(`  Total POs: ${pos.rows[0].count}`);
    
    // Check bank accounts
    console.log('\n🏦 Bank Accounts:');
    const banks = await pool.query(`SELECT * FROM bank_accounts`);
    console.log(`  Total Accounts: ${banks.rows.length}`);
    banks.rows.forEach(bank => {
      console.log(`  - ${bank.account_name}: ${bank.account_number} (${bank.bank_name})`);
    });
    
    // Check income and expenses
    console.log('\n💵 Income Records:');
    const income = await pool.query(`
      SELECT COUNT(*) as count, SUM(amount) as total 
      FROM income_records
    `);
    console.log(`  Total: ${income.rows[0].count}, Amount: KSH ${income.rows[0].total || 0}`);
    
    console.log('\n💸 Expense Records:');
    const expenses = await pool.query(`
      SELECT COUNT(*) as count, SUM(amount) as total 
      FROM expense_records
    `);
    console.log(`  Total: ${expenses.rows[0].count}, Amount: KSH ${expenses.rows[0].total || 0}`);
    
    // Check if finance routes exist in server.js
    console.log('\n🛣️  Checking Server Routes...');
    const fs = await import('fs');
    const serverContent = fs.readFileSync('./src/server.js', 'utf8');
    const hasFinanceRoutes = serverContent.includes('finance');
    console.log(`  Finance routes in server.js: ${hasFinanceRoutes ? '✓ YES' : '❌ NO'}`);
    
    // List all route files
    console.log('\n📁 Route Files:');
    const routeFiles = fs.readdirSync('./src/routes/');
    routeFiles.forEach(f => {
      if (f.includes('finance') || f.includes('Finance')) {
        console.log(`  ✓ ${f}`);
      }
    });
    
    console.log('\n=== CHECK COMPLETE ===');
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

checkFinanceComplete();
