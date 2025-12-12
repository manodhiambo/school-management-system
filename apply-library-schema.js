const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-a2-us-west-2.aws.neon.tech/neondb?sslmode=require"
});

async function applySchema() {
  const client = await pool.connect();
  try {
    console.log('📚 Applying library schema...');
    
    const schemaPath = path.join(__dirname, 'services/backend/src/database/library-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(schema);
    
    console.log('✅ Library schema applied successfully!');
    console.log('📖 Tables created:');
    console.log('   - library_books');
    console.log('   - library_members');
    console.log('   - library_borrowings');
    console.log('   - library_reservations');
    console.log('   - library_fines');
    console.log('');
    console.log('📚 Sample books inserted:');
    console.log('   - Things Fall Apart by Chinua Achebe');
    console.log('   - A Brief History of Time by Stephen Hawking');
    console.log('   - The River and the Source by Margaret Ogola');
  } catch (error) {
    console.error('❌ Error applying schema:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applySchema()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
