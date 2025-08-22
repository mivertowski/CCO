import { Octokit } from '@octokit/rest';
import { z } from 'zod';
import winston from 'winston';
import * as child_process from 'child_process';
import { promisify } from 'util';

const exec = promisify(child_process.exec);

export const GitHubConfigSchema = z.object({
  token: z.string().optional(),
  owner: z.string(),
  repo: z.string(),
  baseUrl: z.string().optional(),
});

export type GitHubConfig = z.infer<typeof GitHubConfigSchema>;

export interface PullRequestOptions {
  title: string;
  body: string;
  head: string;
  base?: string;
  draft?: boolean;
  labels?: string[];
  assignees?: string[];
  reviewers?: string[];
  teamReviewers?: string[];
}

export interface IssueData {
  number: number;
  title: string;
  body: string;
  state: string;
  labels: Array<{ name: string }>;
  user: { login: string };
  created_at: string;
  html_url: string;
}

export class GitHubClient {
  private octokit: Octokit | null = null;
  private config: GitHubConfig;
  private logger: winston.Logger;
  private useGHCLI: boolean = false;

  constructor(config: GitHubConfig, logger: winston.Logger) {
    this.config = GitHubConfigSchema.parse(config);
    this.logger = logger;

    // Try to use GitHub token if available
    if (this.config.token) {
      this.octokit = new Octokit({
        auth: this.config.token,
        baseUrl: this.config.baseUrl,
      });
    } else {
      // Fall back to gh CLI if available
      this.useGHCLI = true;
      this.logger.info('Using GitHub CLI for GitHub operations');
    }
  }

  async createPullRequest(options: PullRequestOptions): Promise<{ number: number; html_url: string }> {
    try {
      if (this.useGHCLI) {
        return await this.createPRWithCLI(options);
      }

      if (!this.octokit) {
        throw new Error('GitHub client not initialized');
      }

      const { data } = await this.octokit.pulls.create({
        owner: this.config.owner,
        repo: this.config.repo,
        title: options.title,
        body: options.body,
        head: options.head,
        base: options.base || 'main',
        draft: options.draft || false,
      });

      // Add labels if specified
      if (options.labels && options.labels.length > 0) {
        await this.octokit.issues.addLabels({
          owner: this.config.owner,
          repo: this.config.repo,
          issue_number: data.number,
          labels: options.labels,
        });
      }

      // Request reviews if specified
      if (options.reviewers || options.teamReviewers) {
        await this.octokit.pulls.requestReviewers({
          owner: this.config.owner,
          repo: this.config.repo,
          pull_number: data.number,
          reviewers: options.reviewers,
          team_reviewers: options.teamReviewers,
        });
      }

      this.logger.info('Created pull request', {
        number: data.number,
        url: data.html_url,
      });

      return {
        number: data.number,
        html_url: data.html_url,
      };
    } catch (error) {
      this.logger.error('Failed to create pull request', { error });
      throw error;
    }
  }

  private async createPRWithCLI(options: PullRequestOptions): Promise<{ number: number; html_url: string }> {
    try {
      // Create PR using gh CLI
      const labels = options.labels ? `--label "${options.labels.join(',')}"` : '';
      const reviewers = options.reviewers ? `--reviewer "${options.reviewers.join(',')}"` : '';
      
      const command = `gh pr create --title "${options.title}" --body "${options.body.replace(/"/g, '\\"')}" --head "${options.head}" --base "${options.base || 'main'}" ${labels} ${reviewers}`;
      
      const { stdout } = await exec(command);
      
      // Extract PR URL from output
      const urlMatch = stdout.match(/https:\/\/github\.com\/[^\s]+/);
      const numberMatch = stdout.match(/\/pull\/(\d+)/);
      
      if (!urlMatch || !numberMatch) {
        throw new Error('Failed to parse PR creation output');
      }

      return {
        number: parseInt(numberMatch[1]),
        html_url: urlMatch[0],
      };
    } catch (error) {
      this.logger.error('Failed to create PR with gh CLI', { error });
      throw error;
    }
  }

  async listIssues(options?: { 
    state?: 'open' | 'closed' | 'all';
    labels?: string[];
    sort?: 'created' | 'updated' | 'comments';
    direction?: 'asc' | 'desc';
    limit?: number;
  }): Promise<IssueData[]> {
    try {
      const state = options?.state || 'open';
      const sort = options?.sort || 'created';
      const direction = options?.direction || 'desc';
      const limit = options?.limit || 30;

      if (this.useGHCLI) {
        let cmd = `gh issue list --repo ${this.config.owner}/${this.config.repo} --json number,title,body,state,labels,author,createdAt,url --limit ${limit}`;
        
        if (state !== 'all') {
          cmd += ` --state ${state}`;
        }
        
        if (options?.labels && options.labels.length > 0) {
          cmd += ` --label ${options.labels.join(',')}`;
        }
        
        const { stdout } = await exec(cmd);
        const issues = JSON.parse(stdout);
        
        return issues.map((issue: any) => ({
          number: issue.number,
          title: issue.title,
          body: issue.body || '',
          state: issue.state,
          labels: issue.labels.map((l: any) => ({ name: l.name })),
          user: { login: issue.author?.login || 'unknown' },
          created_at: issue.createdAt,
          html_url: issue.url,
        }));
      }

      if (!this.octokit) {
        throw new Error('GitHub client not initialized');
      }

      const { data } = await this.octokit.issues.listForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        state,
        labels: options?.labels?.join(','),
        sort,
        direction,
        per_page: limit,
      });

      return data.map((issue) => ({
        number: issue.number,
        title: issue.title,
        body: issue.body || '',
        state: issue.state,
        labels: issue.labels.map((l: any) => ({ name: typeof l === 'string' ? l : l.name })),
        user: { login: issue.user?.login || 'unknown' },
        created_at: issue.created_at,
        html_url: issue.html_url,
      }));
    } catch (error) {
      this.logger.error('Failed to list issues', { error });
      throw error;
    }
  }

  async getIssue(issueNumber: number): Promise<IssueData> {
    try {
      if (this.useGHCLI) {
        const { stdout } = await exec(`gh issue view ${issueNumber} --json number,title,body,state,labels,author,createdAt,url`);
        const data = JSON.parse(stdout);
        
        return {
          number: data.number,
          title: data.title,
          body: data.body,
          state: data.state,
          labels: data.labels.map((l: any) => ({ name: l.name })),
          user: { login: data.author.login },
          created_at: data.createdAt,
          html_url: data.url,
        };
      }

      if (!this.octokit) {
        throw new Error('GitHub client not initialized');
      }

      const { data } = await this.octokit.issues.get({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
      });

      return {
        number: data.number,
        title: data.title,
        body: data.body || '',
        state: data.state,
        labels: data.labels.map((l: any) => ({ name: typeof l === 'string' ? l : l.name })),
        user: { login: data.user?.login || 'unknown' },
        created_at: data.created_at,
        html_url: data.html_url,
      };
    } catch (error) {
      this.logger.error('Failed to get issue', { error, issueNumber });
      throw error;
    }
  }

  async createIssueComment(issueNumber: number, body: string): Promise<void> {
    try {
      if (this.useGHCLI) {
        await exec(`gh issue comment ${issueNumber} --body "${body.replace(/"/g, '\\"')}"`);
        return;
      }

      if (!this.octokit) {
        throw new Error('GitHub client not initialized');
      }

      await this.octokit.issues.createComment({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        body,
      });

      this.logger.info('Created issue comment', { issueNumber });
    } catch (error) {
      this.logger.error('Failed to create issue comment', { error, issueNumber });
      throw error;
    }
  }

  async listLabels(): Promise<string[]> {
    try {
      if (this.useGHCLI) {
        const { stdout } = await exec(`gh label list --json name`);
        const labels = JSON.parse(stdout);
        return labels.map((l: any) => l.name);
      }

      if (!this.octokit) {
        throw new Error('GitHub client not initialized');
      }

      const { data } = await this.octokit.issues.listLabelsForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        per_page: 100,
      });

      return data.map(l => l.name);
    } catch (error) {
      this.logger.error('Failed to list labels', { error });
      return [];
    }
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await exec('git branch --show-current');
      return stdout.trim();
    } catch (error) {
      this.logger.error('Failed to get current branch', { error });
      return 'main';
    }
  }

  async createBranch(branchName: string, baseBranch: string = 'main'): Promise<void> {
    try {
      await exec(`git checkout -b ${branchName} origin/${baseBranch}`);
      this.logger.info('Created branch', { branchName, baseBranch });
    } catch (error) {
      // Branch might already exist
      try {
        await exec(`git checkout ${branchName}`);
        this.logger.info('Switched to existing branch', { branchName });
      } catch (switchError) {
        this.logger.error('Failed to create or switch branch', { error, switchError });
        throw error;
      }
    }
  }

  async pushBranch(branchName: string): Promise<void> {
    try {
      await exec(`git push -u origin ${branchName}`);
      this.logger.info('Pushed branch', { branchName });
    } catch (error) {
      this.logger.error('Failed to push branch', { error, branchName });
      throw error;
    }
  }
}