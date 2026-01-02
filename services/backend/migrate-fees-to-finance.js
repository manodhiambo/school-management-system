import pool from './src/config/database.js';

async function migrateFeePaymentsToIncome() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Starting migration of fee payments to income records...\n');
    
    // 1. Get or create "Student Fees" income account
    console.log('1. Setting up Student Fees income account...');
    let feeIncomeAccount = await client.query(`
      SELECT id FROM chart_of_accounts 
      WHERE account_code = 'INC-001' AND account_type = 'income'
    `);
    
    if (feeIncomeAccount.rows.length === 0) {
      feeIncomeAccount = await client.query(`
        INSERT INTO chart_of_accounts (
          account_code, account_name, account_type, description, is_active
        ) VALUES (
          'INC-001', 'Student Fees', 'income', 'Income from student fee payments', true
        ) RETURNING id
      `);
      console.log('   ✓ Created Student Fees account');
    } else {
      console.log('   ✓ Student Fees account already exists');
    }
    
    const accountId = feeIncomeAccount.rows[0].id;
    
    // 2. Migrate existing fee payments to income records
    console.log('\n2. Migrating fee payments to income records...');
    
    const feePayments = await client.query(`
      SELECT 
        fp.id,
        fp.student_id,
        fp.amount,
        fp.payment_date,
        fp.payment_method,
        fp.transaction_id,
        fp.status,
        s.first_name,
        s.last_name
      FROM fee_payments fp
      LEFT JOIN students s ON fp.student_id = s.id
      WHERE fp.status = 'completed'
      ORDER BY fp.payment_date DESC
    `);
    
    console.log(`   Found ${feePayments.rows.length} completed fee payments`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const payment of feePayments.rows) {
      // Check if already migrated
      const existing = await client.query(`
        SELECT id FROM income_records 
        WHERE reference_number = $1
      `, [`FEE-${payment.transaction_id || payment.id}`]);
      
      if (existing.rows.length === 0) {
        // Calculate VAT (16% is inclusive, so we extract it)
        const totalAmount = parseFloat(payment.amount);
        const amountBeforeVAT = totalAmount / 1.16;
        const vatAmount = totalAmount - amountBeforeVAT;
        
        await client.query(`
          INSERT INTO income_records (
            transaction_date,
            account_id,
            amount,
            vat_amount,
            description,
            reference_number,
            payment_method,
            status,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `, [
          payment.payment_date,
          accountId,
          amountBeforeVAT,
          vatAmount,
          `Fee payment from ${payment.first_name} ${payment.last_name}`,
          `FEE-${payment.transaction_id || payment.id}`,
          payment.payment_method || 'mpesa',
          'completed',
        ]);
        
        migratedCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log(`   ✓ Migrated: ${migratedCount} payments`);
    console.log(`   ✓ Skipped (already exists): ${skippedCount} payments`);
    
    // 3. Set up default bank accounts - using valid account types
    console.log('\n3. Setting up default bank accounts...');
    
    const bankAccounts = await client.query(`SELECT COUNT(*) as count FROM bank_accounts`);
    
    if (parseInt(bankAccounts.rows[0].count) === 0) {
      // Use 'savings' and 'current' which are likely valid types
      await client.query(`
        INSERT INTO bank_accounts (
          account_name, account_number, bank_name, account_type, 
          currency, current_balance, is_active
        ) VALUES 
        ('School Operating Account', '1234567890', 'Equity Bank', 'current', 'KES', 0, true),
        ('M-Pesa Business Account', '247247', 'Safaricom M-Pesa', 'savings', 'KES', 0, true)
      `);
      console.log('   ✓ Created default bank accounts');
    } else {
      console.log('   ✓ Bank accounts already exist');
    }
    
    // 4. Update finance settings
    console.log('\n4. Updating finance settings...');
    
    await client.query(`
      INSERT INTO finance_settings (setting_key, setting_value, setting_type, description)
      VALUES 
        ('default_vat_rate', '16', 'number', 'Standard VAT rate (KRA)'),
        ('default_currency', 'KES', 'string', 'Default currency'),
        ('expense_approval_required', 'true', 'boolean', 'Require approval for expenses'),
        ('expense_approval_threshold', '10000', 'number', 'Auto-approve expenses below this amount')
      ON CONFLICT (setting_key) DO NOTHING
    `);
    console.log('   ✓ Finance settings updated');
    
    // 5. Summary
    console.log('\n=== MIGRATION SUMMARY ===');
    
    const totalIncome = await client.query(`
      SELECT 
        COUNT(*) as count,
        SUM(amount + COALESCE(vat_amount, 0)) as total
      FROM income_records
    `);
    
    console.log(`Total Income Records: ${totalIncome.rows[0].count}`);
    console.log(`Total Income Amount: KES ${parseFloat(totalIncome.rows[0].total || 0).toLocaleString()}`);
    
    await client.query('COMMIT');
    console.log('\n✓ Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrateFeePaymentsToIncome().catch(console.error);
