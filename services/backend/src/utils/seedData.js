import { query } from '../config/database.js';
import logger from './logger.js';

// Fee structures should be created by school admins, not auto-seeded
// This function is kept for reference but not called automatically
export async function seedFeeStructures() {
  // Do nothing - schools should create their own fee structures
  logger.info('Fee structures should be created by school admins via the app');
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
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'academic_years'
      )
    `);
    
    if (!tableCheck[0].exists) {
      return;
    }
    
    const existing = await query('SELECT COUNT(*) as count FROM academic_years');
    
    if (parseInt(existing[0].count) === 0) {
      logger.info('Seeding academic years...');
      
      const currentYear = new Date().getFullYear();
      
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
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'terms'
      )
    `);
    
    if (!tableCheck[0].exists) {
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
  await seedAcademicYears();
  await seedTerms();
  // Fee structures are NOT auto-seeded - schools create their own
  
  logger.info('Database seeding complete');
}

export default runAllSeeds;
