"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubOrchestrator = void 0;
const github_client_1 = require("./github-client");
const issue_parser_1 = require("./issue-parser");
const semantic_commit_1 = require("./semantic-commit");
class GitHubOrchestrator {
    githubClient;
    issueParser;
    commitGenerator;
    config;
    logger;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.githubClient = new github_client_1.GitHubClient({
            owner: config.owner,
            repo: config.repo,
            token: config.token,
        }, logger);
        this.issueParser = new issue_parser_1.GitHubIssueParser(this.githubClient, logger);
        this.commitGenerator = new semantic_commit_1.SemanticCommitGenerator(logger);
    }
    async createMissionFromIssue(issueNumber) {
        this.logger.info('Creating mission from GitHub issue', { issueNumber });
        const mission = await this.issueParser.parseIssueToMission(issueNumber);
        // Create a branch for this mission
        if (this.config.createPR) {
            const branchName = this.generateBranchName(mission);
            await this.githubClient.createBranch(branchName, this.config.baseBranch);
            mission.metadata = {
                ...mission.metadata,
                github: {
                    ...mission.metadata?.github,
                    branch: branchName,
                },
            };
        }
        return mission;
    }
    async createPRFromMission(mission, result) {
        this.logger.info('Creating PR from mission', { missionId: mission.id });
        // Generate PR body
        const prBody = this.generatePRBody(mission, result);
        // Get branch name
        const branchName = mission.metadata?.github?.branch ||
            await this.githubClient.getCurrentBranch();
        // Create semantic commits if enabled
        if (this.config.semanticCommits && result.artifacts.length > 0) {
            await this.createSemanticCommits(mission, result);
        }
        // Push branch
        await this.githubClient.pushBranch(branchName);
        // Create PR
        const prOptions = {
            title: this.generatePRTitle(mission),
            body: prBody,
            head: branchName,
            base: this.config.baseBranch || 'main',
            labels: this.generateLabels(mission),
        };
        const pr = await this.githubClient.createPullRequest(prOptions);
        // Update issue if this mission came from an issue
        if (mission.metadata?.github?.issueNumber) {
            await this.githubClient.createIssueComment(mission.metadata.github.issueNumber, `🎉 Pull request created: #${pr.number}\n${pr.html_url}`);
        }
        this.logger.info('Created pull request', {
            number: pr.number,
            url: pr.html_url,
        });
        return pr.html_url;
    }
    generateBranchName(mission) {
        const prefix = this.config.branchStrategy || 'feature';
        const issueNumber = mission.metadata?.github?.issueNumber;
        const titleSlug = mission.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 30);
        if (issueNumber) {
            return `${prefix}/issue-${issueNumber}-${titleSlug}`;
        }
        return `${prefix}/cco-${mission.id.substring(0, 8)}-${titleSlug}`;
    }
    generatePRTitle(mission) {
        const issueNumber = mission.metadata?.github?.issueNumber;
        if (issueNumber) {
            return `[#${issueNumber}] ${mission.title}`;
        }
        return `[CCO] ${mission.title}`;
    }
    generatePRBody(mission, result) {
        const issueNumber = mission.metadata?.github?.issueNumber;
        const completedDoD = mission.definitionOfDone.filter(d => d.completed);
        const metrics = result.metrics;
        let body = `## 🎯 Mission: ${mission.title}\n\n`;
        if (mission.description) {
            body += `${mission.description}\n\n`;
        }
        if (issueNumber) {
            body += `Fixes #${issueNumber}\n\n`;
        }
        body += `### 📋 Definition of Done (${completedDoD.length}/${mission.definitionOfDone.length})\n`;
        for (const dod of mission.definitionOfDone) {
            body += `- [${dod.completed ? 'x' : ' '}] ${dod.description}\n`;
        }
        body += '\n';
        body += `### 📊 Execution Metrics\n`;
        body += `- **Mission ID**: ${mission.id}\n`;
        body += `- **Completion**: ${metrics.completionPercentage}%\n`;
        body += `- **Iterations**: ${metrics.totalIterations}\n`;
        body += `- **Duration**: ${metrics.totalIterations * 2} minutes (estimate)\n`;
        body += `- **Token Usage**: ${metrics.tokenUsage.totalTokens.toLocaleString()} tokens\n`;
        body += `- **Estimated Cost**: $${metrics.estimatedCost.toFixed(2)}\n\n`;
        if (result.artifacts.length > 0) {
            body += `### 📁 Files Changed (${result.artifacts.length})\n`;
            const filesByType = this.groupArtifactsByType(result.artifacts);
            for (const [type, files] of Object.entries(filesByType)) {
                if (files.length > 0) {
                    body += `\n**${type.charAt(0).toUpperCase() + type.slice(1)}**:\n`;
                    for (const file of files.slice(0, 10)) {
                        body += `- \`${file.path}\`\n`;
                    }
                    if (files.length > 10) {
                        body += `- _...and ${files.length - 10} more_\n`;
                    }
                }
            }
            body += '\n';
        }
        body += `### 🤖 AI Summary\n`;
        body += `This pull request was automatically generated by Claude Code Orchestrator.\n\n`;
        // Add summary if it becomes available in the future
        body += '---\n';
        body += `*Generated by [Claude Code Orchestrator](https://github.com/mivertowski/cco)*\n`;
        body += `*Mission executed with ${metrics.dodCriteriaCompleted}/${metrics.dodCriteriaTotal} criteria completed*`;
        return body;
    }
    generateLabels(mission) {
        const labels = ['cco-generated'];
        // Add priority label
        if (mission.definitionOfDone.some(d => d.priority === 'critical')) {
            labels.push('priority:critical');
        }
        else if (mission.definitionOfDone.some(d => d.priority === 'high')) {
            labels.push('priority:high');
        }
        // Add type labels based on artifacts
        if (mission.metadata?.artifacts) {
            const types = new Set(mission.metadata.artifacts.map((a) => a.type));
            if (types.has('test'))
                labels.push('tests');
            if (types.has('documentation'))
                labels.push('documentation');
            if (types.has('config'))
                labels.push('configuration');
        }
        // Include original issue labels if available
        if (mission.metadata?.github?.labels) {
            labels.push(...mission.metadata.github.labels);
        }
        return [...new Set(labels)]; // Remove duplicates
    }
    groupArtifactsByType(artifacts) {
        const grouped = {
            code: [],
            test: [],
            documentation: [],
            config: [],
            other: [],
        };
        for (const artifact of artifacts) {
            const type = artifact.type || 'other';
            if (grouped[type]) {
                grouped[type].push(artifact);
            }
            else {
                grouped.other.push(artifact);
            }
        }
        return grouped;
    }
    async createSemanticCommits(mission, result) {
        this.logger.info('Creating semantic commits for mission', { missionId: mission.id });
        // Group artifacts by type for better commits
        const grouped = this.groupArtifactsByType(result.artifacts);
        for (const [type, artifacts] of Object.entries(grouped)) {
            if (artifacts.length === 0)
                continue;
            // Determine commit type based on artifact type
            let commitType = 'chore';
            if (type === 'code')
                commitType = 'feat';
            if (type === 'test')
                commitType = 'test';
            if (type === 'documentation')
                commitType = 'docs';
            if (type === 'config')
                commitType = 'chore';
            // Create commit for this group
            const options = {
                type: commitType,
                scope: this.extractScope(artifacts),
                description: this.generateCommitDescription(type, artifacts.length),
                body: this.generateCommitBody(artifacts),
                issues: mission.metadata?.github?.issueNumber ? [mission.metadata.github.issueNumber] : undefined,
                missionId: mission.id,
                coAuthored: true,
            };
            try {
                await this.commitGenerator.generateAndCommit(options);
            }
            catch (error) {
                this.logger.warn('Failed to create semantic commit', { error, type });
            }
        }
    }
    extractScope(artifacts) {
        // Find the most common directory
        const dirs = new Map();
        for (const artifact of artifacts) {
            if (artifact.path) {
                const parts = artifact.path.split('/');
                if (parts.length > 1) {
                    const dir = parts[0] === 'src' ? parts[1] : parts[0];
                    dirs.set(dir, (dirs.get(dir) || 0) + 1);
                }
            }
        }
        let maxCount = 0;
        let scope;
        for (const [dir, count] of dirs) {
            if (count > maxCount) {
                maxCount = count;
                scope = dir;
            }
        }
        return scope;
    }
    generateCommitDescription(type, count) {
        const descriptions = {
            code: 'implement core functionality',
            test: 'add test coverage',
            documentation: 'update documentation',
            config: 'update configuration',
            other: 'update project files',
        };
        const base = descriptions[type] || 'update files';
        if (count > 1) {
            return `${base} (${count} files)`;
        }
        return base;
    }
    generateCommitBody(artifacts) {
        if (artifacts.length <= 5) {
            return artifacts.map(a => `- ${a.operation || 'Update'} ${a.path}`).join('\n');
        }
        return `Modified ${artifacts.length} files in this category`;
    }
    async updateIssueProgress(issueNumber, mission, progress) {
        await this.issueParser.createProgressComment(issueNumber, mission, progress);
    }
}
exports.GitHubOrchestrator = GitHubOrchestrator;
//# sourceMappingURL=github-orchestrator.js.map