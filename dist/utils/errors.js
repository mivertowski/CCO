"use strict";
/**
 * Custom error classes for better error handling and user feedback
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = exports.GitHubError = exports.ExecutionError = exports.MissionError = exports.APIError = exports.ConfigurationError = exports.CCOError = exports.ErrorCode = void 0;
var ErrorCode;
(function (ErrorCode) {
    // Configuration errors
    ErrorCode["CONFIG_NOT_FOUND"] = "CONFIG_NOT_FOUND";
    ErrorCode["CONFIG_INVALID"] = "CONFIG_INVALID";
    ErrorCode["CONFIG_MISSING_REQUIRED"] = "CONFIG_MISSING_REQUIRED";
    // API errors
    ErrorCode["API_KEY_MISSING"] = "API_KEY_MISSING";
    ErrorCode["API_KEY_INVALID"] = "API_KEY_INVALID";
    ErrorCode["API_RATE_LIMIT"] = "API_RATE_LIMIT";
    ErrorCode["API_TIMEOUT"] = "API_TIMEOUT";
    ErrorCode["API_CONNECTION_FAILED"] = "API_CONNECTION_FAILED";
    // Mission errors
    ErrorCode["MISSION_NOT_FOUND"] = "MISSION_NOT_FOUND";
    ErrorCode["MISSION_INVALID"] = "MISSION_INVALID";
    ErrorCode["MISSION_PARSE_ERROR"] = "MISSION_PARSE_ERROR";
    ErrorCode["MISSION_DOD_INVALID"] = "MISSION_DOD_INVALID";
    // Execution errors
    ErrorCode["EXECUTION_FAILED"] = "EXECUTION_FAILED";
    ErrorCode["EXECUTION_TIMEOUT"] = "EXECUTION_TIMEOUT";
    ErrorCode["EXECUTION_MAX_ITERATIONS"] = "EXECUTION_MAX_ITERATIONS";
    // Claude Code errors
    ErrorCode["CLAUDE_CODE_UNAVAILABLE"] = "CLAUDE_CODE_UNAVAILABLE";
    ErrorCode["CLAUDE_CODE_VALIDATION_FAILED"] = "CLAUDE_CODE_VALIDATION_FAILED";
    ErrorCode["CLAUDE_CODE_SDK_ERROR"] = "CLAUDE_CODE_SDK_ERROR";
    // GitHub errors
    ErrorCode["GITHUB_AUTH_FAILED"] = "GITHUB_AUTH_FAILED";
    ErrorCode["GITHUB_ISSUE_NOT_FOUND"] = "GITHUB_ISSUE_NOT_FOUND";
    ErrorCode["GITHUB_PR_FAILED"] = "GITHUB_PR_FAILED";
    // Session errors
    ErrorCode["SESSION_NOT_FOUND"] = "SESSION_NOT_FOUND";
    ErrorCode["SESSION_CORRUPTED"] = "SESSION_CORRUPTED";
    ErrorCode["SESSION_SAVE_FAILED"] = "SESSION_SAVE_FAILED";
    // File system errors
    ErrorCode["FILE_NOT_FOUND"] = "FILE_NOT_FOUND";
    ErrorCode["FILE_PERMISSION_DENIED"] = "FILE_PERMISSION_DENIED";
    ErrorCode["FILE_WRITE_FAILED"] = "FILE_WRITE_FAILED";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class CCOError extends Error {
    code;
    details;
    suggestion;
    documentation;
    timestamp;
    constructor(context) {
        super(context.message);
        this.name = 'CCOError';
        this.code = context.code;
        this.details = context.details;
        this.suggestion = context.suggestion;
        this.documentation = context.documentation;
        this.timestamp = new Date();
        // Maintain proper stack trace
        Error.captureStackTrace(this, this.constructor);
    }
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            details: this.details,
            suggestion: this.suggestion,
            documentation: this.documentation,
            timestamp: this.timestamp,
            stack: this.stack,
        };
    }
    toString() {
        let result = `${this.name} [${this.code}]: ${this.message}`;
        if (this.suggestion) {
            result += `\n💡 Suggestion: ${this.suggestion}`;
        }
        if (this.documentation) {
            result += `\n📚 Documentation: ${this.documentation}`;
        }
        return result;
    }
}
exports.CCOError = CCOError;
class ConfigurationError extends CCOError {
    constructor(message, code = ErrorCode.CONFIG_INVALID, details) {
        super({
            code,
            message,
            details,
            suggestion: 'Check your .cco/config.yaml file and ensure all required fields are present.',
            documentation: 'https://github.com/mivertowski/cco/blob/main/docs/configuration.md',
        });
        this.name = 'ConfigurationError';
    }
}
exports.ConfigurationError = ConfigurationError;
class APIError extends CCOError {
    constructor(message, code = ErrorCode.API_CONNECTION_FAILED, details) {
        const suggestions = {
            [ErrorCode.API_KEY_MISSING]: 'Set your API key in environment variables or .env file.',
            [ErrorCode.API_KEY_INVALID]: 'Verify your API key is correct and has not expired.',
            [ErrorCode.API_RATE_LIMIT]: 'Wait a moment and try again, or upgrade to a higher tier.',
            [ErrorCode.API_TIMEOUT]: 'Check your internet connection and try again.',
            [ErrorCode.API_CONNECTION_FAILED]: 'Verify your network connection and API endpoint.',
        };
        super({
            code,
            message,
            details,
            suggestion: suggestions[code] || 'Check your API configuration and network connection.',
            documentation: 'https://github.com/mivertowski/cco/blob/main/docs/troubleshooting.md#api-errors',
        });
        this.name = 'APIError';
    }
}
exports.APIError = APIError;
class MissionError extends CCOError {
    constructor(message, code = ErrorCode.MISSION_INVALID, details) {
        super({
            code,
            message,
            details,
            suggestion: 'Ensure your mission.yaml file follows the correct format.',
            documentation: 'https://github.com/mivertowski/cco/blob/main/docs/mission-templates.md',
        });
        this.name = 'MissionError';
    }
}
exports.MissionError = MissionError;
class ExecutionError extends CCOError {
    constructor(message, code = ErrorCode.EXECUTION_FAILED, details) {
        super({
            code,
            message,
            details,
            suggestion: 'Review the logs for more details and try adjusting your mission parameters.',
            documentation: 'https://github.com/mivertowski/cco/blob/main/docs/troubleshooting.md#execution-errors',
        });
        this.name = 'ExecutionError';
    }
}
exports.ExecutionError = ExecutionError;
class GitHubError extends CCOError {
    constructor(message, code = ErrorCode.GITHUB_AUTH_FAILED, details) {
        super({
            code,
            message,
            details,
            suggestion: 'Ensure you have the correct GitHub permissions and token.',
            documentation: 'https://github.com/mivertowski/cco/blob/main/docs/github-integration.md',
        });
        this.name = 'GitHubError';
    }
}
exports.GitHubError = GitHubError;
/**
 * Error handler utility for consistent error formatting
 */
class ErrorHandler {
    static handle(error) {
        // If it's already a CCO error, return it
        if (error instanceof CCOError) {
            return error;
        }
        // Parse common error patterns
        const message = error.message || error.toString();
        // API key errors
        if (message.includes('API key') || message.includes('unauthorized')) {
            return new APIError(message, ErrorCode.API_KEY_INVALID, error);
        }
        // Rate limit errors
        if (message.includes('rate limit') || message.includes('429')) {
            return new APIError('Rate limit exceeded. Please wait before retrying.', ErrorCode.API_RATE_LIMIT, error);
        }
        // File system errors
        if (message.includes('ENOENT')) {
            return new CCOError({
                code: ErrorCode.FILE_NOT_FOUND,
                message: 'File or directory not found',
                details: error,
                suggestion: 'Check that the file path is correct and the file exists.',
            });
        }
        if (message.includes('EACCES') || message.includes('permission')) {
            return new CCOError({
                code: ErrorCode.FILE_PERMISSION_DENIED,
                message: 'Permission denied',
                details: error,
                suggestion: 'Check file permissions and ensure CCO has access.',
            });
        }
        // Default error
        return new CCOError({
            code: ErrorCode.EXECUTION_FAILED,
            message: message,
            details: error,
            suggestion: 'Check the logs for more details.',
        });
    }
    static format(error) {
        const lines = [];
        // Header with error code
        lines.push(`\n❌ Error [${error.code}]`);
        lines.push('─'.repeat(50));
        // Main message
        lines.push(`\n${error.message}`);
        // Details if available
        if (error.details) {
            lines.push('\nDetails:');
            if (typeof error.details === 'object') {
                lines.push(JSON.stringify(error.details, null, 2));
            }
            else {
                lines.push(error.details.toString());
            }
        }
        // Suggestion
        if (error.suggestion) {
            lines.push(`\n💡 Suggestion: ${error.suggestion}`);
        }
        // Documentation link
        if (error.documentation) {
            lines.push(`\n📚 Learn more: ${error.documentation}`);
        }
        // Timestamp
        lines.push(`\n🕐 Time: ${error.timestamp.toISOString()}`);
        lines.push('─'.repeat(50));
        return lines.join('\n');
    }
    static isRetryable(error) {
        const retryableCodes = [
            ErrorCode.API_RATE_LIMIT,
            ErrorCode.API_TIMEOUT,
            ErrorCode.API_CONNECTION_FAILED,
            ErrorCode.CLAUDE_CODE_UNAVAILABLE,
        ];
        return retryableCodes.includes(error.code);
    }
    static getRetryDelay(error, attempt) {
        // Exponential backoff with jitter
        const baseDelay = 1000; // 1 second
        const maxDelay = 60000; // 60 seconds
        if (error.code === ErrorCode.API_RATE_LIMIT) {
            // Longer delay for rate limits
            return Math.min(baseDelay * Math.pow(2, attempt) * 2, maxDelay);
        }
        // Standard exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        return delay + jitter;
    }
}
exports.ErrorHandler = ErrorHandler;
//# sourceMappingURL=errors.js.map