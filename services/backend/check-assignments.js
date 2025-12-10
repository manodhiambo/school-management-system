import pg from 'pg';

const { Pool } = pg;

async function check() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check if assignments table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'assignments'
      )
    `);
    console.log('Assignments table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Check columns
      const cols = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'assignments'
        ORDER BY ordinal_position
      `);
      console.log('\nAssignments columns:');
      cols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));

      // Check data
      const assignments = await pool.query('SELECT * FROM assignments LIMIT 10');
      console.log('\nAssignments data:', assignments.rows.length, 'rows');
      assignments.rows.forEach(a => {
        console.log(`  - ${a.title}: ${a.status} (class: ${a.class_id}, subject: ${a.subject_id})`);
      });
    }

    // Check assignment_submissions table
    const submissionsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'assignment_submissions'
      )
    `);
    console.log('\nAssignment_submissions table exists:', submissionsCheck.rows[0].exists);

    if (submissionsCheck.rows[0].exists) {
      const submissions = await pool.query('SELECT * FROM assignment_submissions LIMIT 10');
      console.log('Submissions:', submissions.rows.length, 'rows');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
