"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestrationMetricsSchema = exports.TokenMetricsSchema = void 0;
const zod_1 = require("zod");
exports.TokenMetricsSchema = zod_1.z.object({
    promptTokens: zod_1.z.number(),
    completionTokens: zod_1.z.number(),
    totalTokens: zod_1.z.number(),
    estimatedCost: zod_1.z.number()
});
exports.OrchestrationMetricsSchema = zod_1.z.object({
    totalIterations: zod_1.z.number(),
    dodCriteriaCompleted: zod_1.z.number(),
    dodCriteriaTotal: zod_1.z.number(),
    completionPercentage: zod_1.z.number(),
    tokenUsage: exports.TokenMetricsSchema,
    apiCallsTotal: zod_1.z.number(),
    sessionCount: zod_1.z.number(),
    errorRecoveries: zod_1.z.number(),
    successfulActions: zod_1.z.number(),
    failedActions: zod_1.z.number(),
    filesModified: zod_1.z.number(),
    linesOfCodeAdded: zod_1.z.number(),
    testsCreated: zod_1.z.number(),
    estimatedCost: zod_1.z.number(),
    costPerCriteria: zod_1.z.number(),
    startTime: zod_1.z.date(),
    currentTime: zod_1.z.date(),
    estimatedCompletionTime: zod_1.z.date().optional()
});
//# sourceMappingURL=metrics.js.map