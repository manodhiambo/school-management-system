import pg from 'pg';

const { Pool } = pg;

async function check() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check for exam related tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%exam%' OR table_name LIKE '%result%' OR table_name LIKE '%grade%'
    `);
    
    console.log('Exam/Result/Grade related tables:');
    tables.rows.forEach(t => console.log('  -', t.table_name));

    // Check gradebook table
    const gradebook = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'gradebook'
    `);
    
    if (gradebook.rows.length > 0) {
      console.log('\nGradebook columns:');
      gradebook.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
