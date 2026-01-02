import pool from './src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Starting finance module migrations...');

    // Track completed migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrations = [
      '014_create_finance_module.sql',
      '015_migrate_fee_payments_to_finance.sql',
      '016_add_finance_officer_role.sql'
    ];

    for (const migration of migrations) {
      // Check if migration already ran
      const checkResult = await client.query(
        'SELECT 1 FROM migration_history WHERE migration_name = $1',
        [migration]
      );

      if (checkResult.rows.length > 0) {
        console.log(`⊘ Skipping already completed: ${migration}`);
        continue;
      }

      const migrationPath = path.join(__dirname, 'src', 'database', 'migrations', migration);
      if (fs.existsSync(migrationPath)) {
        console.log(`Running migration: ${migration}`);
        const sql = fs.readFileSync(migrationPath, 'utf8');
        await client.query(sql);
        
        // Mark as completed
        await client.query(
          'INSERT INTO migration_history (migration_name) VALUES ($1)',
          [migration]
        );
        
        console.log(`✓ Completed: ${migration}`);
      } else {
        console.log(`⚠ Migration file not found: ${migration}`);
      }
    }

    console.log('\nAll finance migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations()
  .then(() => {
    console.log('\nFinance module setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to run migrations:', error);
    process.exit(1);
  });
