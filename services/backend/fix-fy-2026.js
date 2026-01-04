import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function fixYear() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    // Update 2026 to active and current
    await client.query(`
      UPDATE financial_years
      SET status = 'active', is_current = true
      WHERE year_name = '2026'
    `);
    
    // Set 2025 to not current
    await client.query(`
      UPDATE financial_years
      SET is_current = false
      WHERE year_name = '2025'
    `);
    
    console.log('✅ Updated financial years!');
    
    // Show current state
    const result = await client.query(`
      SELECT year_name, start_date, end_date, status, is_current
      FROM financial_years
      ORDER BY start_date DESC
    `);
    
    console.log('\nCurrent Financial Years:\n');
    result.rows.forEach(fy => {
      console.log(`${fy.year_name}: ${fy.status}${fy.is_current ? ' (CURRENT)' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixYear();
