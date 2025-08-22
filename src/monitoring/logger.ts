import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';

export enum LogContext {
  ORCHESTRATION = 'orchestration',
  CLAUDE_CODE = 'claude-code',
  OPENROUTER = 'openrouter',
  SESSION = 'session',
  MISSION = 'mission',
  GITHUB = 'github',
  ERROR = 'error',
  PERFORMANCE = 'performance',
  TOKEN = 'token',
  CLI = 'cli'
}

export interface LogMetadata {
  context?: LogContext;
  sessionId?: string;
  missionId?: string;
  phase?: string;
  iteration?: number;
  tokenUsage?: {
    prompt?: number;
    completion?: number;
    total?: number;
    cost?: number;
  };
  duration?: number;
  error?: any;
  [key: string]: any;
}

/**
 * Custom format for pretty console output
 */
const prettyConsoleFormat = winston.format.printf((info: any) => {
  const { level: _level, message, timestamp, context, ...metadata } = info;
  const time = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
  const contextStr = context ? chalk.cyan(`[${context}]`) : '';
  
  let output = `${chalk.gray(time)} ${contextStr} ${message}`;
  
  // Add metadata if present
  if (metadata.tokenUsage) {
    output += chalk.gray(` (tokens: ${metadata.tokenUsage.total || 0}, cost: $${metadata.tokenUsage.cost?.toFixed(4) || '0'})`);
  }
  if (metadata.duration) {
    output += chalk.gray(` (${metadata.duration}ms)`);
  }
  
  return output;
});

/**
 * Custom format for structured file output
 */
const structuredFileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export function createLogger(logPath?: string): winston.Logger {
  const logDir = logPath || '.cco/logs';
  
  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logLevel = process.env.LOG_LEVEL || 'info';
  const isProduction = process.env.NODE_ENV === 'production';
  const isDebug = process.env.DEBUG === 'true' || logLevel === 'debug';
  
  const logger = winston.createLogger({
    level: logLevel,
    format: structuredFileFormat,
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

  // Add console transport with pretty formatting
  if (!isProduction || process.env.FORCE_CONSOLE_LOG === 'true') {
    logger.add(new winston.transports.Console({
      level: isDebug ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.colorize({ level: true }),
        winston.format.timestamp(),
        prettyConsoleFormat
      )
    }));
  }
  
  // Add performance log transport
  if (process.env.ENABLE_PERF_LOGS === 'true') {
    logger.add(new winston.transports.File({
      filename: path.join(logDir, 'performance.log'),
      level: 'info',
      format: structuredFileFormat,
      maxsize: 10485760,
      maxFiles: 3
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
    format: structuredFileFormat,
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

/**
 * Enhanced logger wrapper with context and structured logging
 */
export class EnhancedLogger {
  private logger: winston.Logger;
  private defaultMetadata: LogMetadata = {};
  
  // Expose underlying winston logger for compatibility
  get winstonLogger(): winston.Logger {
    return this.logger;
  }
  
  constructor(logger: winston.Logger, defaultMetadata?: LogMetadata) {
    this.logger = logger;
    if (defaultMetadata) {
      this.defaultMetadata = defaultMetadata;
    }
  }
  
  private mergeMetadata(metadata?: LogMetadata): LogMetadata {
    return { ...this.defaultMetadata, ...metadata };
  }
  
  // Context-aware logging methods
  orchestration(message: string, metadata?: LogMetadata): void {
    this.logger.info(message, this.mergeMetadata({ context: LogContext.ORCHESTRATION, ...metadata }));
  }
  
  claudeCode(message: string, metadata?: LogMetadata): void {
    this.logger.info(message, this.mergeMetadata({ context: LogContext.CLAUDE_CODE, ...metadata }));
  }
  
  openRouter(message: string, metadata?: LogMetadata): void {
    this.logger.info(message, this.mergeMetadata({ context: LogContext.OPENROUTER, ...metadata }));
  }
  
  github(message: string, metadata?: LogMetadata): void {
    this.logger.info(message, this.mergeMetadata({ context: LogContext.GITHUB, ...metadata }));
  }
  
  performance(message: string, duration: number, metadata?: LogMetadata): void {
    this.logger.info(message, this.mergeMetadata({ 
      context: LogContext.PERFORMANCE, 
      duration,
      ...metadata 
    }));
  }
  
  tokenUsage(message: string, usage: LogMetadata['tokenUsage'], metadata?: LogMetadata): void {
    this.logger.info(message, this.mergeMetadata({ 
      context: LogContext.TOKEN,
      tokenUsage: usage,
      ...metadata 
    }));
  }
  
  // Standard logging methods
  debug(message: string, metadata?: LogMetadata): void {
    this.logger.debug(message, this.mergeMetadata(metadata));
  }
  
  info(message: string, metadata?: LogMetadata): void {
    this.logger.info(message, this.mergeMetadata(metadata));
  }
  
  warn(message: string, metadata?: LogMetadata): void {
    this.logger.warn(message, this.mergeMetadata(metadata));
  }
  
  error(message: string, error?: any, metadata?: LogMetadata): void {
    this.logger.error(message, this.mergeMetadata({ 
      context: LogContext.ERROR,
      error: error?.stack || error?.message || error,
      ...metadata 
    }));
  }
  
  // Utility methods
  startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }
  
  child(metadata: LogMetadata): EnhancedLogger {
    return new EnhancedLogger(this.logger, this.mergeMetadata(metadata));
  }
}

/**
 * Create an enhanced logger instance
 */
export function createEnhancedLogger(logPath?: string, defaultMetadata?: LogMetadata): EnhancedLogger {
  const baseLogger = createLogger(logPath);
  return new EnhancedLogger(baseLogger, defaultMetadata);
}

/**
 * Log rotation utility
 */
export function setupLogRotation(logDir: string = '.cco/logs'): void {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  setInterval(() => {
    if (!fs.existsSync(logDir)) return;
    
    const files = fs.readdirSync(logDir);
    const now = Date.now();
    
    files.forEach(file => {
      const filePath = path.join(logDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
      }
    });
  }, 24 * 60 * 60 * 1000); // Check daily
}

/**
 * Export log aggregator for analysis
 */
export async function aggregateLogs(sessionId?: string, logPath?: string): Promise<any[]> {
  const logDir = logPath || '.cco/logs';
  const logs: any[] = [];
  
  const readLogFile = (filePath: string): void => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      try {
        const log = JSON.parse(line);
        if (!sessionId || log.sessionId === sessionId) {
          logs.push(log);
        }
      } catch (e) {
        // Skip malformed lines
      }
    });
  };
  
  if (sessionId) {
    const sessionLogPath = path.join(logDir, 'sessions', `${sessionId}.log`);
    if (fs.existsSync(sessionLogPath)) {
      readLogFile(sessionLogPath);
    }
  } else {
    const combinedLogPath = path.join(logDir, 'combined.log');
    if (fs.existsSync(combinedLogPath)) {
      readLogFile(combinedLogPath);
    }
  }
  
  return logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}