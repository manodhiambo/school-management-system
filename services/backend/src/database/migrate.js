import { getConnection } from '../config/database.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigrations = async () => {
  const connection = await getConnection();
  
  try {
    // Create migrations table if not exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (!file.endsWith('.sql')) continue;

      const migrationName = file.replace('.sql', '');
      
      // Check if migration already executed
      const [rows] = await connection.query(
        'SELECT * FROM migrations WHERE name = ?',
        [migrationName]
      );

      if (rows.length > 0) {
        logger.info(`Migration ${migrationName} already executed, skipping...`);
        continue;
      }

      // Read and execute migration
      const migrationSQL = fs.readFileSync(
        path.join(migrationsDir, file),
        'utf8'
      );

      logger.info(`Executing migration: ${migrationName}`);
      
      // Split by semicolon and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        await connection.query(statement);
      }

      // Record migration
      await connection.query(
        'INSERT INTO migrations (name) VALUES (?)',
        [migrationName]
      );

      logger.info(`Migration ${migrationName} executed successfully`);
    }

    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default runMigrations;
