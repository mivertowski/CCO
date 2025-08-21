import { z } from 'zod';

export const TokenMetricsSchema = z.object({
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
  estimatedCost: z.number()
});

export type TokenMetrics = z.infer<typeof TokenMetricsSchema>;

export const OrchestrationMetricsSchema = z.object({
  totalIterations: z.number(),
  dodCriteriaCompleted: z.number(),
  dodCriteriaTotal: z.number(),
  completionPercentage: z.number(),
  
  tokenUsage: TokenMetricsSchema,
  apiCallsTotal: z.number(),
  sessionCount: z.number(),
  
  errorRecoveries: z.number(),
  successfulActions: z.number(),
  failedActions: z.number(),
  
  filesModified: z.number(),
  linesOfCodeAdded: z.number(),
  testsCreated: z.number(),
  
  estimatedCost: z.number(),
  costPerCriteria: z.number(),
  
  startTime: z.date(),
  currentTime: z.date(),
  estimatedCompletionTime: z.date().optional()
});

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