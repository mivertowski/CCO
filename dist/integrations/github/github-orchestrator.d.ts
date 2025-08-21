import { Mission } from '../../models/mission';
import { OrchestrationResult } from '../../core/orchestrator';
import winston from 'winston';
export interface GitHubOrchestrationConfig {
    owner: string;
    repo: string;
    token?: string;
    createPR?: boolean;
    semanticCommits?: boolean;
    branchStrategy?: 'feature' | 'fix' | 'chore';
    baseBranch?: string;
}
export declare class GitHubOrchestrator {
    private githubClient;
    private issueParser;
    private commitGenerator;
    private config;
    private logger;
    constructor(config: GitHubOrchestrationConfig, logger: winston.Logger);
    createMissionFromIssue(issueNumber: number): Promise<Mission>;
    createPRFromMission(mission: Mission, result: OrchestrationResult): Promise<string>;
    private generateBranchName;
    private generatePRTitle;
    private generatePRBody;
    private generateLabels;
    private groupArtifactsByType;
    private createSemanticCommits;
    private extractScope;
    private generateCommitDescription;
    private generateCommitBody;
    updateIssueProgress(issueNumber: number, mission: Mission, progress: number): Promise<void>;
}
//# sourceMappingURL=github-orchestrator.d.ts.map