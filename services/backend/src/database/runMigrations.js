import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Neon: DDL must go through the DIRECT endpoint, not the PgBouncer pooler.
// The pooler URL contains "-pooler" in the hostname — strip it for migrations.
function buildDirectUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return raw.replace('-pooler', '');
}

function splitSql(sql) {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.replace(/--[^\n]*/g, '').trim().length > 0);
}

export async function runMigrations() {
  // Open a DIRECT (non-pooler) connection specifically for DDL
  const directPool = new Pool({
    connectionString: buildDirectUrl(),
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 10000,
  });

  const exec = async (text, params) => {
    const r = await directPool.query(text, params);
    return r.rows;
  };

  try {
    await exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id     SERIAL PRIMARY KEY,
        name   VARCHAR(255) NOT NULL UNIQUE,
        run_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let applied = 0;
    for (const file of files) {
      const already = await exec('SELECT id FROM schema_migrations WHERE name = $1', [file]);
      if (already.length) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const statements = splitSql(sql);

      let warnings = 0;
      for (const stmt of statements) {
        try {
          await exec(stmt);
        } catch (err) {
          warnings++;
          logger.warn(`[${file}] skipped statement: ${err.message.slice(0, 120)}`);
        }
      }

      await exec('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      logger.info(`Migration applied: ${file}${warnings ? ` (${warnings} warnings)` : ''}`);
      applied++;
    }

    if (applied > 0) logger.info(`Migrations: ${applied} applied`);
    else logger.info('Migrations: all up to date');
  } catch (err) {
    logger.error('Migration runner error:', err.message);
  } finally {
    await directPool.end().catch(() => {});
  }
}
