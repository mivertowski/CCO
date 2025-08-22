"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedLogger = exports.LogContext = void 0;
exports.createLogger = createLogger;
exports.createSessionLogger = createSessionLogger;
exports.createEnhancedLogger = createEnhancedLogger;
exports.setupLogRotation = setupLogRotation;
exports.aggregateLogs = aggregateLogs;
const winston_1 = __importDefault(require("winston"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
var LogContext;
(function (LogContext) {
    LogContext["ORCHESTRATION"] = "orchestration";
    LogContext["CLAUDE_CODE"] = "claude-code";
    LogContext["OPENROUTER"] = "openrouter";
    LogContext["SESSION"] = "session";
    LogContext["MISSION"] = "mission";
    LogContext["GITHUB"] = "github";
    LogContext["ERROR"] = "error";
    LogContext["PERFORMANCE"] = "performance";
    LogContext["TOKEN"] = "token";
    LogContext["CLI"] = "cli";
})(LogContext || (exports.LogContext = LogContext = {}));
/**
 * Custom format for pretty console output
 */
const prettyConsoleFormat = winston_1.default.format.printf((info) => {
    const { level: _level, message, timestamp, context, ...metadata } = info;
    const time = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
    const contextStr = context ? chalk_1.default.cyan(`[${context}]`) : '';
    let output = `${chalk_1.default.gray(time)} ${contextStr} ${message}`;
    // Add metadata if present
    if (metadata.tokenUsage) {
        output += chalk_1.default.gray(` (tokens: ${metadata.tokenUsage.total || 0}, cost: $${metadata.tokenUsage.cost?.toFixed(4) || '0'})`);
    }
    if (metadata.duration) {
        output += chalk_1.default.gray(` (${metadata.duration}ms)`);
    }
    return output;
});
/**
 * Custom format for structured file output
 */
const structuredFileFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
function createLogger(logPath) {
    const logDir = logPath || '.cco/logs';
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    const logLevel = process.env.LOG_LEVEL || 'info';
    const isProduction = process.env.NODE_ENV === 'production';
    const isDebug = process.env.DEBUG === 'true' || logLevel === 'debug';
    const logger = winston_1.default.createLogger({
        level: logLevel,
        format: structuredFileFormat,
        defaultMeta: { service: 'cco' },
        transports: [
            // Write all logs to combined.log
            new winston_1.default.transports.File({
                filename: path.join(logDir, 'combined.log'),
                maxsize: 10485760, // 10MB
                maxFiles: 5
            }),
            // Write errors to error.log
            new winston_1.default.transports.File({
                filename: path.join(logDir, 'error.log'),
                level: 'error',
                maxsize: 10485760,
                maxFiles: 5
            })
        ]
    });
    // Add console transport with pretty formatting
    if (!isProduction || process.env.FORCE_CONSOLE_LOG === 'true') {
        logger.add(new winston_1.default.transports.Console({
            level: isDebug ? 'debug' : 'info',
            format: winston_1.default.format.combine(winston_1.default.format.colorize({ level: true }), winston_1.default.format.timestamp(), prettyConsoleFormat)
        }));
    }
    // Add performance log transport
    if (process.env.ENABLE_PERF_LOGS === 'true') {
        logger.add(new winston_1.default.transports.File({
            filename: path.join(logDir, 'performance.log'),
            level: 'info',
            format: structuredFileFormat,
            maxsize: 10485760,
            maxFiles: 3
        }));
    }
    return logger;
}
function createSessionLogger(sessionId, logPath) {
    const logDir = path.join(logPath || '.cco/logs', 'sessions');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    return winston_1.default.createLogger({
        level: process.env.LOG_LEVEL || 'debug',
        format: structuredFileFormat,
        defaultMeta: { service: 'cco', sessionId },
        transports: [
            new winston_1.default.transports.File({
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
class EnhancedLogger {
    logger;
    defaultMetadata = {};
    // Expose underlying winston logger for compatibility
    get winstonLogger() {
        return this.logger;
    }
    constructor(logger, defaultMetadata) {
        this.logger = logger;
        if (defaultMetadata) {
            this.defaultMetadata = defaultMetadata;
        }
    }
    mergeMetadata(metadata) {
        return { ...this.defaultMetadata, ...metadata };
    }
    // Context-aware logging methods
    orchestration(message, metadata) {
        this.logger.info(message, this.mergeMetadata({ context: LogContext.ORCHESTRATION, ...metadata }));
    }
    claudeCode(message, metadata) {
        this.logger.info(message, this.mergeMetadata({ context: LogContext.CLAUDE_CODE, ...metadata }));
    }
    openRouter(message, metadata) {
        this.logger.info(message, this.mergeMetadata({ context: LogContext.OPENROUTER, ...metadata }));
    }
    github(message, metadata) {
        this.logger.info(message, this.mergeMetadata({ context: LogContext.GITHUB, ...metadata }));
    }
    performance(message, duration, metadata) {
        this.logger.info(message, this.mergeMetadata({
            context: LogContext.PERFORMANCE,
            duration,
            ...metadata
        }));
    }
    tokenUsage(message, usage, metadata) {
        this.logger.info(message, this.mergeMetadata({
            context: LogContext.TOKEN,
            tokenUsage: usage,
            ...metadata
        }));
    }
    // Standard logging methods
    debug(message, metadata) {
        this.logger.debug(message, this.mergeMetadata(metadata));
    }
    info(message, metadata) {
        this.logger.info(message, this.mergeMetadata(metadata));
    }
    warn(message, metadata) {
        this.logger.warn(message, this.mergeMetadata(metadata));
    }
    error(message, error, metadata) {
        this.logger.error(message, this.mergeMetadata({
            context: LogContext.ERROR,
            error: error?.stack || error?.message || error,
            ...metadata
        }));
    }
    // Utility methods
    startTimer() {
        const start = Date.now();
        return () => Date.now() - start;
    }
    child(metadata) {
        return new EnhancedLogger(this.logger, this.mergeMetadata(metadata));
    }
}
exports.EnhancedLogger = EnhancedLogger;
/**
 * Create an enhanced logger instance
 */
function createEnhancedLogger(logPath, defaultMetadata) {
    const baseLogger = createLogger(logPath);
    return new EnhancedLogger(baseLogger, defaultMetadata);
}
/**
 * Log rotation utility
 */
function setupLogRotation(logDir = '.cco/logs') {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    setInterval(() => {
        if (!fs.existsSync(logDir))
            return;
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
async function aggregateLogs(sessionId, logPath) {
    const logDir = logPath || '.cco/logs';
    const logs = [];
    const readLogFile = (filePath) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        lines.forEach(line => {
            try {
                const log = JSON.parse(line);
                if (!sessionId || log.sessionId === sessionId) {
                    logs.push(log);
                }
            }
            catch (e) {
                // Skip malformed lines
            }
        });
    };
    if (sessionId) {
        const sessionLogPath = path.join(logDir, 'sessions', `${sessionId}.log`);
        if (fs.existsSync(sessionLogPath)) {
            readLogFile(sessionLogPath);
        }
    }
    else {
        const combinedLogPath = path.join(logDir, 'combined.log');
        if (fs.existsSync(combinedLogPath)) {
            readLogFile(combinedLogPath);
        }
    }
    return logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
//# sourceMappingURL=logger.js.map