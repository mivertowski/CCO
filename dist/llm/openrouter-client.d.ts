import { z } from 'zod';
import { TokenMetrics } from '../models/metrics';
import winston from 'winston';
export declare const OpenRouterConfigSchema: z.ZodObject<{
    apiKey: z.ZodString;
    model: z.ZodDefault<z.ZodString>;
    temperature: z.ZodDefault<z.ZodNumber>;
    maxTokens: z.ZodDefault<z.ZodNumber>;
    baseURL: z.ZodDefault<z.ZodString>;
    retryAttempts: z.ZodDefault<z.ZodNumber>;
    retryDelay: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
    baseURL: string;
    retryAttempts: number;
    retryDelay: number;
}, {
    apiKey: string;
    model?: string | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
    baseURL?: string | undefined;
    retryAttempts?: number | undefined;
    retryDelay?: number | undefined;
}>;
export type OpenRouterConfig = z.infer<typeof OpenRouterConfigSchema>;
export interface ManagerResponse {
    content: string;
    tokenUsage: TokenMetrics;
    model: string;
    finishReason?: string;
}
export declare class OpenRouterClient {
    private client;
    private config;
    private logger;
    constructor(config: OpenRouterConfig, logger: winston.Logger);
    sendMessage(systemPrompt: string, userMessage: string, context?: Record<string, any>): Promise<ManagerResponse>;
    streamMessage(systemPrompt: string, userMessage: string, onChunk: (chunk: string) => void): Promise<ManagerResponse>;
    private calculateCost;
    private estimateTokens;
    private isRateLimitError;
    private isRetryableError;
    private delay;
    updateConfig(config: Partial<OpenRouterConfig>): void;
    getConfig(): OpenRouterConfig;
}
//# sourceMappingURL=openrouter-client.d.ts.map