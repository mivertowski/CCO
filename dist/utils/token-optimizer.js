"use strict";
/**
 * Token optimization utilities to reduce API costs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextManager = exports.TokenEstimator = exports.TokenOptimizer = void 0;
const DefaultStrategy = {
    maxPromptLength: 4000,
    maxContextWindow: 100000,
    compressionRatio: 0.7,
    cacheEnabled: true,
    cacheTTL: 3600, // 1 hour
};
class TokenOptimizer {
    strategy;
    cache;
    tokenEstimator;
    constructor(strategy = {}) {
        this.strategy = { ...DefaultStrategy, ...strategy };
        this.cache = new Map();
        this.tokenEstimator = new TokenEstimator();
    }
    /**
     * Optimize a prompt by removing redundant information
     */
    optimizePrompt(prompt, context) {
        // Remove excessive whitespace
        let optimized = this.removeExcessiveWhitespace(prompt);
        // Compress context if provided
        if (context) {
            context = this.compressContext(context);
            optimized = `${context}\n\n${optimized}`;
        }
        // Truncate if too long
        if (this.tokenEstimator.estimate(optimized) > this.strategy.maxPromptLength) {
            optimized = this.intelligentTruncate(optimized, this.strategy.maxPromptLength);
        }
        return optimized;
    }
    /**
     * Compress context by removing redundant information
     */
    compressContext(context) {
        // Check cache first
        const cacheKey = this.hashString(context);
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        let compressed = context;
        // Remove code comments (keep docstrings)
        compressed = this.removeInlineComments(compressed);
        // Remove empty lines
        compressed = compressed.split('\n')
            .filter(line => line.trim().length > 0)
            .join('\n');
        // Compress repeated patterns
        compressed = this.compressRepeatedPatterns(compressed);
        // Summarize long lists
        compressed = this.summarizeLongLists(compressed);
        // Cache result
        this.addToCache(cacheKey, compressed);
        return compressed;
    }
    /**
     * Intelligently truncate text while preserving meaning
     */
    intelligentTruncate(text, maxTokens) {
        const lines = text.split('\n');
        const important = [];
        const middle = [];
        const less = [];
        // Categorize lines by importance
        for (const line of lines) {
            if (this.isImportantLine(line)) {
                important.push(line);
            }
            else if (this.isModeratelyImportant(line)) {
                middle.push(line);
            }
            else {
                less.push(line);
            }
        }
        // Build result prioritizing important content
        let result = important.join('\n');
        let currentTokens = this.tokenEstimator.estimate(result);
        // Add moderately important content if space allows
        for (const line of middle) {
            const lineTokens = this.tokenEstimator.estimate(line);
            if (currentTokens + lineTokens < maxTokens) {
                result += '\n' + line;
                currentTokens += lineTokens;
            }
        }
        // Add less important content if still space
        for (const line of less) {
            const lineTokens = this.tokenEstimator.estimate(line);
            if (currentTokens + lineTokens < maxTokens) {
                result += '\n' + line;
                currentTokens += lineTokens;
            }
            else {
                break;
            }
        }
        return result + '\n[Content truncated for token limit]';
    }
    /**
     * Remove excessive whitespace while preserving structure
     */
    removeExcessiveWhitespace(text) {
        return text
            .split('\n')
            .map(line => line.trimEnd())
            .join('\n')
            .replace(/\n{3,}/g, '\n\n');
    }
    /**
     * Remove inline comments but keep docstrings
     */
    removeInlineComments(text) {
        // Remove single-line comments
        text = text.replace(/\/\/.*$/gm, '');
        text = text.replace(/#.*$/gm, '');
        // Remove multi-line comments but keep docstrings
        text = text.replace(/\/\*[\s\S]*?\*\//g, (match) => {
            if (match.includes('@') || match.includes('*')) {
                // Likely a docstring, keep it but compress
                return match.replace(/\s+/g, ' ').trim();
            }
            return '';
        });
        return text;
    }
    /**
     * Compress repeated patterns in code
     */
    compressRepeatedPatterns(text) {
        // Find repeated imports
        const imports = text.match(/^import .*/gm) || [];
        if (imports.length > 5) {
            const uniqueImports = [...new Set(imports)];
            text = text.replace(/^import .*/gm, '');
            text = uniqueImports.join('\n') + '\n' + text;
        }
        // Compress repeated similar lines
        const lines = text.split('\n');
        const compressed = [];
        let lastPattern = '';
        let repeatCount = 0;
        for (const line of lines) {
            const pattern = this.getLinePattern(line);
            if (pattern === lastPattern && pattern !== '') {
                repeatCount++;
                if (repeatCount === 2) {
                    compressed.push(`[... ${repeatCount} similar lines ...]`);
                }
                else if (repeatCount > 2) {
                    compressed[compressed.length - 1] = `[... ${repeatCount} similar lines ...]`;
                }
            }
            else {
                compressed.push(line);
                lastPattern = pattern;
                repeatCount = 1;
            }
        }
        return compressed.join('\n');
    }
    /**
     * Summarize long lists or arrays
     */
    summarizeLongLists(text) {
        // Summarize long arrays
        text = text.replace(/\[[\s\S]{500,}?\]/g, (match) => {
            const items = match.match(/[^,\[\]]+/g) || [];
            return `[... ${items.length} items ...]`;
        });
        // Summarize long objects
        text = text.replace(/\{[\s\S]{500,}?\}/g, (match) => {
            const props = match.match(/\w+:/g) || [];
            return `{ ... ${props.length} properties ... }`;
        });
        return text;
    }
    /**
     * Determine if a line is important
     */
    isImportantLine(line) {
        const importantPatterns = [
            /^(class|function|def|interface|type|export)/,
            /^(error|warning|critical)/i,
            /TODO|FIXME|IMPORTANT/,
            /definition.of.done/i,
            /mission|objective|goal/i,
        ];
        return importantPatterns.some(pattern => pattern.test(line));
    }
    /**
     * Determine if a line is moderately important
     */
    isModeratelyImportant(line) {
        const moderatePatterns = [
            /^(const|let|var|import|export)/,
            /^(if|else|for|while|switch)/,
            /return|throw/,
        ];
        return moderatePatterns.some(pattern => pattern.test(line));
    }
    /**
     * Get pattern signature for a line
     */
    getLinePattern(line) {
        // Remove specific values, keep structure
        return line
            .replace(/"[^"]*"/g, '""')
            .replace(/'[^']*'/g, "''")
            .replace(/\d+/g, '0')
            .replace(/\b\w{20,}\b/g, 'LONG_ID');
    }
    /**
     * Cache management
     */
    addToCache(key, content) {
        if (!this.strategy.cacheEnabled)
            return;
        this.cache.set(key, {
            content,
            timestamp: Date.now(),
        });
        // Clean old entries
        this.cleanCache();
    }
    getFromCache(key) {
        if (!this.strategy.cacheEnabled)
            return null;
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        const age = (Date.now() - entry.timestamp) / 1000;
        if (age > this.strategy.cacheTTL) {
            this.cache.delete(key);
            return null;
        }
        return entry.content;
    }
    cleanCache() {
        const now = Date.now();
        const ttlMs = this.strategy.cacheTTL * 1000;
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > ttlMs) {
                this.cache.delete(key);
            }
        }
    }
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
}
exports.TokenOptimizer = TokenOptimizer;
/**
 * Estimate token count for text
 */
class TokenEstimator {
    avgCharsPerToken = 4; // Approximate for English text
    estimate(text) {
        // Simple estimation based on character count
        // More accurate would use tiktoken or similar
        const charCount = text.length;
        const wordCount = text.split(/\s+/).length;
        // Use combination of char and word count for better estimate
        const charEstimate = charCount / this.avgCharsPerToken;
        const wordEstimate = wordCount * 1.3; // Words are roughly 1.3 tokens
        // Return average of both estimates
        return Math.ceil((charEstimate + wordEstimate) / 2);
    }
    /**
     * Calculate cost based on token usage and model
     */
    calculateCost(usage, model) {
        const pricing = {
            'claude-3-opus': { input: 0.015, output: 0.075 },
            'claude-3-sonnet': { input: 0.003, output: 0.015 },
            'claude-3-haiku': { input: 0.00025, output: 0.00125 },
            'gpt-4': { input: 0.03, output: 0.06 },
            'gpt-4o': { input: 0.005, output: 0.015 },
            'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
            'default': { input: 0.001, output: 0.002 },
        };
        const modelPricing = pricing[model] || pricing.default;
        return ((usage.promptTokens / 1000) * modelPricing.input +
            (usage.completionTokens / 1000) * modelPricing.output);
    }
}
exports.TokenEstimator = TokenEstimator;
/**
 * Context manager for maintaining conversation context efficiently
 */
class ContextManager {
    maxContextSize;
    context = [];
    priorities = new Map();
    constructor(maxContextSize = 10000) {
        this.maxContextSize = maxContextSize;
    }
    addContext(content, priority = 5) {
        const index = this.context.length;
        this.context.push(content);
        this.priorities.set(index, priority);
        this.pruneIfNeeded();
    }
    getContext() {
        return this.context.join('\n\n');
    }
    pruneIfNeeded() {
        const estimator = new TokenEstimator();
        let totalTokens = estimator.estimate(this.getContext());
        while (totalTokens > this.maxContextSize && this.context.length > 1) {
            // Remove lowest priority item
            let lowestPriority = 10;
            let lowestIndex = -1;
            for (const [index, priority] of this.priorities.entries()) {
                if (priority < lowestPriority) {
                    lowestPriority = priority;
                    lowestIndex = index;
                }
            }
            if (lowestIndex >= 0) {
                this.context.splice(lowestIndex, 1);
                this.priorities.delete(lowestIndex);
                // Reindex priorities
                const newPriorities = new Map();
                for (const [index, priority] of this.priorities.entries()) {
                    if (index > lowestIndex) {
                        newPriorities.set(index - 1, priority);
                    }
                    else {
                        newPriorities.set(index, priority);
                    }
                }
                this.priorities = newPriorities;
            }
            totalTokens = estimator.estimate(this.getContext());
        }
    }
}
exports.ContextManager = ContextManager;
//# sourceMappingURL=token-optimizer.js.map