/**
 * Custom error classes for better error handling and user feedback
 */

export enum ErrorCode {
  // Configuration errors
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_MISSING_REQUIRED = 'CONFIG_MISSING_REQUIRED',
  
  // API errors
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_TIMEOUT = 'API_TIMEOUT',
  API_CONNECTION_FAILED = 'API_CONNECTION_FAILED',
  
  // Mission errors
  MISSION_NOT_FOUND = 'MISSION_NOT_FOUND',
  MISSION_INVALID = 'MISSION_INVALID',
  MISSION_PARSE_ERROR = 'MISSION_PARSE_ERROR',
  MISSION_DOD_INVALID = 'MISSION_DOD_INVALID',
  
  // Execution errors
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  EXECUTION_TIMEOUT = 'EXECUTION_TIMEOUT',
  EXECUTION_MAX_ITERATIONS = 'EXECUTION_MAX_ITERATIONS',
  
  // Claude Code errors
  CLAUDE_CODE_UNAVAILABLE = 'CLAUDE_CODE_UNAVAILABLE',
  CLAUDE_CODE_VALIDATION_FAILED = 'CLAUDE_CODE_VALIDATION_FAILED',
  CLAUDE_CODE_SDK_ERROR = 'CLAUDE_CODE_SDK_ERROR',
  
  // GitHub errors
  GITHUB_AUTH_FAILED = 'GITHUB_AUTH_FAILED',
  GITHUB_ISSUE_NOT_FOUND = 'GITHUB_ISSUE_NOT_FOUND',
  GITHUB_PR_FAILED = 'GITHUB_PR_FAILED',
  
  // Session errors
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_CORRUPTED = 'SESSION_CORRUPTED',
  SESSION_SAVE_FAILED = 'SESSION_SAVE_FAILED',
  
  // File system errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_PERMISSION_DENIED = 'FILE_PERMISSION_DENIED',
  FILE_WRITE_FAILED = 'FILE_WRITE_FAILED',
}

export interface ErrorContext {
  code: ErrorCode;
  message: string;
  details?: any;
  suggestion?: string;
  documentation?: string;
}

export class CCOError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: any;
  public readonly suggestion?: string;
  public readonly documentation?: string;
  public readonly timestamp: Date;

  constructor(context: ErrorContext) {
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

  toString(): string {
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

export class ConfigurationError extends CCOError {
  constructor(message: string, code: ErrorCode = ErrorCode.CONFIG_INVALID, details?: any) {
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

export class APIError extends CCOError {
  constructor(message: string, code: ErrorCode = ErrorCode.API_CONNECTION_FAILED, details?: any) {
    const suggestions: Partial<Record<ErrorCode, string>> = {
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

export class MissionError extends CCOError {
  constructor(message: string, code: ErrorCode = ErrorCode.MISSION_INVALID, details?: any) {
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

export class ExecutionError extends CCOError {
  constructor(message: string, code: ErrorCode = ErrorCode.EXECUTION_FAILED, details?: any) {
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

export class GitHubError extends CCOError {
  constructor(message: string, code: ErrorCode = ErrorCode.GITHUB_AUTH_FAILED, details?: any) {
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

/**
 * Error handler utility for consistent error formatting
 */
export class ErrorHandler {
  static handle(error: any): CCOError {
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
      return new APIError(
        'Rate limit exceeded. Please wait before retrying.',
        ErrorCode.API_RATE_LIMIT,
        error
      );
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
  
  static format(error: CCOError): string {
    const lines: string[] = [];
    
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
      } else {
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
  
  static isRetryable(error: CCOError): boolean {
    const retryableCodes = [
      ErrorCode.API_RATE_LIMIT,
      ErrorCode.API_TIMEOUT,
      ErrorCode.API_CONNECTION_FAILED,
      ErrorCode.CLAUDE_CODE_UNAVAILABLE,
    ];
    
    return retryableCodes.includes(error.code);
  }
  
  static getRetryDelay(error: CCOError, attempt: number): number {
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