import pg from 'pg';

const { Pool } = pg;

async function test() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Get parent by ID
    const parentId = 'b52fe60f-be21-4c9a-a8ce-b37c8176a686'; // Thomas Onyango
    
    const parents = await pool.query(`
      SELECT p.*, u.email
      FROM parents p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [parentId]);

    console.log('Parent:', parents.rows[0]);

    // Get children
    const children = await pool.query(`
      SELECT s.*, c.name as class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      JOIN parent_students ps ON s.id = ps.student_id
      WHERE ps.parent_id = $1
    `, [parentId]);

    console.log('Children:', children.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

test();
