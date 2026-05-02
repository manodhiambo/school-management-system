import { query } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  try {
    // Create migrations tracking table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id        SERIAL PRIMARY KEY,
        name      VARCHAR(255) NOT NULL UNIQUE,
        run_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let applied = 0;
    for (const file of files) {
      const already = await query(
        'SELECT id FROM schema_migrations WHERE name = $1',
        [file]
      );
      if (already.length) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      try {
        await query(sql);
        await query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        logger.info(`Migration applied: ${file}`);
        applied++;
      } catch (err) {
        // Log but don't crash — some migrations are idempotent and safe to skip
        logger.warn(`Migration ${file} skipped (may already be applied): ${err.message}`);
      }
    }

    if (applied > 0) logger.info(`Migrations: ${applied} new migration(s) applied`);
    else logger.info('Migrations: all up to date');
  } catch (err) {
    logger.error('Migration runner error:', err.message);
  }
}
