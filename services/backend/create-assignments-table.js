import pg from 'pg';

const { Pool } = pg;

async function createAssignmentsTable() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Creating assignments tables...\n');
    
    // Create assignments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        class_id UUID REFERENCES classes(id),
        subject_id UUID REFERENCES subjects(id),
        teacher_id UUID REFERENCES teachers(id),
        due_date DATE,
        max_score INTEGER DEFAULT 100,
        attachment_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created assignments table');

    // Create assignment_submissions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
        student_id UUID REFERENCES students(id),
        submission_text TEXT,
        attachment_url TEXT,
        score INTEGER,
        feedback TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        graded_at TIMESTAMP,
        graded_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created assignment_submissions table');

    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_submissions_student ON assignment_submissions(student_id)');
    console.log('Created indexes');

    // Insert sample assignments
    const classes = await pool.query('SELECT id, name FROM classes LIMIT 2');
    const subjects = await pool.query('SELECT id, name FROM subjects LIMIT 2');
    const teachers = await pool.query('SELECT id FROM teachers LIMIT 1');

    if (classes.rows.length > 0 && subjects.rows.length > 0 && teachers.rows.length > 0) {
      const teacherId = teachers.rows[0].id;
      
      // Check if sample assignments already exist
      const existing = await pool.query('SELECT COUNT(*) as count FROM assignments');
      if (parseInt(existing.rows[0].count) === 0) {
        await pool.query(`
          INSERT INTO assignments (title, description, class_id, subject_id, teacher_id, due_date, max_score)
          VALUES 
            ('Algebra Homework', 'Complete exercises 1-10 from Chapter 5', $1, $2, $3, CURRENT_DATE + INTERVAL '7 days', 100),
            ('Essay Writing', 'Write a 500-word essay on environmental conservation', $1, $4, $3, CURRENT_DATE + INTERVAL '14 days', 100)
        `, [classes.rows[0].id, subjects.rows[0].id, teacherId, subjects.rows[1]?.id || subjects.rows[0].id]);
        console.log('Inserted sample assignments');
      } else {
        console.log('Assignments already exist');
      }
    }

    console.log('\nDone!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

createAssignmentsTable();
