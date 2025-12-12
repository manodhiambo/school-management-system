const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"
});

async function testBooks() {
  try {
    const result = await pool.query('SELECT * FROM library_books WHERE is_active = TRUE');
    console.log('\n📚 Books in database:', result.rows.length);
    console.log('\nFirst 3 books:');
    result.rows.slice(0, 3).forEach(book => {
      console.log(`- ${book.title} by ${book.author} (${book.available_copies}/${book.total_copies} available)`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testBooks();
