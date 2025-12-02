import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

async function fixStudents() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Finding student users without student records...\n');
    
    // Find users with role 'student' that don't have student records
    const orphanStudents = await pool.query(`
      SELECT u.id, u.email 
      FROM users u 
      LEFT JOIN students s ON u.id = s.user_id 
      WHERE u.role = 'student' AND s.id IS NULL
    `);
    
    console.log('Found', orphanStudents.rows.length, 'student users without records');
    
    // Get the class
    const classes = await pool.query('SELECT id FROM classes LIMIT 1');
    const classId = classes.rows.length > 0 ? classes.rows[0].id : null;
    
    for (const user of orphanStudents.rows) {
      const studentId = uuidv4();
      const year = new Date().getFullYear();
      
      // Generate admission number
      const lastStudent = await pool.query(
        `SELECT admission_number FROM students 
         WHERE admission_number LIKE $1 
         ORDER BY admission_number DESC LIMIT 1`,
        [`STD${year}%`]
      );
      
      let sequence = 1;
      if (lastStudent.rows.length > 0) {
        sequence = parseInt(lastStudent.rows[0].admission_number.slice(-4)) + 1;
      }
      const admissionNumber = `STD${year}${sequence.toString().padStart(4, '0')}`;
      
      // Extract name from email
      const emailName = user.email.split('@')[0];
      const firstName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
      
      await pool.query(
        `INSERT INTO students (
          id, user_id, admission_number, first_name, last_name, 
          class_id, status, admission_date
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())`,
        [studentId, user.id, admissionNumber, firstName, 'Student', classId]
      );
      
      console.log(`Created student record for ${user.email} - ${admissionNumber}`);
    }
    
    // Verify
    const students = await pool.query('SELECT * FROM students');
    console.log('\nTotal students now:', students.rows.length);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixStudents();
