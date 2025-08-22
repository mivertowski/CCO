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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveConfig = exports.loadConfig = exports.ContextManager = exports.TokenEstimator = exports.TokenOptimizer = exports.GitHubError = exports.ExecutionError = exports.MissionError = exports.APIError = exports.ConfigurationError = exports.ErrorHandler = exports.ErrorCode = exports.CCOError = exports.createTelemetryCollector = exports.TelemetryCollector = exports.createProgressReporter = exports.ProgressReporter = exports.aggregateLogs = exports.setupLogRotation = exports.LogContext = exports.EnhancedLogger = exports.createEnhancedLogger = exports.createSessionLogger = exports.createLogger = exports.ManagerLLM = exports.ClaudeCodeClient = exports.OpenRouterClient = exports.SessionManager = exports.ProgressTracker = exports.MissionParser = exports.Orchestrator = void 0;
// Core exports
var orchestrator_1 = require("./core/orchestrator");
Object.defineProperty(exports, "Orchestrator", { enumerable: true, get: function () { return orchestrator_1.Orchestrator; } });
var mission_parser_1 = require("./core/mission-parser");
Object.defineProperty(exports, "MissionParser", { enumerable: true, get: function () { return mission_parser_1.MissionParser; } });
var progress_tracker_1 = require("./core/progress-tracker");
Object.defineProperty(exports, "ProgressTracker", { enumerable: true, get: function () { return progress_tracker_1.ProgressTracker; } });
var session_manager_1 = require("./core/session-manager");
Object.defineProperty(exports, "SessionManager", { enumerable: true, get: function () { return session_manager_1.SessionManager; } });
// LLM exports
var openrouter_client_1 = require("./llm/openrouter-client");
Object.defineProperty(exports, "OpenRouterClient", { enumerable: true, get: function () { return openrouter_client_1.OpenRouterClient; } });
var claude_code_client_1 = require("./llm/claude-code-client");
Object.defineProperty(exports, "ClaudeCodeClient", { enumerable: true, get: function () { return claude_code_client_1.ClaudeCodeClient; } });
var manager_llm_1 = require("./llm/manager-llm");
Object.defineProperty(exports, "ManagerLLM", { enumerable: true, get: function () { return manager_llm_1.ManagerLLM; } });
// Model exports
__exportStar(require("./models"), exports);
// Monitoring exports
var logger_1 = require("./monitoring/logger");
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return logger_1.createLogger; } });
Object.defineProperty(exports, "createSessionLogger", { enumerable: true, get: function () { return logger_1.createSessionLogger; } });
Object.defineProperty(exports, "createEnhancedLogger", { enumerable: true, get: function () { return logger_1.createEnhancedLogger; } });
Object.defineProperty(exports, "EnhancedLogger", { enumerable: true, get: function () { return logger_1.EnhancedLogger; } });
Object.defineProperty(exports, "LogContext", { enumerable: true, get: function () { return logger_1.LogContext; } });
Object.defineProperty(exports, "setupLogRotation", { enumerable: true, get: function () { return logger_1.setupLogRotation; } });
Object.defineProperty(exports, "aggregateLogs", { enumerable: true, get: function () { return logger_1.aggregateLogs; } });
var progress_reporter_1 = require("./monitoring/progress-reporter");
Object.defineProperty(exports, "ProgressReporter", { enumerable: true, get: function () { return progress_reporter_1.ProgressReporter; } });
Object.defineProperty(exports, "createProgressReporter", { enumerable: true, get: function () { return progress_reporter_1.createProgressReporter; } });
var telemetry_1 = require("./monitoring/telemetry");
Object.defineProperty(exports, "TelemetryCollector", { enumerable: true, get: function () { return telemetry_1.TelemetryCollector; } });
Object.defineProperty(exports, "createTelemetryCollector", { enumerable: true, get: function () { return telemetry_1.createTelemetryCollector; } });
// Error handling exports
var errors_1 = require("./utils/errors");
Object.defineProperty(exports, "CCOError", { enumerable: true, get: function () { return errors_1.CCOError; } });
Object.defineProperty(exports, "ErrorCode", { enumerable: true, get: function () { return errors_1.ErrorCode; } });
Object.defineProperty(exports, "ErrorHandler", { enumerable: true, get: function () { return errors_1.ErrorHandler; } });
Object.defineProperty(exports, "ConfigurationError", { enumerable: true, get: function () { return errors_1.ConfigurationError; } });
Object.defineProperty(exports, "APIError", { enumerable: true, get: function () { return errors_1.APIError; } });
Object.defineProperty(exports, "MissionError", { enumerable: true, get: function () { return errors_1.MissionError; } });
Object.defineProperty(exports, "ExecutionError", { enumerable: true, get: function () { return errors_1.ExecutionError; } });
Object.defineProperty(exports, "GitHubError", { enumerable: true, get: function () { return errors_1.GitHubError; } });
// Token optimization exports
var token_optimizer_1 = require("./utils/token-optimizer");
Object.defineProperty(exports, "TokenOptimizer", { enumerable: true, get: function () { return token_optimizer_1.TokenOptimizer; } });
Object.defineProperty(exports, "TokenEstimator", { enumerable: true, get: function () { return token_optimizer_1.TokenEstimator; } });
Object.defineProperty(exports, "ContextManager", { enumerable: true, get: function () { return token_optimizer_1.ContextManager; } });
// Utility exports
var config_loader_1 = require("./config/config-loader");
Object.defineProperty(exports, "loadConfig", { enumerable: true, get: function () { return config_loader_1.loadConfig; } });
Object.defineProperty(exports, "saveConfig", { enumerable: true, get: function () { return config_loader_1.saveConfig; } });
//# sourceMappingURL=index.js.map