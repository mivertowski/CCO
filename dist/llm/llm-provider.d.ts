/**
 * LLM Provider Interface and Factory
 * Supports multiple LLM backends for orchestration
 */
import { OpenRouterClient } from './openrouter-client';
import { IClaudeCodeClient } from './claude-code-interface';
import winston from 'winston';
export declare enum LLMProvider {
    OPENROUTER = "openrouter",
    CLAUDE_CODE = "claude-code",
    LOCAL_CUDA = "local-cuda",
    LOCAL_CPU = "local-cpu",
    OLLAMA = "ollama",
    LLAMACPP = "llamacpp",
    VLLM = "vllm"
}
export interface LLMConfig {
    provider: LLMProvider;
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    baseURL?: string;
    localModel?: {
        path?: string;
        name?: string;
        quantization?: string;
        contextSize?: number;
        gpuLayers?: number;
        threads?: number;
        useMmap?: boolean;
        useMLock?: boolean;
    };
    vllmOptions?: {
        tensorParallelSize?: number;
        dtype?: 'auto' | 'half' | 'float16' | 'bfloat16' | 'float32';
        gpuMemoryUtilization?: number;
    };
}
export interface ILLMClient {
    generateResponse(prompt: string, systemPrompt?: string): Promise<string>;
    validateEnvironment?(): Promise<boolean>;
    getModelInfo?(): Promise<{
        name: string;
        parameters?: number;
        context?: number;
    }>;
}
export declare class OpenRouterAdapter implements ILLMClient {
    private client;
    constructor(client: OpenRouterClient);
    generateResponse(prompt: string, systemPrompt?: string): Promise<string>;
    validateEnvironment(): Promise<boolean>;
}
export declare class LLMProviderFactory {
    static create(config: LLMConfig, logger: winston.Logger): Promise<{
        orchestratorClient: ILLMClient | null;
        claudeCodeClient: IClaudeCodeClient | null;
    }>;
    static detectBestProvider(logger: winston.Logger): Promise<LLMProvider>;
}
//# sourceMappingURL=llm-provider.d.ts.map