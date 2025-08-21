import { z } from 'zod';
import winston from 'winston';
import { IClaudeCodeClient, ClaudeCodeResult as IClaudeCodeResult } from './claude-code-interface';
export declare const ClaudeCodeConfigSchema: z.ZodObject<{
    apiKey: z.ZodOptional<z.ZodString>;
    useSubscription: z.ZodDefault<z.ZodBoolean>;
    projectPath: z.ZodString;
    maxIterations: z.ZodDefault<z.ZodNumber>;
    timeoutMs: z.ZodDefault<z.ZodNumber>;
    contextWindow: z.ZodDefault<z.ZodNumber>;
    model: z.ZodDefault<z.ZodString>;
    temperature: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    model: string;
    temperature: number;
    useSubscription: boolean;
    projectPath: string;
    maxIterations: number;
    timeoutMs: number;
    contextWindow: number;
    apiKey?: string | undefined;
}, {
    projectPath: string;
    apiKey?: string | undefined;
    model?: string | undefined;
    temperature?: number | undefined;
    useSubscription?: boolean | undefined;
    maxIterations?: number | undefined;
    timeoutMs?: number | undefined;
    contextWindow?: number | undefined;
}>;
export type ClaudeCodeConfig = z.infer<typeof ClaudeCodeConfigSchema>;
export type ClaudeCodeResult = IClaudeCodeResult;
export interface ExecutionContext {
    workingDirectory: string;
    environment: Record<string, string>;
    previousArtifacts: Array<{
        path: string;
        content: string;
    }>;
}
export declare class ClaudeCodeClient implements IClaudeCodeClient {
    private client;
    private config;
    private logger;
    private currentSession;
    constructor(config: ClaudeCodeConfig, logger: winston.Logger);
    execute(task: string, context?: ExecutionContext): Promise<ClaudeCodeResult>;
    validateEnvironment(): Promise<boolean>;
    startSession(sessionId: string): void;
    endSession(): void;
    private buildSystemPrompt;
    private buildUserPrompt;
    private parseResponse;
    private extractArtifacts;
    private determineFileType;
    private detectSessionEnd;
    private calculateCost;
    updateConfig(config: Partial<ClaudeCodeConfig>): void;
    getConfig(): ClaudeCodeConfig;
}
//# sourceMappingURL=claude-code-client.d.ts.map