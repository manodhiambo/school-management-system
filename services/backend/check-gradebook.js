import pg from 'pg';

const { Pool } = pg;

async function check() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check if gradebook table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'gradebook'
      )
    `);
    
    console.log('Gradebook table exists:', tableCheck.rows[0].exists);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Creating gradebook table...');
      await pool.query(`
        CREATE TABLE gradebook (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          class_id UUID REFERENCES classes(id),
          student_id UUID REFERENCES students(id),
          subject_id UUID REFERENCES subjects(id),
          teacher_id UUID REFERENCES users(id),
          assessment_type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          marks NUMERIC(5,2) NOT NULL,
          max_marks NUMERIC(5,2) NOT NULL,
          grade VARCHAR(5),
          date DATE DEFAULT CURRENT_DATE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Gradebook table created!');
    } else {
      const cols = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'gradebook'
        ORDER BY ordinal_position
      `);
      console.log('Columns:');
      cols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
