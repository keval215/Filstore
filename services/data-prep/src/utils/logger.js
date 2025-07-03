import winston from 'winston';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = process.env.LOGS_DIR || '/app/data/logs';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'data-prep',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          let msg = `${timestamp} [${service}] ${level}: ${message}`;
          
          // Add metadata if present
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          if (metaStr) {
            msg += `\n${metaStr}`;
          }
          
          return msg;
        })
      )
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'data-prep.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'data-prep-error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'data-prep-exceptions.log'),
      maxsize: 5242880,
      maxFiles: 3
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'data-prep-rejections.log'),
      maxsize: 5242880,
      maxFiles: 3
    })
  ]
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Helper methods for structured logging
logger.logFileOperation = (operation, filePath, metadata = {}) => {
  logger.info(`File ${operation}`, {
    operation,
    filePath,
    ...metadata
  });
};

logger.logCAROperation = (operation, carPath, cid, metadata = {}) => {
  logger.info(`CAR ${operation}`, {
    operation,
    carPath,
    cid,
    ...metadata
  });
};

logger.logProcessingStats = (stats) => {
  logger.info('Processing statistics', stats);
};

logger.logError = (operation, error, metadata = {}) => {
  logger.error(`Error in ${operation}`, {
    operation,
    error: error.message,
    stack: error.stack,
    ...metadata
  });
};

export { logger };
