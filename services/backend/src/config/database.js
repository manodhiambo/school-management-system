import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is not set. Exiting.');
  process.exit(1);
}

const rawUrl = process.env.DATABASE_URL;
const connectionString = rawUrl
  .replace('sslmode=require', 'sslmode=require')
  .replace('sslmode=prefer', 'sslmode=require')
  .replace('sslmode=disable', 'sslmode=require');

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: true
  },
  max: 10,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  statement_timeout: 15000,
});

pool.on('connect', (client) => {
  console.log('Connected to PostgreSQL database');
  // Pin every connection to the public schema. Some connections to this
  // database default search_path to a stale tenant_* schema (a leftover
  // from an abandoned schema-per-tenant approach) which shadows newer
  // columns/tables that only exist in public, causing silent query failures.
  //
  // This is dispatched synchronously here (not awaited) so it queues ahead
  // of whatever query the caller who requested this connection issues next
  // on the same client — node-postgres guarantees FIFO execution order per
  // client, so the search_path is always set before any other query runs.
  // (Setting this via Pool's `options` startup parameter instead would avoid
  // relying on that ordering, but Neon's pooled/PgBouncer endpoint rejects
  // startup-packet options outright — confirmed by testing against it.)
  client.query('SET search_path TO public').catch((err) => {
    console.error('Failed to set search_path:', err.message);
  });
});

pool.on('error', (err) => {
  // Log but don't crash the server on transient connection errors
  console.error('Unexpected database error:', err);
});

// Export a query function that wraps pool.query and returns rows
export const query = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows;
};

// Test database connection
export const testConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
};

// Also export the pool as default for backward compatibility
export default pool;
