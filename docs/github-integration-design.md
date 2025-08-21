# GitHub Integration Design for CCO

## Overview
Deep GitHub integration to make CCO a native part of the GitHub workflow, from issue tracking to deployments.

## Core Integration Points

### 1. GitHub Actions Integration

#### CCO as a GitHub Action
```yaml
# .github/workflows/cco-mission.yml
name: CCO Mission Execution

on:
  issue_comment:
    types: [created]
  workflow_dispatch:
    inputs:
      mission:
        description: 'Mission file path'
        required: true
        default: 'missions/default.yaml'

jobs:
  orchestrate:
    runs-on: ubuntu-latest
    if: contains(github.event.comment.body, '/cco run')
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup CCO
        uses: mivertowski/cco-action@v1
        with:
          openrouter-key: ${{ secrets.OPENROUTER_API_KEY }}
          anthropic-key: ${{ secrets.ANTHROPIC_API_KEY }}
          
      - name: Parse Mission from Issue
        id: parse
        run: |
          cco parse-issue \
            --issue-number ${{ github.event.issue.number }} \
            --output mission.yaml
            
      - name: Execute Mission
        run: |
          cco start \
            --mission mission.yaml \
            --github-context \
            --pr-on-complete
            
      - name: Report Results
        if: always()
        uses: actions/github-script@v6
        with:
          script: |
            const results = require('./cco-results.json');
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: results.summary
            });
```

### 2. GitHub Issues as Missions

#### Issue Template for Missions
```markdown
---
name: CCO Mission
about: Create a mission for Claude Code Orchestrator
title: '[CCO] '
labels: cco-mission, automation
assignees: ''
---

## Mission Objective
<!-- Describe what needs to be accomplished -->

## Definition of Done
- [ ] <!-- Criterion 1 -->
- [ ] <!-- Criterion 2 -->
- [ ] <!-- Criterion 3 -->

## Context
<!-- Any relevant context or constraints -->

## Priority
- [ ] Critical
- [ ] High
- [ ] Medium
- [ ] Low

## Execution Trigger
<!-- How should this mission be triggered? -->
- [ ] Manual (`/cco run`)
- [ ] On PR merge to main
- [ ] On schedule
- [ ] On specific label

## Configuration
```yaml
# Optional: Override default CCO settings
model: claude-3-5-sonnet
max_iterations: 10
branch_strategy: feature
```
```

#### Issue-to-Mission Parser
```typescript
class GitHubIssueParser {
  async parseIssueToMission(issueNumber: number): Promise<Mission> {
    const issue = await this.gh.getIssue(issueNumber);
    
    // Extract DoD from checkboxes
    const dodCriteria = this.extractCheckboxes(issue.body)
      .map((item, index) => ({
        id: `issue-${issueNumber}-${index}`,
        description: item.text,
        completed: item.checked,
        measurable: true,
        priority: this.extractPriority(issue)
      }));
    
    // Parse YAML configuration if present
    const config = this.extractYamlBlock(issue.body);
    
    return {
      id: `gh-issue-${issueNumber}`,
      title: issue.title,
      description: this.extractDescription(issue.body),
      repository: this.repo.url,
      definitionOfDone: dodCriteria,
      metadata: {
        github: {
          issue_number: issueNumber,
          issue_url: issue.html_url,
          author: issue.user.login,
          labels: issue.labels,
          milestone: issue.milestone
        }
      },
      ...config
    };
  }
}
```

### 3. GitHub App for CCO

#### CCO Bot Features
```typescript
// GitHub App webhook handler
export async function handleWebhook(event: WebhookEvent) {
  switch (event.name) {
    case 'issues':
      if (event.payload.action === 'labeled') {
        if (hasLabel(event.payload.issue, 'cco-mission')) {
          await createMissionFromIssue(event.payload.issue);
        }
      }
      break;
      
    case 'issue_comment':
      if (event.payload.action === 'created') {
        await handleCommand(event.payload.comment);
      }
      break;
      
    case 'pull_request':
      if (event.payload.action === 'opened') {
        await reviewWithCCO(event.payload.pull_request);
      }
      break;
      
    case 'check_suite':
      if (event.payload.action === 'requested') {
        await runCCOChecks(event.payload.check_suite);
      }
      break;
  }
}

// Slash commands in comments
async function handleCommand(comment: IssueComment) {
  const commands = {
    '/cco run': executeMission,
    '/cco status': checkMissionStatus,
    '/cco abort': abortMission,
    '/cco review': reviewCode,
    '/cco suggest': suggestImprovements,
    '/cco test': runTests,
    '/cco deploy': deployMission
  };
  
  const command = Object.keys(commands).find(cmd => 
    comment.body.startsWith(cmd)
  );
  
  if (command) {
    await commands[command](comment);
  }
}
```

### 4. GitHub Checks API Integration

#### CCO as a Status Check
```typescript
class CCOCheckRunner {
  async createCheck(sha: string, mission: Mission): Promise<CheckRun> {
    return await this.gh.checks.create({
      owner: this.owner,
      repo: this.repo,
      name: 'CCO Mission Execution',
      head_sha: sha,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      output: {
        title: `Executing: ${mission.title}`,
        summary: this.generateMissionSummary(mission)
      }
    });
  }
  
  async updateCheck(checkId: number, result: OrchestrationResult) {
    const conclusion = result.success ? 'success' : 'failure';
    
    await this.gh.checks.update({
      owner: this.owner,
      repo: this.repo,
      check_run_id: checkId,
      status: 'completed',
      conclusion,
      completed_at: new Date().toISOString(),
      output: {
        title: `Mission ${conclusion}: ${result.mission.title}`,
        summary: this.generateResultSummary(result),
        annotations: this.generateAnnotations(result)
      }
    });
  }
  
  private generateAnnotations(result: OrchestrationResult): Annotation[] {
    return result.artifacts
      .filter(a => a.type === 'code')
      .map(artifact => ({
        path: artifact.path,
        start_line: 1,
        end_line: 1,
        annotation_level: 'notice',
        message: `File ${artifact.operation} by CCO`,
        title: 'CCO Modification'
      }));
  }
}
```

### 5. GitHub Projects Integration

#### Sync Mission Progress to Project Board
```typescript
class GitHubProjectSync {
  async syncMissionToProject(mission: Mission, projectId: number) {
    // Create project card for mission
    const card = await this.createProjectCard({
      project_id: projectId,
      content_type: 'Mission',
      content_id: mission.id,
      column: 'To Do'
    });
    
    // Update card as mission progresses
    this.subscribeMissionEvents(mission.id, async (event) => {
      switch (event.type) {
        case 'phase_started':
          await this.moveCard(card.id, 'In Progress');
          break;
          
        case 'dod_completed':
          await this.updateCardProgress(card.id, event.progress);
          break;
          
        case 'mission_completed':
          await this.moveCard(card.id, 'Done');
          break;
      }
    });
  }
}
```

### 6. GitHub Copilot Integration

#### Custom Copilot Commands
```typescript
// .github/copilot-config.yml
custom_commands:
  - name: "generate-mission"
    description: "Generate CCO mission from requirements"
    prompt: |
      Generate a CCO mission YAML file for: {input}
      Include appropriate DoD criteria and phases.
      
  - name: "explain-mission"
    description: "Explain what a CCO mission will do"
    prompt: |
      Analyze this CCO mission and explain what it will do:
      {selected_text}
      
  - name: "optimize-mission"
    description: "Optimize mission for efficiency"
    prompt: |
      Optimize this CCO mission for token usage and execution time:
      {selected_text}
```

### 7. GitHub Codespaces Integration

#### Pre-configured CCO Development Environment
```json
// .devcontainer/devcontainer.json
{
  "name": "CCO Development",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:20",
  
  "features": {
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "ghcr.io/devcontainers-contrib/features/claude-code:1": {}
  },
  
  "customizations": {
    "vscode": {
      "extensions": [
        "mivertowski.cco-vscode",
        "github.copilot",
        "github.vscode-pull-request-github"
      ],
      "settings": {
        "cco.autoStart": true,
        "cco.defaultMission": ".cco/missions/setup.yaml"
      }
    }
  },
  
  "postCreateCommand": "npm install && npx cco init",
  
  "secrets": {
    "OPENROUTER_API_KEY": {
      "description": "OpenRouter API key for CCO"
    },
    "ANTHROPIC_API_KEY": {
      "description": "Anthropic API key for Claude Code"
    }
  }
}
```

### 8. GitHub Discussions Integration

#### Mission Proposals and Feedback
```typescript
class DiscussionIntegration {
  async createMissionProposal(mission: Mission): Promise<Discussion> {
    const discussion = await this.gh.createDiscussion({
      category: 'Mission Proposals',
      title: `[Proposal] ${mission.title}`,
      body: this.generateProposalBody(mission)
    });
    
    // Set up voting
    await this.enableVoting(discussion.id);
    
    // Auto-convert to issue if approved
    this.watchForApproval(discussion.id, async () => {
      const issue = await this.convertToIssue(discussion);
      await this.triggerMission(issue.number);
    });
    
    return discussion;
  }
}
```

### 9. GitHub Marketplace Listing

#### CCO as a GitHub App
```yaml
# marketplace-listing.yaml
name: Claude Code Orchestrator
slug: cco-bot
description: |
  AI-powered development orchestration using Claude Code.
  Automatically complete complex coding tasks from GitHub issues.
  
categories:
  - continuous-integration
  - dependency-management
  - code-review
  
pricing:
  - plan: free
    description: "Up to 10 missions per month"
    price: 0
    
  - plan: team
    description: "Unlimited missions, priority support"
    price: 99
    
  - plan: enterprise
    description: "Custom limits, dedicated support"
    price: custom
    
permissions:
  issues: write
  pull_requests: write
  contents: write
  checks: write
  actions: write
  
events:
  - issues
  - issue_comment
  - pull_request
  - check_suite
  - workflow_dispatch
```

### 10. GitHub CLI Extension

#### `gh cco` Command
```bash
# Install extension
gh extension install mivertowski/gh-cco

# Commands
gh cco mission create       # Interactive mission creator
gh cco mission run         # Execute mission
gh cco mission status      # Check mission status
gh cco mission list        # List all missions
gh cco pr create          # Create PR from mission
gh cco review            # Review current PR with CCO
gh cco suggest           # Get improvement suggestions

# Examples
gh cco mission create --from-issue 123
gh cco mission run --file mission.yaml --pr
gh cco review --pr 456 --check-dod
```

## Security & Permissions

### Required GitHub Permissions
```typescript
interface GitHubPermissions {
  // Repository permissions
  contents: 'write',      // Create branches, commits
  issues: 'write',        // Create/update issues
  pull_requests: 'write', // Create/manage PRs
  checks: 'write',        // Create status checks
  actions: 'write',       // Trigger workflows
  
  // Organization permissions (optional)
  members: 'read',        // For reviewer assignment
  projects: 'write',      // Project board integration
  
  // User permissions
  email: 'read',          // For commit attribution
  gpg_keys: 'read'        // For commit signing
}
```

## Benefits of GitHub Integration

1. **Native Workflow**: CCO becomes part of the GitHub workflow
2. **Automation**: Trigger missions from issues, PRs, or comments
3. **Visibility**: Mission progress visible in GitHub UI
4. **Collaboration**: Team can interact via comments
5. **Traceability**: Complete audit trail in GitHub
6. **Integration**: Works with existing GitHub tools

## Implementation Roadmap

### Phase 1: Basic Integration (2 weeks)
- GitHub Action for CCO
- Issue parsing
- Basic PR creation

### Phase 2: GitHub App (3 weeks)
- Webhook handling
- Slash commands
- Status checks

### Phase 3: Advanced Features (4 weeks)
- Projects integration
- Discussions support
- Marketplace listing

### Phase 4: CLI & Extensions (2 weeks)
- GitHub CLI extension
- Copilot integration
- Codespaces support

This GitHub integration would make CCO a powerful native tool in the GitHub ecosystem!