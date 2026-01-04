import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function fixTable() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log('Checking bank_transactions table...\n');
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'bank_transactions'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Creating bank_transactions table...\n');
      
      await client.query(`
        CREATE TABLE bank_transactions (
          id SERIAL PRIMARY KEY,
          transaction_number VARCHAR(50) UNIQUE NOT NULL,
          account_id INTEGER REFERENCES bank_accounts(id) ON DELETE CASCADE,
          to_account_id INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL,
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
      
      console.log('✅ Table created!\n');
    } else {
      console.log('Table exists. Checking columns...\n');
      
      // Check if to_account_id exists
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'bank_transactions' AND column_name = 'to_account_id'
      `);
      
      if (columnCheck.rows.length === 0) {
        console.log('Adding missing to_account_id column...\n');
        
        await client.query(`
          ALTER TABLE bank_transactions 
          ADD COLUMN to_account_id INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL;
        `);
        
        console.log('✅ Column added!\n');
      } else {
        console.log('✅ All columns exist!\n');
      }
    }
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_bank_transactions_to_account ON bank_transactions(to_account_id);
      CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date);
      CREATE INDEX IF NOT EXISTS idx_bank_transactions_type ON bank_transactions(transaction_type);
    `);
    
    console.log('✅ Indexes created!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixTable();
