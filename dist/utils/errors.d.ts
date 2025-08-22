/**
 * Custom error classes for better error handling and user feedback
 */
export declare enum ErrorCode {
    CONFIG_NOT_FOUND = "CONFIG_NOT_FOUND",
    CONFIG_INVALID = "CONFIG_INVALID",
    CONFIG_MISSING_REQUIRED = "CONFIG_MISSING_REQUIRED",
    API_KEY_MISSING = "API_KEY_MISSING",
    API_KEY_INVALID = "API_KEY_INVALID",
    API_RATE_LIMIT = "API_RATE_LIMIT",
    API_TIMEOUT = "API_TIMEOUT",
    API_CONNECTION_FAILED = "API_CONNECTION_FAILED",
    MISSION_NOT_FOUND = "MISSION_NOT_FOUND",
    MISSION_INVALID = "MISSION_INVALID",
    MISSION_PARSE_ERROR = "MISSION_PARSE_ERROR",
    MISSION_DOD_INVALID = "MISSION_DOD_INVALID",
    EXECUTION_FAILED = "EXECUTION_FAILED",
    EXECUTION_TIMEOUT = "EXECUTION_TIMEOUT",
    EXECUTION_MAX_ITERATIONS = "EXECUTION_MAX_ITERATIONS",
    CLAUDE_CODE_UNAVAILABLE = "CLAUDE_CODE_UNAVAILABLE",
    CLAUDE_CODE_VALIDATION_FAILED = "CLAUDE_CODE_VALIDATION_FAILED",
    CLAUDE_CODE_SDK_ERROR = "CLAUDE_CODE_SDK_ERROR",
    GITHUB_AUTH_FAILED = "GITHUB_AUTH_FAILED",
    GITHUB_ISSUE_NOT_FOUND = "GITHUB_ISSUE_NOT_FOUND",
    GITHUB_PR_FAILED = "GITHUB_PR_FAILED",
    SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
    SESSION_CORRUPTED = "SESSION_CORRUPTED",
    SESSION_SAVE_FAILED = "SESSION_SAVE_FAILED",
    FILE_NOT_FOUND = "FILE_NOT_FOUND",
    FILE_PERMISSION_DENIED = "FILE_PERMISSION_DENIED",
    FILE_WRITE_FAILED = "FILE_WRITE_FAILED"
}
export interface ErrorContext {
    code: ErrorCode;
    message: string;
    details?: any;
    suggestion?: string;
    documentation?: string;
}
export declare class CCOError extends Error {
    readonly code: ErrorCode;
    readonly details?: any;
    readonly suggestion?: string;
    readonly documentation?: string;
    readonly timestamp: Date;
    constructor(context: ErrorContext);
    toJSON(): {
        name: string;
        code: ErrorCode;
        message: string;
        details: any;
        suggestion: string | undefined;
        documentation: string | undefined;
        timestamp: Date;
        stack: string | undefined;
    };
    toString(): string;
}
export declare class ConfigurationError extends CCOError {
    constructor(message: string, code?: ErrorCode, details?: any);
}
export declare class APIError extends CCOError {
    constructor(message: string, code?: ErrorCode, details?: any);
}
export declare class MissionError extends CCOError {
    constructor(message: string, code?: ErrorCode, details?: any);
}
export declare class ExecutionError extends CCOError {
    constructor(message: string, code?: ErrorCode, details?: any);
}
export declare class GitHubError extends CCOError {
    constructor(message: string, code?: ErrorCode, details?: any);
}
/**
 * Error handler utility for consistent error formatting
 */
export declare class ErrorHandler {
    static handle(error: any): CCOError;
    static format(error: CCOError): string;
    static isRetryable(error: CCOError): boolean;
    static getRetryDelay(error: CCOError, attempt: number): number;
}
//# sourceMappingURL=errors.d.ts.map