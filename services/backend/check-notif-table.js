import pg from 'pg';

const { Pool } = pg;

async function check() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    const cols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'notifications'
      ORDER BY ordinal_position
    `);
    console.log('Notifications columns:');
    cols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));

    // Add missing columns if needed
    const hasData = cols.rows.some(c => c.column_name === 'data');
    if (!hasData) {
      console.log('\nAdding data column...');
      await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB');
      console.log('Done!');
    }

    const hasType = cols.rows.some(c => c.column_name === 'type');
    if (!hasType) {
      console.log('\nAdding type column...');
      await pool.query("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'info'");
      console.log('Done!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
