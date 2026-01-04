import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function checkFinancialYears() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const result = await client.query('SELECT * FROM financial_years ORDER BY start_date DESC');
    
    console.log('📅 FINANCIAL YEARS:');
    console.log(`Total: ${result.rows.length}\n`);
    
    if (result.rows.length === 0) {
      console.log('❌ No financial years found!\n');
      console.log('Creating default financial year for 2025-2026...\n');
      
      await client.query(`
        INSERT INTO financial_years (year_name, start_date, end_date, status, is_current, is_active)
        VALUES 
          ('2025-2026', '2025-01-01', '2025-12-31', 'active', true, true),
          ('2024-2025', '2024-01-01', '2024-12-31', 'closed', false, false),
          ('2026-2027', '2026-01-01', '2026-12-31', 'draft', false, false)
      `);
      
      console.log('✅ Created default financial years!\n');
      
      const newResult = await client.query('SELECT * FROM financial_years ORDER BY start_date DESC');
      newResult.rows.forEach(fy => {
        console.log(`  - ${fy.year_name}: ${fy.start_date.toISOString().split('T')[0]} to ${fy.end_date.toISOString().split('T')[0]} (${fy.status})`);
      });
    } else {
      result.rows.forEach(fy => {
        console.log(`  - ${fy.year_name}: ${fy.start_date.toISOString().split('T')[0]} to ${fy.end_date.toISOString().split('T')[0]} (${fy.status})`);
      });
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkFinancialYears();
