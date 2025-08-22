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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeCodeSDKClient = exports.ClaudeCodeSDKConfigSchema = void 0;
const claude_code_1 = require("@anthropic-ai/claude-code");
const zod_1 = require("zod");
const path = __importStar(require("path"));
exports.ClaudeCodeSDKConfigSchema = zod_1.z.object({
    apiKey: zod_1.z.string().optional(), // Optional, can use ANTHROPIC_API_KEY env var
    projectPath: zod_1.z.string(),
    maxTurns: zod_1.z.number().default(10), // Max iterations for multi-turn conversations
    model: zod_1.z.string().default('claude-3-5-sonnet-20241022'), // Latest model
    temperature: zod_1.z.number().min(0).max(1).default(0.3),
    systemPrompt: zod_1.z.string().optional(),
    planMode: zod_1.z.boolean().default(false), // Analysis without modifications
    jsonMode: zod_1.z.boolean().default(false), // Structured JSON output
});
class ClaudeCodeSDKClient {
    config;
    logger;
    currentSession = null;
    constructor(config, logger) {
        this.config = exports.ClaudeCodeSDKConfigSchema.parse(config);
        this.logger = logger;
        // Set API key if provided
        if (this.config.apiKey) {
            process.env.ANTHROPIC_API_KEY = this.config.apiKey;
        }
        // Verify API key is available
        if (!process.env.ANTHROPIC_API_KEY) {
            this.logger.warn('No ANTHROPIC_API_KEY found - SDK will use subscription if available');
        }
    }
    async execute(task, context) {
        try {
            this.logger.info('Executing Claude Code SDK task', {
                task: task.substring(0, 100),
                projectPath: this.config.projectPath,
                session: this.currentSession,
                planMode: this.config.planMode
            });
            // Build the prompt with context
            const prompt = this.buildPrompt(task, context);
            // Configure query options
            const options = {
                customSystemPrompt: this.config.systemPrompt || this.buildSystemPrompt(context),
                maxTurns: this.config.maxTurns,
                cwd: context?.workingDirectory || this.config.projectPath,
                // Use bypassPermissions mode to skip all permission prompts for automated execution
                permissionMode: this.config.planMode ? 'plan' : 'bypassPermissions',
                // Let SDK use default tools based on the environment
                // Most common code tools are available by default
            };
            const result = {
                success: false,
                output: '',
                artifacts: [],
                sessionEnded: false,
                tokenUsage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    estimatedCost: 0
                },
                metadata: {
                    toolsUsed: [],
                    filesModified: []
                }
            };
            // Execute query using SDK
            const queryResult = (0, claude_code_1.query)({ prompt, options });
            for await (const message of queryResult) {
                this.handleMessage(message, result);
            }
            // Mark as successful if we got results
            if (result.output) {
                result.success = true;
                result.sessionEnded = true;
            }
            this.logger.info('Claude Code SDK execution completed', {
                success: result.success,
                artifactCount: result.artifacts.length,
                toolsUsed: result.metadata?.toolsUsed,
                tokens: result.tokenUsage.totalTokens
            });
            return result;
        }
        catch (error) {
            this.logger.error('Claude Code SDK execution failed', { error });
            return {
                success: false,
                output: '',
                artifacts: [],
                sessionEnded: true,
                tokenUsage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    estimatedCost: 0
                },
                error: error.message
            };
        }
    }
    async validateEnvironment() {
        try {
            this.logger.debug('Validating Claude Code SDK environment', {
                projectPath: this.config.projectPath,
                hasApiKey: !!process.env.ANTHROPIC_API_KEY
            });
            // Try a simple query to validate the environment
            const testPrompt = 'Respond with "OK" if you can assist with code tasks.';
            const testQuery = (0, claude_code_1.query)({
                prompt: testPrompt,
                options: { maxTurns: 1 }
            });
            for await (const message of testQuery) {
                if (message.type === 'result' && message.subtype === 'success') {
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            this.logger.error('Environment validation failed', { error });
            return false;
        }
    }
    startSession(sessionId) {
        this.currentSession = sessionId;
        this.logger.info('Started Claude Code SDK session', { sessionId });
    }
    endSession() {
        const sessionId = this.currentSession;
        this.currentSession = null;
        this.logger.info('Ended Claude Code SDK session', { sessionId });
    }
    buildPrompt(task, context) {
        let prompt = `Task: ${task}\n\n`;
        if (context?.previousArtifacts && context.previousArtifacts.length > 0) {
            prompt += 'Previous work in this session:\n';
            for (const artifact of context.previousArtifacts) {
                prompt += `- ${artifact.path}\n`;
            }
            prompt += '\n';
        }
        prompt += `Working directory: ${context?.workingDirectory || this.config.projectPath}\n`;
        prompt += '\nPlease complete this task and provide any necessary file changes.';
        return prompt;
    }
    buildSystemPrompt(_context) {
        return `You are Claude Code, an expert coding assistant working on a project.

Project location: ${this.config.projectPath}
Current session: ${this.currentSession || 'new'}

Your role is to:
1. Understand and execute programming tasks
2. Write clean, efficient, and well-structured code
3. Follow best practices and conventions
4. Create or modify files as needed
5. Run tests when appropriate
6. Provide clear explanations of your work

When working with files:
- Use appropriate file operations (read, write, update)
- Preserve existing code style and conventions
- Add proper error handling
- Include necessary imports

${this.config.planMode ? 'NOTE: You are in PLAN MODE - analyze and plan but do not make modifications.' : ''}`;
    }
    handleMessage(message, result) {
        switch (message.type) {
            case 'result': {
                const resultMsg = message;
                // Handle result based on subtype
                if (resultMsg.subtype === 'success') {
                    result.output = resultMsg.result || '';
                    result.success = true;
                }
                else {
                    result.error = `Query ended with ${resultMsg.subtype}`;
                    result.success = false;
                }
                // Update token metrics from usage
                if (resultMsg.usage) {
                    result.tokenUsage = {
                        promptTokens: resultMsg.usage.input_tokens || 0,
                        completionTokens: resultMsg.usage.output_tokens || 0,
                        totalTokens: (resultMsg.usage.input_tokens || 0) + (resultMsg.usage.output_tokens || 0),
                        estimatedCost: resultMsg.total_cost_usd || this.calculateCost(resultMsg.usage.input_tokens || 0, resultMsg.usage.output_tokens || 0)
                    };
                }
                break;
            }
            case 'assistant':
                // Assistant messages contain the actual work being done
                if (message.message?.content) {
                    // Extract text content from assistant messages
                    const content = Array.isArray(message.message.content)
                        ? message.message.content
                            .filter((c) => c.type === 'text')
                            .map((c) => c.text)
                            .join('\n')
                        : message.message.content;
                    if (content) {
                        result.output += content + '\n';
                    }
                }
                // Track tool usage from assistant messages
                if (message.message?.content && Array.isArray(message.message.content)) {
                    for (const block of message.message.content) {
                        if (block.type === 'tool_use') {
                            result.metadata?.toolsUsed?.push(block.name);
                            // Track file modifications
                            if (block.name === 'str_replace_editor' || block.name === 'write') {
                                const path = block.input?.path || block.input?.file_path;
                                if (path) {
                                    result.metadata?.filesModified?.push(path);
                                    result.artifacts.push({
                                        path,
                                        content: block.input?.new_str || block.input?.content || '',
                                        type: this.determineFileType(path),
                                        operation: block.name === 'write' ? 'create' : 'update'
                                    });
                                }
                            }
                        }
                    }
                }
                break;
            case 'user':
                // User messages (from prompts)
                this.logger.debug('User message in stream', { message });
                break;
            case 'system':
                // System initialization messages
                this.logger.debug('System message', {
                    model: message.model,
                    tools: message.tools,
                    cwd: message.cwd
                });
                break;
            default:
                this.logger.debug('Unhandled message type', { type: message.type, message });
        }
    }
    determineFileType(filePath) {
        const extension = path.extname(filePath).toLowerCase();
        const typeMap = {
            '.ts': 'code',
            '.js': 'code',
            '.tsx': 'code',
            '.jsx': 'code',
            '.py': 'code',
            '.java': 'code',
            '.cs': 'code',
            '.go': 'code',
            '.rs': 'code',
            '.md': 'documentation',
            '.txt': 'documentation',
            '.json': 'config',
            '.yaml': 'config',
            '.yml': 'config',
            '.xml': 'config',
            '.toml': 'config',
            '.test.ts': 'test',
            '.spec.ts': 'test',
            '.test.js': 'test',
            '.spec.js': 'test'
        };
        // Check for test files
        if (filePath.includes('.test.') || filePath.includes('.spec.')) {
            return 'test';
        }
        return typeMap[extension] || 'other';
    }
    calculateCost(inputTokens, outputTokens) {
        // Pricing for Claude 3.5 Sonnet (as of 2025)
        const costs = {
            'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
            'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
            'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
            'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
        };
        const modelCost = costs[this.config.model] ||
            { input: 0.003, output: 0.015 };
        return ((inputTokens / 1000) * modelCost.input +
            (outputTokens / 1000) * modelCost.output);
    }
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        // Update API key if changed
        if (config.apiKey) {
            process.env.ANTHROPIC_API_KEY = config.apiKey;
        }
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.ClaudeCodeSDKClient = ClaudeCodeSDKClient;
//# sourceMappingURL=claude-code-sdk-client.js.map