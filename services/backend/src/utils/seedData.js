import { query } from '../config/database.js';
import logger from './logger.js';

export async function seedFeeStructures() {
  try {
    // Check if fee structures exist
    const existing = await query('SELECT COUNT(*) as count FROM fee_structure');
    
    if (parseInt(existing[0].count) === 0) {
      logger.info('Seeding fee structures...');
      
      // Valid frequency values: monthly, quarterly, half_yearly, yearly, one_time
      await query(`
        INSERT INTO fee_structure (id, name, amount, frequency, description, due_day, academic_year) VALUES
        (gen_random_uuid(), 'Tuition Fee', 50000, 'quarterly', 'Term tuition fee', 15, '2025'),
        (gen_random_uuid(), 'Activity Fee', 5000, 'quarterly', 'Sports and clubs activities', 15, '2025'),
        (gen_random_uuid(), 'Library Fee', 2000, 'yearly', 'Library access and materials', 1, '2025'),
        (gen_random_uuid(), 'Lab Fee', 3000, 'quarterly', 'Science laboratory usage', 15, '2025'),
        (gen_random_uuid(), 'Transport Fee', 10000, 'monthly', 'School bus transport', 15, '2025'),
        (gen_random_uuid(), 'Lunch Fee', 8000, 'monthly', 'School lunch program', 15, '2025'),
        (gen_random_uuid(), 'Exam Fee', 2500, 'quarterly', 'Examination and assessment fee', 15, '2025'),
        (gen_random_uuid(), 'Computer Lab Fee', 3500, 'quarterly', 'Computer and IT resources', 15, '2025'),
        (gen_random_uuid(), 'Admission Fee', 15000, 'one_time', 'One-time admission fee', 1, '2025'),
        (gen_random_uuid(), 'Uniform Fee', 5000, 'one_time', 'School uniform', 1, '2025')
      `);
      
      logger.info('Fee structures seeded successfully');
    } else {
      logger.info(`Fee structures already exist (${existing[0].count} records)`);
    }
  } catch (error) {
    logger.error('Error seeding fee structures:', error.message);
  }
}

export async function seedDefaultAdmin() {
  try {
    // Check if admin exists
    const existing = await query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
    
    if (parseInt(existing[0].count) === 0) {
      logger.info('Creating default admin user...');
      
      const bcrypt = await import('bcryptjs');
      const { v4: uuidv4 } = await import('uuid');
      
      const adminId = uuidv4();
      const hashedPassword = await bcrypt.default.hash('admin123', 10);
      
      await query(`
        INSERT INTO users (id, email, password, role, is_active, is_verified)
        VALUES ($1, 'admin@school.com', $2, 'admin', true, true)
      `, [adminId, hashedPassword]);
      
      logger.info('Default admin created: admin@school.com / admin123');
    }
  } catch (error) {
    logger.error('Error seeding admin:', error.message);
  }
}

export async function seedAcademicYears() {
  try {
    // Check if table exists first
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'academic_years'
      )
    `);
    
    if (!tableCheck[0].exists) {
      logger.info('academic_years table does not exist, skipping seed');
      return;
    }
    
    const existing = await query('SELECT COUNT(*) as count FROM academic_years');
    
    if (parseInt(existing[0].count) === 0) {
      logger.info('Seeding academic years...');
      
      const currentYear = new Date().getFullYear();
      
      // Column is 'year' not 'name'
      await query(`
        INSERT INTO academic_years (id, year, start_date, end_date, is_current) VALUES
        (gen_random_uuid(), $1, $2, $3, true),
        (gen_random_uuid(), $4, $5, $6, false)
      `, [
        String(currentYear), `${currentYear}-01-01`, `${currentYear}-12-31`,
        String(currentYear + 1), `${currentYear + 1}-01-01`, `${currentYear + 1}-12-31`
      ]);
      
      logger.info('Academic years seeded');
    }
  } catch (error) {
    logger.warn('Could not seed academic years:', error.message);
  }
}

export async function seedTerms() {
  try {
    // Check if table exists first
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'terms'
      )
    `);
    
    if (!tableCheck[0].exists) {
      logger.info('terms table does not exist, skipping seed');
      return;
    }
    
    const existing = await query('SELECT COUNT(*) as count FROM terms');
    
    if (parseInt(existing[0].count) === 0) {
      logger.info('Seeding terms...');
      
      const currentYear = new Date().getFullYear();
      
      await query(`
        INSERT INTO terms (id, name, start_date, end_date, is_current) VALUES
        (gen_random_uuid(), $1, $2, $3, false),
        (gen_random_uuid(), $4, $5, $6, false),
        (gen_random_uuid(), $7, $8, $9, true)
      `, [
        `Term 1 ${currentYear}`, `${currentYear}-01-15`, `${currentYear}-04-15`,
        `Term 2 ${currentYear}`, `${currentYear}-05-01`, `${currentYear}-08-15`,
        `Term 3 ${currentYear}`, `${currentYear}-09-01`, `${currentYear}-12-01`
      ]);
      
      logger.info('Terms seeded');
    }
  } catch (error) {
    logger.warn('Could not seed terms:', error.message);
  }
}

export async function runAllSeeds() {
  logger.info('Running database seeds...');
  
  await seedDefaultAdmin();
  await seedFeeStructures();
  await seedAcademicYears();
  await seedTerms();
  
  logger.info('Database seeding complete');
}

export default runAllSeeds;
