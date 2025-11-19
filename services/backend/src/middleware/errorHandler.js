import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';
import { config } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  if (!(err instanceof ApiError)) {
    statusCode = err.statusCode || 500;
    message = err.message || 'Internal Server Error';
  }

  const response = {
    success: false,
    statusCode,
    message,
    ...(config.env === 'development' && { stack: err.stack })
  };

  logger.error(`Error: ${message}`, { statusCode, stack: err.stack });

  res.status(statusCode).json(response);
};

export const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
};

export default { errorHandler, notFound };
