import pkg from 'pg';
import fs from 'fs';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function runIntegration() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('🔗 Running Fee to Finance Integration...\n');
    
    const sql = fs.readFileSync('integrate-fee-to-finance.sql', 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Integration completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Integration failed:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

runIntegration();
