import winston from 'winston';
import { promisify } from 'util';
import * as child_process from 'child_process';

const exec = promisify(child_process.exec);

export interface CommitOptions {
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'chore' | 'build' | 'ci';
  scope?: string;
  description: string;
  body?: string;
  breaking?: boolean;
  issues?: number[];
  missionId?: string;
  coAuthored?: boolean;
}

export class SemanticCommitGenerator {
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  async generateAndCommit(options: CommitOptions): Promise<string> {
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
    } catch (error) {
      this.logger.error('Failed to create commit', { error, options });
      throw error;
    }
  }

  formatCommitMessage(options: CommitOptions): string {
    // Build header
    const scope = options.scope ? `(${options.scope})` : '';
    const breaking = options.breaking ? '!' : '';
    const header = `${options.type}${scope}${breaking}: ${options.description}`;
    
    // Build body
    const bodyParts: string[] = [];
    
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

  async analyzeChangesForCommit(): Promise<CommitOptions> {
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
    } catch (error) {
      this.logger.error('Failed to analyze changes', { error });
      
      // Return a default commit
      return {
        type: 'chore',
        description: 'Update files',
        coAuthored: true,
      };
    }
  }

  private detectCommitType(diff: string, stats: string): CommitOptions['type'] {
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

  private detectScope(stats: string): string | undefined {
    // Extract the most common directory from changed files
    const lines = stats.split('\n');
    const directories = new Map<string, number>();
    
    for (const line of lines) {
      const match = line.match(/^\s*([^/]+\/[^/]+)/);
      if (match) {
        const dir = match[1].split('/')[0];
        directories.set(dir, (directories.get(dir) || 0) + 1);
      }
    }
    
    // Find the most common directory
    let maxCount = 0;
    let scope: string | undefined;
    
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

  private async generateDescription(type: string, scope: string | undefined, diff: string): Promise<string> {
    const typeDescriptions: Record<string, string> = {
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

  private generateBody(stats: string): string {
    const lines = stats.split('\n').filter(l => l.trim());
    const fileCount = lines.length - 1; // Exclude summary line
    
    if (fileCount === 0) {
      return '';
    }
    
    const changes: string[] = [];
    
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

  async createBatchCommits(files: string[], commitsPerBatch: number = 5): Promise<void> {
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