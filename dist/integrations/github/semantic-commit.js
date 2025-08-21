"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticCommitGenerator = void 0;
const util_1 = require("util");
const child_process = __importStar(require("child_process"));
const exec = (0, util_1.promisify)(child_process.exec);
class SemanticCommitGenerator {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    async generateAndCommit(options) {
        const message = this.formatCommitMessage(options);
        try {
            // Stage all changes
            await exec('git add -A');
            // Create commit
            const { stdout } = await exec(`git commit -m "${message.replace(/"/g, '\\"')}"`);
            this.logger.info('Created semantic commit', {
                type: options.type,
                scope: options.scope,
                description: options.description,
            });
            return stdout;
        }
        catch (error) {
            this.logger.error('Failed to create commit', { error, options });
            throw error;
        }
    }
    formatCommitMessage(options) {
        // Build header
        const scope = options.scope ? `(${options.scope})` : '';
        const breaking = options.breaking ? '!' : '';
        const header = `${options.type}${scope}${breaking}: ${options.description}`;
        // Build body
        const bodyParts = [];
        if (options.body) {
            bodyParts.push(options.body);
        }
        if (options.missionId) {
            bodyParts.push(`Mission: ${options.missionId}`);
        }
        if (options.breaking) {
            bodyParts.push(`BREAKING CHANGE: ${options.body || options.description}`);
        }
        if (options.issues && options.issues.length > 0) {
            bodyParts.push(`Fixes: ${options.issues.map(n => `#${n}`).join(', ')}`);
        }
        if (options.coAuthored) {
            bodyParts.push('\n🤖 Generated with Claude Code\n\nCo-Authored-By: Claude <noreply@anthropic.com>');
        }
        // Combine parts
        if (bodyParts.length > 0) {
            return `${header}\n\n${bodyParts.join('\n\n')}`;
        }
        return header;
    }
    async analyzeChangesForCommit() {
        try {
            // Get diff stats
            const { stdout: diffStat } = await exec('git diff --cached --stat');
            const { stdout: diffContent } = await exec('git diff --cached');
            // Analyze changes to determine commit type
            const type = this.detectCommitType(diffContent, diffStat);
            const scope = this.detectScope(diffStat);
            const description = await this.generateDescription(type, scope, diffContent);
            return {
                type,
                scope,
                description,
                body: this.generateBody(diffStat),
                coAuthored: true,
            };
        }
        catch (error) {
            this.logger.error('Failed to analyze changes', { error });
            // Return a default commit
            return {
                type: 'chore',
                description: 'Update files',
                coAuthored: true,
            };
        }
    }
    detectCommitType(diff, stats) {
        // Check for test files
        if (stats.includes('.test.') || stats.includes('.spec.') || stats.includes('__tests__')) {
            return 'test';
        }
        // Check for documentation
        if (stats.includes('.md') || stats.includes('docs/')) {
            return 'docs';
        }
        // Check for configuration files
        if (stats.includes('package.json') || stats.includes('tsconfig') || stats.includes('.yaml') || stats.includes('.yml')) {
            return 'chore';
        }
        // Check for CI/CD files
        if (stats.includes('.github/workflows') || stats.includes('.gitlab-ci')) {
            return 'ci';
        }
        // Analyze diff content for patterns
        if (diff.includes('fix') || diff.includes('bug') || diff.includes('error')) {
            return 'fix';
        }
        if (diff.includes('refactor') || diff.includes('restructure')) {
            return 'refactor';
        }
        if (diff.includes('performance') || diff.includes('optimize')) {
            return 'perf';
        }
        // Default to feat for new functionality
        return 'feat';
    }
    detectScope(stats) {
        // Extract the most common directory from changed files
        const lines = stats.split('\n');
        const directories = new Map();
        for (const line of lines) {
            const match = line.match(/^\s*([^/]+\/[^/]+)/);
            if (match) {
                const dir = match[1].split('/')[0];
                directories.set(dir, (directories.get(dir) || 0) + 1);
            }
        }
        // Find the most common directory
        let maxCount = 0;
        let scope;
        for (const [dir, count] of directories) {
            if (count > maxCount) {
                maxCount = count;
                scope = dir;
            }
        }
        // Clean up common directory names
        if (scope === 'src') {
            // Look for subdirectory
            for (const line of lines) {
                const match = line.match(/^\s*src\/([^/]+)/);
                if (match) {
                    scope = match[1];
                    break;
                }
            }
        }
        return scope;
    }
    async generateDescription(type, scope, diff) {
        const typeDescriptions = {
            feat: 'add',
            fix: 'fix',
            docs: 'update',
            style: 'format',
            refactor: 'refactor',
            perf: 'optimize',
            test: 'add tests for',
            chore: 'update',
            build: 'update',
            ci: 'update',
        };
        const action = typeDescriptions[type] || 'update';
        const target = scope || 'project';
        // Try to be more specific based on the diff
        if (diff.includes('implement')) {
            return `implement ${target} functionality`;
        }
        if (diff.includes('integrate')) {
            return `integrate ${target} with system`;
        }
        return `${action} ${target}`;
    }
    generateBody(stats) {
        const lines = stats.split('\n').filter(l => l.trim());
        const fileCount = lines.length - 1; // Exclude summary line
        if (fileCount === 0) {
            return '';
        }
        const changes = [];
        for (const line of lines) {
            if (line.includes('|')) {
                const parts = line.split('|');
                if (parts.length >= 2) {
                    const file = parts[0].trim();
                    const change = parts[1].trim();
                    if (file && !file.includes('files changed')) {
                        changes.push(`- ${file}: ${change}`);
                    }
                }
            }
        }
        if (changes.length > 0 && changes.length <= 10) {
            return changes.join('\n');
        }
        return `Modified ${fileCount} files`;
    }
    async createBatchCommits(files, commitsPerBatch = 5) {
        const batches = [];
        for (let i = 0; i < files.length; i += commitsPerBatch) {
            batches.push(files.slice(i, i + commitsPerBatch));
        }
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            // Stage files in this batch
            for (const file of batch) {
                await exec(`git add "${file}"`);
            }
            // Analyze and commit
            const options = await this.analyzeChangesForCommit();
            options.description = `${options.description} (batch ${i + 1}/${batches.length})`;
            await this.generateAndCommit(options);
        }
    }
}
exports.SemanticCommitGenerator = SemanticCommitGenerator;
//# sourceMappingURL=semantic-commit.js.map