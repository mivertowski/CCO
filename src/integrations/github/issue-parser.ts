import { Mission, DoDCriteria, DoDPriority } from '../../models/mission';
import { GitHubClient, IssueData } from './github-client';
import winston from 'winston';
import * as yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';

export class GitHubIssueParser {
  private githubClient: GitHubClient;
  private logger: winston.Logger;

  constructor(githubClient: GitHubClient, logger: winston.Logger) {
    this.githubClient = githubClient;
    this.logger = logger;
  }

  async parseIssueToMission(issueNumber: number): Promise<Mission> {
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
      
      // Create mission
      const mission: Mission = {
        id: `gh-issue-${issueNumber}-${uuidv4().substring(0, 8)}`,
        title: issue.title.replace(/^\[CCO\]\s*/i, ''), // Remove [CCO] prefix if present
        description: this.extractDescription(issue.body),
        repository: process.cwd(),
        definitionOfDone: dodCriteria.length > 0 ? dodCriteria : this.generateDefaultDoD(issue),
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
      });

      return mission;
    } catch (error) {
      this.logger.error('Failed to parse issue to mission', { error, issueNumber });
      throw error;
    }
  }

  private extractCheckboxes(body: string): DoDCriteria[] {
    const checkboxRegex = /^[\s]*[-*]\s*\[([ xX])\]\s*(.+)$/gm;
    const criteria: DoDCriteria[] = [];
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
        priority: DoDPriority.MEDIUM,
      });
    }

    return criteria;
  }

  private isMetaCheckbox(text: string): boolean {
    const metaPatterns = [
      /^(critical|high|medium|low)$/i,
      /^(manual|on pr|on schedule|on.*label)$/i,
    ];
    
    return metaPatterns.some(pattern => pattern.test(text));
  }

  private extractYamlConfig(body: string): any {
    try {
      // Look for YAML code block
      const yamlMatch = body.match(/```ya?ml\n([\s\S]*?)\n```/);
      
      if (yamlMatch && yamlMatch[1]) {
        const config = yaml.load(yamlMatch[1]) as any;
        this.logger.debug('Extracted YAML config from issue', { config });
        return config;
      }
    } catch (error) {
      this.logger.warn('Failed to parse YAML config from issue', { error });
    }
    
    return {};
  }

  private extractDescription(body: string): string {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private extractPriority(labels: Array<{ name: string }>): DoDPriority {
    const priorityLabels = {
      'priority:critical': DoDPriority.CRITICAL,
      'priority:high': DoDPriority.HIGH,
      'priority:medium': DoDPriority.MEDIUM,
      'priority:low': DoDPriority.LOW,
      'critical': DoDPriority.CRITICAL,
      'high-priority': DoDPriority.HIGH,
      'urgent': DoDPriority.HIGH,
    };

    for (const label of labels) {
      const labelName = label.name.toLowerCase();
      for (const [key, priority] of Object.entries(priorityLabels)) {
        if (labelName === key || labelName.includes(key)) {
          return priority;
        }
      }
    }

    return DoDPriority.MEDIUM;
  }

  private generateDefaultDoD(issue: IssueData): DoDCriteria[] {
    const criteria: DoDCriteria[] = [];
    
    // Generate DoD based on issue labels
    const labels = issue.labels.map(l => l.name.toLowerCase());
    
    if (labels.includes('bug')) {
      criteria.push({
        id: 'fix-bug',
        description: 'Fix the reported bug',
        measurable: true,
        priority: DoDPriority.HIGH,
        completed: false,
      });
      criteria.push({
        id: 'add-tests',
        description: 'Add tests to prevent regression',
        measurable: true,
        priority: DoDPriority.MEDIUM,
        completed: false,
      });
    }
    
    if (labels.includes('enhancement') || labels.includes('feature')) {
      criteria.push({
        id: 'implement-feature',
        description: 'Implement the requested feature',
        measurable: true,
        priority: DoDPriority.HIGH,
        completed: false,
      });
      criteria.push({
        id: 'add-tests',
        description: 'Add comprehensive tests',
        measurable: true,
        priority: DoDPriority.MEDIUM,
        completed: false,
      });
      criteria.push({
        id: 'update-docs',
        description: 'Update documentation',
        measurable: true,
        priority: DoDPriority.LOW,
        completed: false,
      });
    }
    
    if (labels.includes('documentation')) {
      criteria.push({
        id: 'update-docs',
        description: 'Update or create documentation',
        measurable: true,
        priority: DoDPriority.HIGH,
        completed: false,
      });
    }
    
    // If no specific labels, create generic DoD
    if (criteria.length === 0) {
      criteria.push({
        id: 'complete-task',
        description: 'Complete the task described in the issue',
        measurable: true,
        priority: DoDPriority.HIGH,
        completed: false,
      });
    }

    return criteria;
  }

  async createProgressComment(issueNumber: number, mission: Mission, progress: number): Promise<void> {
    const completedCount = mission.definitionOfDone.filter(d => d.completed).length;
    const totalCount = mission.definitionOfDone.length;
    
    const progressBar = this.generateProgressBar(progress);
    
    const comment = `## 🤖 CCO Progress Update

${progressBar} ${progress}%

### Definition of Done (${completedCount}/${totalCount})
${mission.definitionOfDone.map(dod => 
  `- [${dod.completed ? 'x' : ' '}] ${dod.description}`
).join('\n')}

### Current Status
- **Mission ID**: ${mission.id}
- **Started**: ${mission.createdAt.toISOString()}
- **Phase**: ${mission.currentPhase || 'Initialization'}

---
*Automated update from Claude Code Orchestrator*`;

    await this.githubClient.createIssueComment(issueNumber, comment);
  }

  private generateProgressBar(progress: number): string {
    const filled = Math.floor(progress / 5);
    const empty = 20 - filled;
    return `[${'\u2588'.repeat(filled)}${'\u2591'.repeat(empty)}]`;
  }
}