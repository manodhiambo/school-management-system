import mysql from 'mysql2/promise';
import { config } from './env.js';
import logger from '../utils/logger.js';

let pool = null;

export const createDatabasePool = () => {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    timezone: '+00:00'
  });

  logger.info('Database pool created');
  return pool;
};

export const getConnection = async () => {
  if (!pool) {
    pool = createDatabasePool();
  }
  return await pool.getConnection();
};

export const query = async (sql, params) => {
  if (!pool) {
    pool = createDatabasePool();
  }
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
};

export const testConnection = async () => {
  try {
    if (!pool) {
      pool = createDatabasePool();
    }
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
};

export default {
  createDatabasePool,
  getConnection,
  query,
  testConnection
};
