import pg from 'pg';
import { config } from './env.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

let pool = null;

export const createDatabasePool = () => {
  if (pool) return pool;

  // Use DATABASE_URL if available, otherwise build from individual config
  const connectionConfig = config.databaseUrl
    ? {
        connectionString: config.databaseUrl,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.name,
        ssl: config.env === 'production' ? { rejectUnauthorized: false } : false
      };

  pool = new Pool({
    ...connectionConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    logger.error('Unexpected database pool error:', err);
  });

  logger.info('Database pool created');
  return pool;
};

export const getPool = () => {
  if (!pool) {
    createDatabasePool();
  }
  return pool;
};

// Query function compatible with MySQL-style placeholders (?)
// Converts ? to $1, $2, etc. for PostgreSQL
export const query = async (sql, params = []) => {
  const connection = getPool();
  
  // Convert MySQL-style ? placeholders to PostgreSQL $1, $2, etc.
  let paramIndex = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
  
  try {
    const result = await connection.query(pgSql, params);
    return result.rows;
  } catch (error) {
    logger.error('Database query error:', { sql: pgSql, error: error.message });
    throw error;
  }
};

export const testConnection = async () => {
  try {
    const connection = getPool();
    await connection.query('SELECT 1');
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
};

// Get a client for transactions
export const getClient = async () => {
  const connection = getPool();
  return await connection.connect();
};

export default { createDatabasePool, getPool, query, testConnection, getClient };
