import pg from 'pg';

const { Pool } = pg;

async function check() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'parent_students'
      )
    `);
    console.log('parent_students table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      const cols = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'parent_students'
        ORDER BY ordinal_position
      `);
      console.log('\nColumns:');
      cols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));

      const data = await pool.query('SELECT * FROM parent_students');
      console.log('\nData:', data.rows.length, 'rows');
      data.rows.forEach(r => console.log(`  - parent: ${r.parent_id}, student: ${r.student_id}`));
    } else {
      console.log('\nCreating parent_students table...');
      await pool.query(`
        CREATE TABLE parent_students (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
          student_id UUID REFERENCES students(id) ON DELETE CASCADE,
          relationship VARCHAR(50) DEFAULT 'guardian',
          is_primary BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(parent_id, student_id)
        )
      `);
      console.log('Table created!');
    }

    // Show parents
    console.log('\n=== Parents ===');
    const parents = await pool.query(`
      SELECT p.id, p.first_name, p.last_name, u.email
      FROM parents p
      LEFT JOIN users u ON p.user_id = u.id
    `);
    parents.rows.forEach(p => console.log(`  - ${p.first_name} ${p.last_name} (${p.email}) - ID: ${p.id}`));

    // Show students
    console.log('\n=== Students ===');
    const students = await pool.query(`
      SELECT s.id, s.first_name, s.last_name, s.admission_number
      FROM students s
    `);
    students.rows.forEach(s => console.log(`  - ${s.first_name} ${s.last_name} (${s.admission_number}) - ID: ${s.id}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
