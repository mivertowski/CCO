// Core exports
export { Orchestrator, type OrchestratorConfig, type OrchestrationResult } from './core/orchestrator';
export { MissionParser, type MissionFile } from './core/mission-parser';
export { ProgressTracker } from './core/progress-tracker';
export { SessionManager } from './core/session-manager';

// LLM exports
export { OpenRouterClient, type OpenRouterConfig, type ManagerResponse } from './llm/openrouter-client';
export { ClaudeCodeClient, type ClaudeCodeConfig, type ClaudeCodeResult, type ExecutionContext } from './llm/claude-code-client';
export { ManagerLLM, type AnalysisResult, type ValidationResult as ManagerValidationResult, type ErrorRecovery } from './llm/manager-llm';

// Model exports
export * from './models';

// Monitoring exports
export { 
  createLogger, 
  createSessionLogger,
  createEnhancedLogger,
  EnhancedLogger,
  LogContext,
  type LogMetadata,
  setupLogRotation,
  aggregateLogs
} from './monitoring/logger';
export { 
  ProgressReporter, 
  createProgressReporter,
  type ProgressState 
} from './monitoring/progress-reporter';
export { 
  TelemetryCollector,
  createTelemetryCollector,
  type TelemetryConfig,
  type MetricEvent
} from './monitoring/telemetry';

// Error handling exports
export {
  CCOError,
  ErrorCode,
  ErrorHandler,
  ConfigurationError,
  APIError,
  MissionError,
  ExecutionError,
  GitHubError,
  type ErrorContext
} from './utils/errors';

// Token optimization exports
export {
  TokenOptimizer,
  TokenEstimator,
  ContextManager,
  type TokenUsage,
  type OptimizationStrategy
} from './utils/token-optimizer';

// Utility exports
export { loadConfig, saveConfig, type Config } from './config/config-loader';