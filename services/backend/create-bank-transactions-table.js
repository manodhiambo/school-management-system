import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function createTable() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Creating bank_transactions table...\n');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS bank_transactions (
        id SERIAL PRIMARY KEY,
        transaction_number VARCHAR(50) UNIQUE NOT NULL,
        account_id INTEGER REFERENCES bank_accounts(id),
        to_account_id INTEGER REFERENCES bank_accounts(id),
        transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer')),
        amount NUMERIC(15,2) NOT NULL,
        description TEXT NOT NULL,
        transaction_date DATE NOT NULL,
        reference_number VARCHAR(100),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date);
      CREATE INDEX IF NOT EXISTS idx_bank_transactions_type ON bank_transactions(transaction_type);
    `);
    
    console.log('✅ bank_transactions table created with indexes!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createTable();
