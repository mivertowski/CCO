import winston from 'winston';
export declare enum LogContext {
    ORCHESTRATION = "orchestration",
    CLAUDE_CODE = "claude-code",
    OPENROUTER = "openrouter",
    SESSION = "session",
    MISSION = "mission",
    GITHUB = "github",
    ERROR = "error",
    PERFORMANCE = "performance",
    TOKEN = "token",
    CLI = "cli"
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
export declare function createLogger(logPath?: string): winston.Logger;
export declare function createSessionLogger(sessionId: string, logPath?: string): winston.Logger;
/**
 * Enhanced logger wrapper with context and structured logging
 */
export declare class EnhancedLogger {
    private logger;
    private defaultMetadata;
    get winstonLogger(): winston.Logger;
    constructor(logger: winston.Logger, defaultMetadata?: LogMetadata);
    private mergeMetadata;
    orchestration(message: string, metadata?: LogMetadata): void;
    claudeCode(message: string, metadata?: LogMetadata): void;
    openRouter(message: string, metadata?: LogMetadata): void;
    github(message: string, metadata?: LogMetadata): void;
    performance(message: string, duration: number, metadata?: LogMetadata): void;
    tokenUsage(message: string, usage: LogMetadata['tokenUsage'], metadata?: LogMetadata): void;
    debug(message: string, metadata?: LogMetadata): void;
    info(message: string, metadata?: LogMetadata): void;
    warn(message: string, metadata?: LogMetadata): void;
    error(message: string, error?: any, metadata?: LogMetadata): void;
    startTimer(): () => number;
    child(metadata: LogMetadata): EnhancedLogger;
}
/**
 * Create an enhanced logger instance
 */
export declare function createEnhancedLogger(logPath?: string, defaultMetadata?: LogMetadata): EnhancedLogger;
/**
 * Log rotation utility
 */
export declare function setupLogRotation(logDir?: string): void;
/**
 * Export log aggregator for analysis
 */
export declare function aggregateLogs(sessionId?: string, logPath?: string): Promise<any[]>;
//# sourceMappingURL=logger.d.ts.map