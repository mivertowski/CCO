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
exports.GitHubIssueParser = void 0;
const mission_1 = require("../../models/mission");
const yaml = __importStar(require("js-yaml"));
const uuid_1 = require("uuid");
class GitHubIssueParser {
    githubClient;
    logger;
    constructor(githubClient, logger) {
        this.githubClient = githubClient;
        this.logger = logger;
    }
    async parseIssueToMission(issueNumber) {
        try {
            const issue = await this.githubClient.getIssue(issueNumber);
            this.logger.info('Parsing issue to mission', {
                issueNumber,
                title: issue.title,
            });
            // Extract DoD criteria from checkboxes
            const dodCriteria = this.extractCheckboxes(issue.body);
            // Parse any YAML configuration in the issue
            const config = this.extractYamlConfig(issue.body);
            // Extract priority from labels (not used currently)
            // const priority = this.extractPriority(issue.labels);
            // Create mission - ensure DoD criteria start as incomplete
            const definitionOfDone = (dodCriteria.length > 0 ? dodCriteria : this.generateDefaultDoD(issue))
                .map(dod => ({
                ...dod,
                completed: false, // Always start as incomplete for new missions
                completedAt: undefined
            }));
            const mission = {
                id: `gh-issue-${issueNumber}-${(0, uuid_1.v4)().substring(0, 8)}`,
                title: issue.title.replace(/^\[CCO\]\s*/i, ''), // Remove [CCO] prefix if present
                description: this.extractDescription(issue.body),
                repository: process.cwd(),
                definitionOfDone,
                createdAt: new Date(issue.created_at),
                metadata: {
                    github: {
                        issueNumber,
                        issueUrl: issue.html_url,
                        author: issue.user.login,
                        labels: issue.labels.map(l => l.name),
                    },
                },
                ...config,
            };
            this.logger.info('Created mission from issue', {
                missionId: mission.id,
                dodCount: mission.definitionOfDone.length,
                dodCriteria: mission.definitionOfDone.map(d => ({
                    id: d.id,
                    completed: d.completed,
                    description: d.description.substring(0, 50)
                }))
            });
            return mission;
        }
        catch (error) {
            this.logger.error('Failed to parse issue to mission', { error, issueNumber });
            throw error;
        }
    }
    extractCheckboxes(body) {
        const checkboxRegex = /^[\s]*[-*]\s*\[([ xX])\]\s*(.+)$/gm;
        const criteria = [];
        let match;
        let index = 0;
        while ((match = checkboxRegex.exec(body)) !== null) {
            const isChecked = match[1].toLowerCase() === 'x';
            const description = match[2].trim();
            // Skip meta checkboxes (like priority selection)
            if (this.isMetaCheckbox(description)) {
                continue;
            }
            criteria.push({
                id: `dod-${index++}`,
                description,
                completed: isChecked,
                measurable: true,
                priority: mission_1.DoDPriority.MEDIUM,
            });
        }
        return criteria;
    }
    isMetaCheckbox(text) {
        const metaPatterns = [
            /^(critical|high|medium|low)$/i,
            /^(manual|on pr|on schedule|on.*label)$/i,
        ];
        return metaPatterns.some(pattern => pattern.test(text));
    }
    extractYamlConfig(body) {
        try {
            // Look for YAML code block
            const yamlMatch = body.match(/```ya?ml\n([\s\S]*?)\n```/);
            if (yamlMatch && yamlMatch[1]) {
                const config = yaml.load(yamlMatch[1]);
                this.logger.debug('Extracted YAML config from issue', { config });
                return config;
            }
        }
        catch (error) {
            this.logger.warn('Failed to parse YAML config from issue', { error });
        }
        return {};
    }
    extractDescription(body) {
        // Remove checkboxes, YAML blocks, and clean up
        let description = body
            .replace(/```ya?ml[\s\S]*?```/g, '') // Remove YAML blocks
            .replace(/^[\s]*[-*]\s*\[[ xX]\]\s*.+$/gm, '') // Remove checkboxes
            .replace(/^#+\s*.+$/gm, '') // Remove headers
            .trim();
        // Extract content between "## Mission Objective" or similar
        const objectiveMatch = description.match(/##\s*(?:Mission\s*)?Objective\s*\n([\s\S]*?)(?:\n##|$)/i);
        if (objectiveMatch) {
            description = objectiveMatch[1].trim();
        }
        // If description is still empty, use issue title
        if (!description) {
            description = `Complete the tasks defined in this issue`;
        }
        return description;
    }
    // Method kept for future use when label-based priority extraction is needed
    // @ts-ignore - Unused method kept for future implementation
    _extractPriority(labels) {
        const priorityLabels = {
            'priority:critical': mission_1.DoDPriority.CRITICAL,
            'priority:high': mission_1.DoDPriority.HIGH,
            'priority:medium': mission_1.DoDPriority.MEDIUM,
            'priority:low': mission_1.DoDPriority.LOW,
            'critical': mission_1.DoDPriority.CRITICAL,
            'high-priority': mission_1.DoDPriority.HIGH,
            'urgent': mission_1.DoDPriority.HIGH,
        };
        for (const label of labels) {
            const labelName = label.name.toLowerCase();
            for (const [key, priority] of Object.entries(priorityLabels)) {
                if (labelName === key || labelName.includes(key)) {
                    return priority;
                }
            }
        }
        return mission_1.DoDPriority.MEDIUM;
    }
    generateDefaultDoD(issue) {
        const criteria = [];
        // Generate DoD based on issue labels
        const labels = issue.labels.map(l => l.name.toLowerCase());
        if (labels.includes('bug')) {
            criteria.push({
                id: 'fix-bug',
                description: 'Fix the reported bug',
                measurable: true,
                priority: mission_1.DoDPriority.HIGH,
                completed: false,
            });
            criteria.push({
                id: 'add-tests',
                description: 'Add tests to prevent regression',
                measurable: true,
                priority: mission_1.DoDPriority.MEDIUM,
                completed: false,
            });
        }
        if (labels.includes('enhancement') || labels.includes('feature')) {
            criteria.push({
                id: 'implement-feature',
                description: 'Implement the requested feature',
                measurable: true,
                priority: mission_1.DoDPriority.HIGH,
                completed: false,
            });
            criteria.push({
                id: 'add-tests',
                description: 'Add comprehensive tests',
                measurable: true,
                priority: mission_1.DoDPriority.MEDIUM,
                completed: false,
            });
            criteria.push({
                id: 'update-docs',
                description: 'Update documentation',
                measurable: true,
                priority: mission_1.DoDPriority.LOW,
                completed: false,
            });
        }
        if (labels.includes('documentation')) {
            criteria.push({
                id: 'update-docs',
                description: 'Update or create documentation',
                measurable: true,
                priority: mission_1.DoDPriority.HIGH,
                completed: false,
            });
        }
        // If no specific labels, create generic DoD
        if (criteria.length === 0) {
            criteria.push({
                id: 'complete-task',
                description: 'Complete the task described in the issue',
                measurable: true,
                priority: mission_1.DoDPriority.HIGH,
                completed: false,
            });
        }
        return criteria;
    }
    async createProgressComment(issueNumber, mission, progress) {
        const completedCount = mission.definitionOfDone.filter(d => d.completed).length;
        const totalCount = mission.definitionOfDone.length;
        const progressBar = this.generateProgressBar(progress);
        const comment = `## 🤖 CCO Progress Update

${progressBar} ${progress}%

### Definition of Done (${completedCount}/${totalCount})
${mission.definitionOfDone.map(dod => `- [${dod.completed ? 'x' : ' '}] ${dod.description}`).join('\n')}

### Current Status
- **Mission ID**: ${mission.id}
- **Started**: ${mission.createdAt.toISOString()}
- **Phase**: ${mission.currentPhase || 'Initialization'}

---
*Automated update from Claude Code Orchestrator*`;
        await this.githubClient.createIssueComment(issueNumber, comment);
    }
    generateProgressBar(progress) {
        const filled = Math.floor(progress / 5);
        const empty = 20 - filled;
        return `[${'\u2588'.repeat(filled)}${'\u2591'.repeat(empty)}]`;
    }
}
exports.GitHubIssueParser = GitHubIssueParser;
//# sourceMappingURL=issue-parser.js.map