import { Mission } from '../../models/mission';
import { GitHubClient } from './github-client';
import winston from 'winston';
export declare class GitHubIssueParser {
    private githubClient;
    private logger;
    constructor(githubClient: GitHubClient, logger: winston.Logger);
    parseIssueToMission(issueNumber: number): Promise<Mission>;
    private extractCheckboxes;
    private isMetaCheckbox;
    private extractYamlConfig;
    private extractDescription;
    private _extractPriority;
    private generateDefaultDoD;
    createProgressComment(issueNumber: number, mission: Mission, progress: number): Promise<void>;
    private generateProgressBar;
}
//# sourceMappingURL=issue-parser.d.ts.map