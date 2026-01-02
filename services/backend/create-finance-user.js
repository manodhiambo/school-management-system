import pool from './src/config/database.js';
import bcrypt from 'bcryptjs';

async function createFinanceOfficer() {
  try {
    console.log('Creating Finance Officer user...\n');
    
    const email = 'finance@school.com';
    const password = 'Finance@123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if user exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existing.rows.length > 0) {
      console.log('❌ Finance officer already exists');
      console.log('Email:', email);
      await pool.end();
      return;
    }
    
    // Create finance officer
    await pool.query(`
      INSERT INTO users (
        email, username, password, role, is_active, is_verified
      ) VALUES ($1, $2, $3, $4, true, true)
    `, [email, 'Finance Officer', hashedPassword, 'finance_officer']);
    
    console.log('✓ Finance Officer created successfully!\n');
    console.log('Login Credentials:');
    console.log('  Email:', email);
    console.log('  Password:', password);
    console.log('\n⚠️  Please change the password after first login!');
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

createFinanceOfficer();
