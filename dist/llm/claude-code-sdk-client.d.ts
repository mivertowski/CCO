import { z } from 'zod';
import winston from 'winston';
import { IClaudeCodeClient, ClaudeCodeResult } from './claude-code-interface';
export declare const ClaudeCodeSDKConfigSchema: z.ZodObject<{
    apiKey: z.ZodOptional<z.ZodString>;
    projectPath: z.ZodString;
    maxTurns: z.ZodDefault<z.ZodNumber>;
    model: z.ZodDefault<z.ZodString>;
    temperature: z.ZodDefault<z.ZodNumber>;
    systemPrompt: z.ZodOptional<z.ZodString>;
    planMode: z.ZodDefault<z.ZodBoolean>;
    jsonMode: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    model: string;
    temperature: number;
    projectPath: string;
    maxTurns: number;
    planMode: boolean;
    jsonMode: boolean;
    apiKey?: string | undefined;
    systemPrompt?: string | undefined;
}, {
    projectPath: string;
    apiKey?: string | undefined;
    model?: string | undefined;
    temperature?: number | undefined;
    maxTurns?: number | undefined;
    systemPrompt?: string | undefined;
    planMode?: boolean | undefined;
    jsonMode?: boolean | undefined;
}>;
export type ClaudeCodeSDKConfig = z.infer<typeof ClaudeCodeSDKConfigSchema>;
export type ClaudeCodeSDKResult = ClaudeCodeResult;
export interface ExecutionContext {
    workingDirectory: string;
    environment: Record<string, string>;
    previousArtifacts: Array<{
        path: string;
        content: string;
    }>;
}
export declare class ClaudeCodeSDKClient implements IClaudeCodeClient {
    private config;
    private logger;
    private currentSession;
    constructor(config: ClaudeCodeSDKConfig, logger: winston.Logger);
    execute(task: string, context?: ExecutionContext): Promise<ClaudeCodeSDKResult>;
    validateEnvironment(): Promise<boolean>;
    startSession(sessionId: string): void;
    endSession(): void;
    private buildPrompt;
    private buildSystemPrompt;
    private handleMessage;
    private determineFileType;
    private calculateCost;
    updateConfig(config: Partial<ClaudeCodeSDKConfig>): void;
    getConfig(): ClaudeCodeSDKConfig;
}
//# sourceMappingURL=claude-code-sdk-client.d.ts.map