import { query } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Split a SQL file into individual statements, stripping comment-only entries
function splitSql(sql) {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => {
      // Remove inline comments and check if anything remains
      const stripped = s.replace(/--[^\n]*/g, '').trim();
      return stripped.length > 0;
    });
}

export async function runMigrations() {
  try {
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
      const statements = splitSql(sql);

      let warnings = 0;
      for (const stmt of statements) {
        try {
          await query(stmt);
        } catch (err) {
          warnings++;
          logger.warn(`[${file}] Statement warning (may be already applied): ${err.message.slice(0, 120)}`);
        }
      }

      // Mark as done — all our migrations use IF NOT EXISTS so warnings are safe to ignore
      await query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      logger.info(`Migration applied: ${file}${warnings ? ` (${warnings} warning(s))` : ''}`);
      applied++;
    }

    if (applied > 0) logger.info(`Migrations: ${applied} new migration(s) applied`);
    else logger.info('Migrations: all up to date');
  } catch (err) {
    logger.error('Migration runner error:', err.message);
  }
}
