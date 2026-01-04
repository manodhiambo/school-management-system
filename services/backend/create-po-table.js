import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function createTable() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Creating purchase_orders table...\n');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(50) UNIQUE NOT NULL,
        vendor_id INTEGER REFERENCES vendors(id),
        po_date DATE NOT NULL,
        delivery_date DATE,
        subtotal NUMERIC(15,2) NOT NULL,
        vat_amount NUMERIC(15,2) DEFAULT 0,
        total_amount NUMERIC(15,2) NOT NULL,
        terms_conditions TEXT,
        notes TEXT,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent', 'received', 'cancelled')),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('✅ purchase_orders table created!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createTable();
