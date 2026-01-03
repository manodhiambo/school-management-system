import pkg from 'pg';
import fs from 'fs';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function runFixes() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Running database fixes...\n');
    
    const sql = fs.readFileSync('fix-all-finance-issues.sql', 'utf8');
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim().startsWith('SELECT')) {
        const result = await client.query(statement);
        console.log(result.rows);
      } else if (statement.trim()) {
        await client.query(statement);
        console.log('✓ Executed');
      }
    }
    
    console.log('\n✅ All fixes applied');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

runFixes();
