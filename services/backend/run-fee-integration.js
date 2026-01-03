import pkg from 'pg';
import fs from 'fs';
const { Client } = pkg;

const connectionString = 'postgresql://REDACTED:REDACTED@REDACTED/neondb?sslmode=require';

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
