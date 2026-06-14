import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const INSECURE_JWT_DEFAULT = 'your-super-secret-jwt-key-change-in-production';
const INSECURE_REFRESH_DEFAULT = 'your-refresh-secret-key-change-in-production';

const jwtSecret = process.env.JWT_SECRET || INSECURE_JWT_DEFAULT;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || INSECURE_REFRESH_DEFAULT;

const nodeEnv = process.env.NODE_ENV || 'development';

if (nodeEnv === 'production') {
  if (jwtSecret === INSECURE_JWT_DEFAULT || jwtRefreshSecret === INSECURE_REFRESH_DEFAULT) {
    console.error('FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in production. Exiting.');
    process.exit(1);
  }
  if (jwtSecret.length < 32 || jwtRefreshSecret.length < 32) {
    console.error('FATAL: JWT secrets must be at least 32 characters in production. Exiting.');
    process.exit(1);
  }
}

export const config = {
  env: nodeEnv,
  port: parseInt(process.env.PORT, 10) || 5000,
  apiVersion: process.env.API_VERSION || 'v1',

  // Database - support both DATABASE_URL and individual config
  databaseUrl: process.env.DATABASE_URL || null,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'school_management'
  },

  // JWT
  jwt: {
    secret: jwtSecret,
    refreshSecret: jwtRefreshSecret,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '8h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  // Redis (optional)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || ''
  },
  
  // Email
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@school.com'
  },
  
  // M-Pesa
  mpesa: {
    env: process.env.MPESA_ENV || 'sandbox',
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    passkey: process.env.MPESA_PASSKEY || '',
    shortcode: process.env.MPESA_SHORTCODE || '',
    callbackUrl: process.env.MPESA_CALLBACK_URL || ''
  },
  
  // File uploads
  uploads: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(',')
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
};

export default config;
