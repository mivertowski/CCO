import winston from 'winston';
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
export declare class SemanticCommitGenerator {
    private logger;
    constructor(logger: winston.Logger);
    generateAndCommit(options: CommitOptions): Promise<string>;
    formatCommitMessage(options: CommitOptions): string;
    analyzeChangesForCommit(): Promise<CommitOptions>;
    private detectCommitType;
    private detectScope;
    private generateDescription;
    private generateBody;
    createBatchCommits(files: string[], commitsPerBatch?: number): Promise<void>;
}
//# sourceMappingURL=semantic-commit.d.ts.map