import { query } from '../config/database.js';
import logger from './logger.js';

export async function ensureTablesExist() {
  try {
    // Create terms table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS terms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        start_date DATE,
        end_date DATE,
        is_current BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create academic_years table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS academic_years (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        start_date DATE,
        end_date DATE,
        is_current BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create fee_structure table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS fee_structure (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        frequency VARCHAR(50) DEFAULT 'term',
        description TEXT,
        due_day INTEGER DEFAULT 15,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure assignments tables exist
    await query(`
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

    await query(`
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

    // Add phone column to students if not exists
    try {
      await query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);
    } catch (e) {
      // Column might already exist
    }

    // Add student_id to fee_payments if not exists
    try {
      await query(`ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id)`);
    } catch (e) {
      // Column might already exist
    }

    logger.info('All required tables ensured');
  } catch (error) {
    logger.error('Error ensuring tables:', error.message);
  }
}

export default ensureTablesExist;
