import winston from 'winston';
import { config } from '../config/env.js';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(logColors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
);

// File transports write to a local `logs/` dir — Vercel's filesystem is
// read-only outside /tmp, so creating them there crashes the whole function
// at import time. Vercel's own platform already captures stdout/stderr from
// the Console transport into its Logs view, so file logging is both
// impossible and redundant there.
const transports = [
  new winston.transports.Console(),
  ...(process.env.VERCEL ? [] : [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ]),
];

const logger = winston.createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  levels: logLevels,
  format,
  transports
});

export default logger;
