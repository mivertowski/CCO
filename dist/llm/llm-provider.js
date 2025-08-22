"use strict";
/**
 * LLM Provider Interface and Factory
 * Supports multiple LLM backends for orchestration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMProviderFactory = exports.OpenRouterAdapter = exports.LLMProvider = void 0;
const openrouter_client_1 = require("./openrouter-client");
const claude_code_sdk_client_1 = require("./claude-code-sdk-client");
const local_llm_client_1 = require("./local-llm-client");
var LLMProvider;
(function (LLMProvider) {
    LLMProvider["OPENROUTER"] = "openrouter";
    LLMProvider["CLAUDE_CODE"] = "claude-code";
    LLMProvider["LOCAL_CUDA"] = "local-cuda";
    LLMProvider["LOCAL_CPU"] = "local-cpu";
    LLMProvider["OLLAMA"] = "ollama";
    LLMProvider["LLAMACPP"] = "llamacpp";
    LLMProvider["VLLM"] = "vllm";
})(LLMProvider || (exports.LLMProvider = LLMProvider = {}));
// Adapter to make OpenRouterClient compatible with ILLMClient
class OpenRouterAdapter {
    client;
    constructor(client) {
        this.client = client;
    }
    async generateResponse(prompt, systemPrompt) {
        const response = await this.client.sendMessage(systemPrompt || 'You are an AI assistant', prompt);
        return response.content;
    }
    async validateEnvironment() {
        // OpenRouter doesn't have a specific validation method, assume valid if configured
        return true;
    }
}
exports.OpenRouterAdapter = OpenRouterAdapter;
class LLMProviderFactory {
    static async create(config, logger) {
        let orchestratorClient = null;
        let claudeCodeClient = null;
        switch (config.provider) {
            case LLMProvider.OPENROUTER:
                if (!config.apiKey) {
                    throw new Error('OpenRouter API key is required');
                }
                const openRouterClient = new openrouter_client_1.OpenRouterClient({
                    apiKey: config.apiKey,
                    model: config.model || 'claude-3-opus',
                    temperature: config.temperature || 0.7,
                    maxTokens: config.maxTokens || 100000,
                    baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
                    retryAttempts: 3,
                    retryDelay: 1000
                }, logger);
                orchestratorClient = new OpenRouterAdapter(openRouterClient);
                break;
            case LLMProvider.CLAUDE_CODE:
                // Use Claude Code SDK for both orchestration and execution
                if (!config.apiKey && !process.env.ANTHROPIC_API_KEY) {
                    logger.warn('No Anthropic API key found - will use Claude Code subscription if available');
                }
                const claudeClient = new claude_code_sdk_client_1.ClaudeCodeSDKClient({
                    apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
                    model: config.model || 'claude-opus-4-1-20250805',
                    temperature: config.temperature || 0.3,
                    projectPath: process.cwd(),
                    maxTurns: 10,
                    planMode: false,
                    jsonMode: false
                }, logger);
                // Claude Code client can serve both roles
                claudeCodeClient = claudeClient;
                // Create adapter for orchestrator use
                orchestratorClient = {
                    async generateResponse(prompt, systemPrompt) {
                        const result = await claudeClient.execute(systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt, {
                            workingDirectory: process.cwd(),
                            environment: process.env,
                            previousArtifacts: []
                        });
                        return result.output || '';
                    },
                    async validateEnvironment() {
                        return await claudeClient.validateEnvironment();
                    }
                };
                break;
            case LLMProvider.LOCAL_CUDA:
            case LLMProvider.LOCAL_CPU:
                orchestratorClient = new local_llm_client_1.LocalLLMClient({
                    ...config,
                    useCUDA: config.provider === LLMProvider.LOCAL_CUDA
                }, logger);
                break;
            case LLMProvider.OLLAMA:
                orchestratorClient = new local_llm_client_1.LocalLLMClient({
                    ...config,
                    backend: 'ollama'
                }, logger);
                break;
            case LLMProvider.LLAMACPP:
                orchestratorClient = new local_llm_client_1.LocalLLMClient({
                    ...config,
                    backend: 'llamacpp'
                }, logger);
                break;
            case LLMProvider.VLLM:
                orchestratorClient = new local_llm_client_1.LocalLLMClient({
                    ...config,
                    backend: 'vllm'
                }, logger);
                break;
            default:
                throw new Error(`Unsupported LLM provider: ${config.provider}`);
        }
        // If we don't have a Claude Code client yet, create one if needed
        if (!claudeCodeClient && (config.apiKey || process.env.ANTHROPIC_API_KEY)) {
            claudeCodeClient = new claude_code_sdk_client_1.ClaudeCodeSDKClient({
                apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
                model: 'claude-opus-4-1-20250805',
                temperature: 0.3,
                projectPath: process.cwd(),
                maxTurns: 10,
                planMode: false,
                jsonMode: false
            }, logger);
        }
        return { orchestratorClient, claudeCodeClient };
    }
    static async detectBestProvider(logger) {
        // Check for CUDA availability
        try {
            const { execSync } = require('child_process');
            execSync('nvidia-smi', { stdio: 'ignore' });
            logger.info('CUDA GPU detected, can use local CUDA models');
            // Check if a local model server is running
            try {
                const http = require('http');
                await new Promise((resolve, reject) => {
                    http.get('http://localhost:11434/api/tags', (res) => {
                        if (res.statusCode === 200) {
                            resolve(true);
                        }
                        else {
                            reject(false);
                        }
                    }).on('error', reject);
                });
                logger.info('Ollama server detected on localhost:11434');
                return LLMProvider.OLLAMA;
            }
            catch {
                // Ollama not running
            }
            // Check for VLLM
            try {
                const http = require('http');
                await new Promise((resolve, reject) => {
                    http.get('http://localhost:8000/v1/models', (res) => {
                        if (res.statusCode === 200) {
                            resolve(true);
                        }
                        else {
                            reject(false);
                        }
                    }).on('error', reject);
                });
                logger.info('VLLM server detected on localhost:8000');
                return LLMProvider.VLLM;
            }
            catch {
                // VLLM not running
            }
            return LLMProvider.LOCAL_CUDA;
        }
        catch {
            logger.debug('No CUDA GPU detected');
        }
        // Check for API keys
        if (process.env.OPENROUTER_API_KEY) {
            return LLMProvider.OPENROUTER;
        }
        if (process.env.ANTHROPIC_API_KEY) {
            return LLMProvider.CLAUDE_CODE;
        }
        // Default to CPU-based local model
        return LLMProvider.LOCAL_CPU;
    }
}
exports.LLMProviderFactory = LLMProviderFactory;
//# sourceMappingURL=llm-provider.js.map