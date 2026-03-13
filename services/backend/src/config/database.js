import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const rawUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_eO1vxZ6fhqtU@ep-empty-bush-afudt9bn-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';
const connectionString = rawUrl
  .replace('sslmode=require', 'sslmode=verify-full')
  .replace('sslmode=prefer', 'sslmode=verify-full')
  .replace('sslmode=verify-ca', 'sslmode=verify-full');

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  statement_timeout: 15000,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
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
