import { z } from 'zod';
export declare const TokenMetricsSchema: z.ZodObject<{
    promptTokens: z.ZodNumber;
    completionTokens: z.ZodNumber;
    totalTokens: z.ZodNumber;
    estimatedCost: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
}, {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
}>;
export type TokenMetrics = z.infer<typeof TokenMetricsSchema>;
export declare const OrchestrationMetricsSchema: z.ZodObject<{
    totalIterations: z.ZodNumber;
    dodCriteriaCompleted: z.ZodNumber;
    dodCriteriaTotal: z.ZodNumber;
    completionPercentage: z.ZodNumber;
    tokenUsage: z.ZodObject<{
        promptTokens: z.ZodNumber;
        completionTokens: z.ZodNumber;
        totalTokens: z.ZodNumber;
        estimatedCost: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        estimatedCost: number;
    }, {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        estimatedCost: number;
    }>;
    apiCallsTotal: z.ZodNumber;
    sessionCount: z.ZodNumber;
    errorRecoveries: z.ZodNumber;
    successfulActions: z.ZodNumber;
    failedActions: z.ZodNumber;
    filesModified: z.ZodNumber;
    linesOfCodeAdded: z.ZodNumber;
    testsCreated: z.ZodNumber;
    estimatedCost: z.ZodNumber;
    costPerCriteria: z.ZodNumber;
    startTime: z.ZodDate;
    currentTime: z.ZodDate;
    estimatedCompletionTime: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    estimatedCost: number;
    totalIterations: number;
    dodCriteriaCompleted: number;
    dodCriteriaTotal: number;
    completionPercentage: number;
    tokenUsage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        estimatedCost: number;
    };
    apiCallsTotal: number;
    sessionCount: number;
    errorRecoveries: number;
    successfulActions: number;
    failedActions: number;
    filesModified: number;
    linesOfCodeAdded: number;
    testsCreated: number;
    costPerCriteria: number;
    startTime: Date;
    currentTime: Date;
    estimatedCompletionTime?: Date | undefined;
}, {
    estimatedCost: number;
    totalIterations: number;
    dodCriteriaCompleted: number;
    dodCriteriaTotal: number;
    completionPercentage: number;
    tokenUsage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        estimatedCost: number;
    };
    apiCallsTotal: number;
    sessionCount: number;
    errorRecoveries: number;
    successfulActions: number;
    failedActions: number;
    filesModified: number;
    linesOfCodeAdded: number;
    testsCreated: number;
    costPerCriteria: number;
    startTime: Date;
    currentTime: Date;
    estimatedCompletionTime?: Date | undefined;
}>;
export type OrchestrationMetrics = z.infer<typeof OrchestrationMetricsSchema>;
export interface MetricsCollector {
    recordTokenUsage(usage: Partial<TokenMetrics>): void;
    recordApiCall(service: string, success: boolean): void;
    recordAction(action: string, success: boolean): void;
    recordError(error: Error): void;
    recordFileChange(path: string, linesAdded: number, linesRemoved: number): void;
    getMetrics(): OrchestrationMetrics;
    reset(): void;
}
export interface MetricSnapshot {
    timestamp: Date;
    metrics: OrchestrationMetrics;
    sessionId: string;
    missionId: string;
}
//# sourceMappingURL=metrics.d.ts.map