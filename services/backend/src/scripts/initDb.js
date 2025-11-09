const prisma = require('../models/index');
const logger = require('../utils/logger');
const { hashPassword } = require('../services/password.service');

async function initializeDatabase() {
  try {
    logger.info('Starting database initialization...');

    // Create tables (Prisma does this automatically on first run)
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0;`;
    
    logger.info('Database tables created successfully');

    // Create default admin user if no users exist
    const userCount = await prisma.users.count();
    
    if (userCount === 0) {
      logger.info('Creating default admin user...');
      
      const hashedPassword = await hashPassword('admin123');
      
      await prisma.users.create({
        data: {
          email: 'admin@school.com',
          password_hash: hashedPassword,
          role: 'admin',
          is_active: true
        }
      });

      logger.info('Default admin user created: admin@school.com / admin123');
      logger.warn('Please change the default password after first login!');
    }

    // Create default periods
    const periodCount = await prisma.periods.count();
    if (periodCount === 0) {
      logger.info('Creating default periods...');
      
      const defaultPeriods = [
        { name: '1st Period', start_time: new Date('1970-01-01T09:00:00Z'), end_time: new Date('1970-01-01T09:45:00Z') },
        { name: '2nd Period', start_time: new Date('1970-01-01T09:45:00Z'), end_time: new Date('1970-01-01T10:30:00Z') },
        { name: 'Short Break', start_time: new Date('1970-01-01T10:30:00Z'), end_time: new Date('1970-01-01T10:45:00Z'), is_break: true },
        { name: '3rd Period', start_time: new Date('1970-01-01T10:45:00Z'), end_time: new Date('1970-01-01T11:30:00Z') },
        { name: '4th Period', start_time: new Date('1970-01-01T11:30:00Z'), end_time: new Date('1970-01-01T12:15:00Z') },
        { name: 'Lunch Break', start_time: new Date('1970-01-01T12:15:00Z'), end_time: new Date('1970-01-01T13:00:00Z'), is_break: true },
        { name: '5th Period', start_time: new Date('1970-01-01T13:00:00Z'), end_time: new Date('1970-01-01T13:45:00Z') },
        { name: '6th Period', start_time: new Date('1970-01-01T13:45:00Z'), end_time: new Date('1970-01-01T14:30:00Z') },
        { name: '7th Period', start_time: new Date('1970-01-01T14:30:00Z'), end_time: new Date('1970-01-01T15:15:00Z') }
      ];

      for (const period of defaultPeriods) {
        await prisma.periods.create({ data: period });
      }

      logger.info('Default periods created');
    }

    // Create default settings
    const settingsCount = await prisma.settings.count();
    if (settingsCount === 0) {
      logger.info('Creating default settings...');
      
      await prisma.settings.create({
        data: {
          school_name: 'School Management System',
          timezone: 'Asia/Kolkata',
          attendance_method: 'all',
          fee_late_fee_applicable: true
        }
      });

      logger.info('Default settings created');
    }

    logger.info('Database initialization completed successfully!');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
