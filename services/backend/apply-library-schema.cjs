const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Correct connection string with c-2
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"
});

async function applySchema() {
  const client = await pool.connect();
  try {
    console.log('📚 Applying library schema...');
    console.log('Connected to database...');
    
    const schemaPath = path.join(__dirname, 'src/database/library-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema...');
    await client.query(schema);
    
    console.log('\n✅ Library schema applied successfully!\n');
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
    console.log('');
    console.log('🎉 Library module is ready to use!');
  } catch (error) {
    console.error('\n❌ Error applying schema:');
    console.error('Message:', error.message);
    if (error.code) console.error('Code:', error.code);
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
