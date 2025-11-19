import { query } from '../config/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const seedDatabase = async () => {
  try {
    logger.info('Starting database seeding...');

    // Seed admin user
    const adminId = uuidv4();
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await query(
      `INSERT INTO users (id, email, password_hash, role, is_active, mfa_enabled) 
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE email = email`,
      [adminId, 'admin@school.com', hashedPassword, 'admin', true, false]
    );
    logger.info('Admin user seeded');

    // Seed attendance sessions
    const morningSessionId = uuidv4();
    const afternoonSessionId = uuidv4();
    
    await query(
      `INSERT INTO attendance_sessions (id, name, start_time, end_time, is_active)
       VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = name`,
      [
        morningSessionId, 'Morning', '09:00:00', '12:00:00', true,
        afternoonSessionId, 'Afternoon', '13:00:00', '16:00:00', true
      ]
    );
    logger.info('Attendance sessions seeded');

    // Seed periods
    const periods = [
      { id: uuidv4(), name: '1st Period', number: 1, start: '09:00:00', end: '09:45:00', isBreak: false },
      { id: uuidv4(), name: '2nd Period', number: 2, start: '09:45:00', end: '10:30:00', isBreak: false },
      { id: uuidv4(), name: 'Break', number: 3, start: '10:30:00', end: '10:50:00', isBreak: true },
      { id: uuidv4(), name: '3rd Period', number: 4, start: '10:50:00', end: '11:35:00', isBreak: false },
      { id: uuidv4(), name: '4th Period', number: 5, start: '11:35:00', end: '12:20:00', isBreak: false },
      { id: uuidv4(), name: 'Lunch Break', number: 6, start: '12:20:00', end: '13:00:00', isBreak: true },
      { id: uuidv4(), name: '5th Period', number: 7, start: '13:00:00', end: '13:45:00', isBreak: false },
      { id: uuidv4(), name: '6th Period', number: 8, start: '13:45:00', end: '14:30:00', isBreak: false }
    ];

    for (const period of periods) {
      await query(
        `INSERT INTO periods (id, name, period_number, start_time, end_time, is_break, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = name`,
        [period.id, period.name, period.number, period.start, period.end, period.isBreak, true]
      );
    }
    logger.info('Periods seeded');

    // Seed departments
    const departments = [
      { id: uuidv4(), name: 'Science', code: 'SCI' },
      { id: uuidv4(), name: 'Mathematics', code: 'MATH' },
      { id: uuidv4(), name: 'English', code: 'ENG' },
      { id: uuidv4(), name: 'Social Studies', code: 'SS' },
      { id: uuidv4(), name: 'Physical Education', code: 'PE' }
    ];

    for (const dept of departments) {
      await query(
        `INSERT INTO departments (id, name, code, is_active)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = name`,
        [dept.id, dept.name, dept.code, true]
      );
    }
    logger.info('Departments seeded');

    // Seed subjects
    const subjects = [
      { id: uuidv4(), name: 'Mathematics', code: 'MATH01', category: 'core' },
      { id: uuidv4(), name: 'English', code: 'ENG01', category: 'core' },
      { id: uuidv4(), name: 'Science', code: 'SCI01', category: 'core' },
      { id: uuidv4(), name: 'Social Studies', code: 'SS01', category: 'core' },
      { id: uuidv4(), name: 'Computer Science', code: 'CS01', category: 'elective' },
      { id: uuidv4(), name: 'Physical Education', code: 'PE01', category: 'co_curricular' }
    ];

    for (const subject of subjects) {
      await query(
        `INSERT INTO subjects (id, name, code, category, is_active)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = name`,
        [subject.id, subject.name, subject.code, subject.category, true]
      );
    }
    logger.info('Subjects seeded');

    // Seed academic year
    const academicYearId = uuidv4();
    await query(
      `INSERT INTO academic_years (id, year, start_date, end_date, is_current, is_active)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE year = year`,
      [academicYearId, '2024-2025', '2024-04-01', '2025-03-31', true, true]
    );
    logger.info('Academic year seeded');

    // Seed school settings
    const settingsId = uuidv4();
    await query(
      `INSERT INTO settings (id, school_name, school_code, current_academic_year, phone, email)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE school_name = school_name`,
      [settingsId, 'Demo School', 'DEMO001', '2024-2025', '1234567890', 'info@demoschool.com']
    );
    logger.info('School settings seeded');

    // Seed fee discounts
    const discounts = [
      { id: uuidv4(), name: 'Sibling Discount', type: 'percentage', value: 10 },
      { id: uuidv4(), name: 'Scholarship', type: 'percentage', value: 50 },
      { id: uuidv4(), name: 'Staff Child', type: 'percentage', value: 25 }
    ];

    for (const discount of discounts) {
      await query(
        `INSERT INTO fee_discounts (id, name, type, value, is_active)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = name`,
        [discount.id, discount.name, discount.type, discount.value, true]
      );
    }
    logger.info('Fee discounts seeded');

    logger.info('Database seeding completed successfully!');
  } catch (error) {
    logger.error('Seeding error:', error);
    throw error;
  }
};

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seedDatabase;
