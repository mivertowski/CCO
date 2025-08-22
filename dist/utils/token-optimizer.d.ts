/**
 * Token optimization utilities to reduce API costs
 */
export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
}
export interface OptimizationStrategy {
    maxPromptLength: number;
    maxContextWindow: number;
    compressionRatio: number;
    cacheEnabled: boolean;
    cacheTTL: number;
}
export declare class TokenOptimizer {
    private strategy;
    private cache;
    private tokenEstimator;
    constructor(strategy?: Partial<OptimizationStrategy>);
    /**
     * Optimize a prompt by removing redundant information
     */
    optimizePrompt(prompt: string, context?: string): string;
    /**
     * Compress context by removing redundant information
     */
    compressContext(context: string): string;
    /**
     * Intelligently truncate text while preserving meaning
     */
    private intelligentTruncate;
    /**
     * Remove excessive whitespace while preserving structure
     */
    private removeExcessiveWhitespace;
    /**
     * Remove inline comments but keep docstrings
     */
    private removeInlineComments;
    /**
     * Compress repeated patterns in code
     */
    private compressRepeatedPatterns;
    /**
     * Summarize long lists or arrays
     */
    private summarizeLongLists;
    /**
     * Determine if a line is important
     */
    private isImportantLine;
    /**
     * Determine if a line is moderately important
     */
    private isModeratelyImportant;
    /**
     * Get pattern signature for a line
     */
    private getLinePattern;
    /**
     * Cache management
     */
    private addToCache;
    private getFromCache;
    private cleanCache;
    private hashString;
}
/**
 * Estimate token count for text
 */
export declare class TokenEstimator {
    private avgCharsPerToken;
    estimate(text: string): number;
    /**
     * Calculate cost based on token usage and model
     */
    calculateCost(usage: TokenUsage, model: string): number;
}
/**
 * Context manager for maintaining conversation context efficiently
 */
export declare class ContextManager {
    private maxContextSize;
    private context;
    private priorities;
    constructor(maxContextSize?: number);
    addContext(content: string, priority?: number): void;
    getContext(): string;
    private pruneIfNeeded;
}
//# sourceMappingURL=token-optimizer.d.ts.map