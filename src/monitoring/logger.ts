import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

export function createLogger(logPath?: string): winston.Logger {
  const logDir = logPath || '.cco/logs';
  
  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'cco' },
    transports: [
      // Write all logs to combined.log
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 10485760, // 10MB
        maxFiles: 5
      }),
      // Write errors to error.log
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 10485760,
        maxFiles: 5
      })
    ]
  });

  // Add console transport in development
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  }

  return logger;
}

export function createSessionLogger(sessionId: string, logPath?: string): winston.Logger {
  const logDir = path.join(logPath || '.cco/logs', 'sessions');
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'debug',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'cco', sessionId },
    transports: [
      new winston.transports.File({
        filename: path.join(logDir, `${sessionId}.log`),
        maxsize: 10485760,
        maxFiles: 3
      })
    ]
  });
}