import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function resetAdminPassword() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    
    // Generate new password hash
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('New password hash generated');
    
    // Update admin user password
    const result = await pool.query(
      `UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email, role`,
      [hashedPassword, 'admin@school.com']
    );
    
    if (result.rowCount === 0) {
      console.log('Admin user not found, creating one...');
      
      // Create admin user if doesn't exist
      const createResult = await pool.query(
        `INSERT INTO users (id, email, password, role, is_active, is_verified)
         VALUES (gen_random_uuid(), $1, $2, $3, true, true)
         RETURNING id, email, role`,
        ['admin@school.com', hashedPassword, 'admin']
      );
      
      console.log('Admin user created:', createResult.rows[0]);
    } else {
      console.log('Admin password updated:', result.rows[0]);
    }
    
    // Verify the password works
    const users = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@school.com']);
    const user = users.rows[0];
    
    const isValid = await bcrypt.compare('admin123', user.password);
    console.log('Password verification:', isValid ? 'SUCCESS' : 'FAILED');
    
    console.log('\n✓ Done! You can now login with:');
    console.log('  Email: admin@school.com');
    console.log('  Password: admin123');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();
