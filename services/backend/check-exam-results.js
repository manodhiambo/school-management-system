import pg from 'pg';

const { Pool } = pg;

async function check() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check exam_results table structure
    const cols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'exam_results'
      ORDER BY ordinal_position
    `);
    
    console.log('exam_results columns:');
    cols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));

    // Check exams table structure
    const examCols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'exams'
      ORDER BY ordinal_position
    `);
    
    console.log('\nexams columns:');
    examCols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
