import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

async function seed() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Get students
    const students = await pool.query('SELECT id, first_name, last_name FROM students');
    console.log('Students:', students.rows.length);

    // Get subjects
    const subjects = await pool.query('SELECT id, name FROM subjects');
    console.log('Subjects:', subjects.rows.length);

    // Get or create a proper exam
    let exam = await pool.query("SELECT id FROM exams WHERE name = 'Mid-Term Exam 2025'");
    
    if (exam.rows.length === 0) {
      const examId = uuidv4();
      await pool.query(`
        INSERT INTO exams (id, name, exam_type, academic_year, term, start_date, end_date, is_active)
        VALUES ($1, 'Mid-Term Exam 2025', 'term', '2025', 'Term 1', '2025-03-01', '2025-03-15', true)
      `, [examId]);
      exam = { rows: [{ id: examId }] };
      console.log('Created exam:', examId);
    }

    const examId = exam.rows[0].id;

    // Create exam results for each student and subject
    let resultsCreated = 0;
    
    for (const student of students.rows) {
      for (const subject of subjects.rows) {
        // Check if result already exists
        const existing = await pool.query(
          'SELECT id FROM exam_results WHERE exam_id = $1 AND student_id = $2 AND subject_id = $3',
          [examId, student.id, subject.id]
        );
        
        if (existing.rows.length === 0) {
          const resultId = uuidv4();
          const maxMarks = 100;
          const marksObtained = Math.floor(Math.random() * 40) + 55; // Random score between 55-95
          
          let grade;
          if (marksObtained >= 80) grade = 'A';
          else if (marksObtained >= 70) grade = 'B';
          else if (marksObtained >= 60) grade = 'C';
          else if (marksObtained >= 50) grade = 'D';
          else grade = 'F';
          
          await pool.query(`
            INSERT INTO exam_results (id, exam_id, student_id, subject_id, marks_obtained, max_marks, grade)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [resultId, examId, student.id, subject.id, marksObtained, maxMarks, grade]);
          
          resultsCreated++;
          console.log(`  ${student.first_name}: ${subject.name} - ${marksObtained}/${maxMarks} (${grade})`);
        }
      }
    }
    
    console.log(`\nCreated ${resultsCreated} exam results`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

seed();
