"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeCodeClient = exports.ClaudeCodeConfigSchema = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const zod_1 = require("zod");
exports.ClaudeCodeConfigSchema = zod_1.z.object({
    apiKey: zod_1.z.string().optional(), // Optional for subscription users
    useSubscription: zod_1.z.boolean().default(false), // Use Claude Code subscription instead of API
    projectPath: zod_1.z.string(),
    maxIterations: zod_1.z.number().default(100),
    timeoutMs: zod_1.z.number().default(300000), // 5 minutes
    contextWindow: zod_1.z.number().default(200000),
    model: zod_1.z.string().default('claude-opus-4-1-20250805'), // Updated to Opus 4.1
    temperature: zod_1.z.number().min(0).max(1).default(0.3)
});
class ClaudeCodeClient {
    client;
    config;
    logger;
    currentSession = null;
    constructor(config, logger) {
        this.config = exports.ClaudeCodeConfigSchema.parse(config);
        this.logger = logger;
        // Only initialize Anthropic client if using API mode
        if (!this.config.useSubscription) {
            if (!this.config.apiKey) {
                throw new Error('API key is required when not using subscription mode');
            }
            this.client = new sdk_1.default({
                apiKey: this.config.apiKey
            });
        }
        else {
            // Subscription mode - Claude Code operates without API
            this.logger.info('Using Claude Code subscription mode (no API key required)');
            // In subscription mode, we'll simulate the API interface
            // This would integrate with the actual Claude Code instance
            this.client = null; // Placeholder for subscription mode
        }
    }
    async execute(task, context) {
        try {
            this.logger.info('Executing Claude Code task', {
                task: task.substring(0, 100),
                projectPath: this.config.projectPath,
                session: this.currentSession
            });
            const systemPrompt = this.buildSystemPrompt(context);
            const userPrompt = this.buildUserPrompt(task, context);
            const response = await this.client.messages.create({
                model: this.config.model,
                max_tokens: 8192,
                temperature: this.config.temperature,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: userPrompt }
                ]
            });
            const result = this.parseResponse(response);
            this.logger.info('Claude Code execution completed', {
                success: result.success,
                artifactCount: result.artifacts.length,
                tokens: result.tokenUsage.totalTokens
            });
            return result;
        }
        catch (error) {
            this.logger.error('Claude Code execution failed', { error });
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
            this.logger.debug('Validating Claude Code environment', {
                projectPath: this.config.projectPath
            });
            const testResponse = await this.client.messages.create({
                model: this.config.model,
                max_tokens: 100,
                messages: [
                    {
                        role: 'user',
                        content: 'Respond with "OK" if you can assist with code tasks.'
                    }
                ]
            });
            const content = testResponse.content[0];
            return content.type === 'text' && content.text.includes('OK');
        }
        catch (error) {
            this.logger.error('Environment validation failed', { error });
            return false;
        }
    }
    startSession(sessionId) {
        this.currentSession = sessionId;
        this.logger.info('Started Claude Code session', { sessionId });
    }
    endSession() {
        const sessionId = this.currentSession;
        this.currentSession = null;
        this.logger.info('Ended Claude Code session', { sessionId });
    }
    buildSystemPrompt(context) {
        return `You are Claude Code, an expert coding assistant working on a project located at ${this.config.projectPath}.

Your role is to:
1. Understand and execute the given programming task
2. Write clean, efficient, and well-structured code
3. Follow best practices and conventions
4. Create or modify files as needed
5. Provide clear explanations of your work

Context:
- Working directory: ${context?.workingDirectory || this.config.projectPath}
- Session: ${this.currentSession || 'new'}
- Max iterations: ${this.config.maxIterations}

When you complete a task or need to pause, clearly indicate this in your response.
Format file changes as:
[FILE: path/to/file]
[CONTENT]
file content here
[/CONTENT]`;
    }
    buildUserPrompt(task, context) {
        let prompt = `Task: ${task}\n\n`;
        if (context?.previousArtifacts && context.previousArtifacts.length > 0) {
            prompt += 'Previous artifacts from this session:\n';
            for (const artifact of context.previousArtifacts) {
                prompt += `\nFile: ${artifact.path}\n`;
                prompt += `Content preview: ${artifact.content.substring(0, 200)}...\n`;
            }
            prompt += '\n';
        }
        prompt += 'Please execute this task and provide any necessary file changes.';
        return prompt;
    }
    parseResponse(response) {
        const content = response.content[0];
        if (content.type !== 'text') {
            throw new Error('Unexpected response type from Claude');
        }
        const text = content.text;
        const artifacts = this.extractArtifacts(text);
        const sessionEnded = this.detectSessionEnd(text);
        const usage = response.usage;
        const tokenUsage = {
            promptTokens: usage?.input_tokens || 0,
            completionTokens: usage?.output_tokens || 0,
            totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
            estimatedCost: this.calculateCost(usage?.input_tokens || 0, usage?.output_tokens || 0)
        };
        return {
            success: true,
            output: text,
            artifacts,
            sessionEnded,
            tokenUsage
        };
    }
    extractArtifacts(text) {
        const artifacts = [];
        const filePattern = /\[FILE: (.*?)\]\n\[CONTENT\](.*?)\[\/CONTENT\]/gs;
        let match;
        while ((match = filePattern.exec(text)) !== null) {
            const path = match[1].trim();
            const content = match[2].trim();
            const type = this.determineFileType(path);
            artifacts.push({ path, content, type });
        }
        return artifacts;
    }
    determineFileType(path) {
        const extension = path.split('.').pop()?.toLowerCase();
        const typeMap = {
            'ts': 'code',
            'js': 'code',
            'py': 'code',
            'java': 'code',
            'md': 'documentation',
            'txt': 'documentation',
            'json': 'config',
            'yaml': 'config',
            'yml': 'config',
            'test.ts': 'test',
            'spec.ts': 'test',
            'test.js': 'test',
            'spec.js': 'test'
        };
        return typeMap[extension || ''] || 'other';
    }
    detectSessionEnd(text) {
        const endIndicators = [
            'task completed',
            'task is complete',
            'finished the task',
            'stopping here',
            'pausing here',
            'session end',
            'need more information',
            'awaiting further instructions'
        ];
        const lowerText = text.toLowerCase();
        return endIndicators.some(indicator => lowerText.includes(indicator));
    }
    calculateCost(inputTokens, outputTokens) {
        const costs = {
            'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
            'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
            'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
        };
        const modelCost = costs[this.config.model] ||
            { input: 0.01, output: 0.03 };
        return ((inputTokens / 1000) * modelCost.input +
            (outputTokens / 1000) * modelCost.output);
    }
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.ClaudeCodeClient = ClaudeCodeClient;
//# sourceMappingURL=claude-code-client.js.map