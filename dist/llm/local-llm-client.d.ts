/**
 * Local LLM Client Implementation
 * Supports various local LLM backends including CUDA acceleration
 */
import winston from 'winston';
import { ILLMClient, LLMConfig } from './llm-provider';
export interface LocalLLMConfig extends LLMConfig {
    backend?: 'ollama' | 'llamacpp' | 'vllm' | 'transformers';
    useCUDA?: boolean;
    modelPath?: string;
    contextSize?: number;
    batchSize?: number;
}
export declare class LocalLLMClient implements ILLMClient {
    private config;
    private logger;
    private modelProcess?;
    private isReady;
    constructor(config: LocalLLMConfig, logger: winston.Logger);
    private initialize;
    private autoDetectAndInitialize;
    private checkOllamaAvailable;
    private checkVLLMAvailable;
    private initializeOllama;
    private ensureOllamaModel;
    private initializeLlamaCpp;
    private initializeVLLM;
    private initializeTransformers;
    private downloadDefaultModel;
    private findLlamaCppServer;
    private waitForService;
    private httpRequest;
    generateResponse(prompt: string, systemPrompt?: string): Promise<string>;
    private generateWithOllama;
    private generateWithLlamaCpp;
    private generateWithVLLM;
    private generateWithTransformers;
    private waitForReady;
    validateEnvironment(): Promise<boolean>;
    getModelInfo(): Promise<{
        name: string;
        parameters?: number;
        context?: number;
    }>;
    cleanup(): void;
}
//# sourceMappingURL=local-llm-client.d.ts.map