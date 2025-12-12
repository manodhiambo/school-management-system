const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://REDACTED:REDACTED@REDACTED/neondb?sslmode=require"
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
