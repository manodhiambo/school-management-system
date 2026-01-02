import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://REDACTED:REDACTED@REDACTED/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
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
