import { z } from 'zod';
import winston from 'winston';
export declare const GitHubConfigSchema: z.ZodObject<{
    token: z.ZodOptional<z.ZodString>;
    owner: z.ZodString;
    repo: z.ZodString;
    baseUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    owner: string;
    repo: string;
    token?: string | undefined;
    baseUrl?: string | undefined;
}, {
    owner: string;
    repo: string;
    token?: string | undefined;
    baseUrl?: string | undefined;
}>;
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
    labels: Array<{
        name: string;
    }>;
    user: {
        login: string;
    };
    created_at: string;
    html_url: string;
}
export declare class GitHubClient {
    private octokit;
    private config;
    private logger;
    private useGHCLI;
    constructor(config: GitHubConfig, logger: winston.Logger);
    createPullRequest(options: PullRequestOptions): Promise<{
        number: number;
        html_url: string;
    }>;
    private createPRWithCLI;
    listIssues(options?: {
        state?: 'open' | 'closed' | 'all';
        labels?: string[];
        sort?: 'created' | 'updated' | 'comments';
        direction?: 'asc' | 'desc';
        limit?: number;
    }): Promise<IssueData[]>;
    getIssue(issueNumber: number): Promise<IssueData>;
    createIssueComment(issueNumber: number, body: string): Promise<void>;
    listLabels(): Promise<string[]>;
    getCurrentBranch(): Promise<string>;
    createBranch(branchName: string, baseBranch?: string): Promise<void>;
    pushBranch(branchName: string): Promise<void>;
}
//# sourceMappingURL=github-client.d.ts.map