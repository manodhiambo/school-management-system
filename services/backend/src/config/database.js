import mysql from 'mysql2/promise';
import { config } from './env.js';
import logger from '../utils/logger.js';

let pool = null;

export const createDatabasePool = () => {
  // Support DATABASE_URL format or individual config
  const dbConfig = config.databaseUrl
    ? {
        uri: config.databaseUrl,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      }
    : {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.name,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      };

  // If using DATABASE_URL, parse it
  if (config.databaseUrl) {
    try {
      const url = new URL(config.databaseUrl);
      pool = mysql.createPool({
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        ssl: config.env === 'production' ? { rejectUnauthorized: true } : undefined
      });
    } catch (error) {
      logger.error('Failed to parse DATABASE_URL:', error);
      throw error;
    }
  } else {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.name,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
  }

  logger.info('Database pool created');
  return pool;
};

export const getPool = () => {
  if (!pool) {
    createDatabasePool();
  }
  return pool;
};

export const query = async (sql, params = []) => {
  const connection = getPool();
  try {
    const [results] = await connection.execute(sql, params);
    return results;
  } catch (error) {
    logger.error('Database query error:', { sql, error: error.message });
    throw error;
  }
};

export const testConnection = async () => {
  try {
    const connection = getPool();
    await connection.execute('SELECT 1');
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
};

export default { createDatabasePool, getPool, query, testConnection };
