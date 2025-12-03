import pg from 'pg';

const { Pool } = pg;

async function addColumn() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check if column exists
    const check = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'fee_payments' AND column_name = 'student_id'
    `);
    
    if (check.rows.length === 0) {
      await pool.query(`
        ALTER TABLE fee_payments 
        ADD COLUMN student_id UUID REFERENCES students(id)
      `);
      console.log('Added student_id column to fee_payments');
    } else {
      console.log('student_id column already exists');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addColumn();
