# GitHub Integration Guide

CCO's GitHub integration transforms GitHub issues into executable missions, automates pull request creation, and enables seamless CI/CD workflows.

## Table of Contents
- [Overview](#overview)
- [Setup](#setup)
- [Issue-to-Mission Conversion](#issue-to-mission-conversion)
- [GitHub Actions](#github-actions)
- [Pull Request Automation](#pull-request-automation)
- [Semantic Commits](#semantic-commits)
- [Slash Commands](#slash-commands)
- [API Usage](#api-usage)
- [Examples](#examples)

## Overview

The GitHub integration provides:
- 🎯 Convert GitHub issues to CCO missions
- 🤖 Automated PR creation with mission context
- 📝 Semantic commit generation
- 🔄 GitHub Actions workflow support
- 💬 Slash commands in issue comments
- 📊 Progress tracking via issue updates

## Setup

### Prerequisites
- GitHub repository access
- GitHub token (for API access) or GitHub CLI installed
- CCO installed and configured

### 1. GitHub Token Setup

Create a personal access token with appropriate permissions:

```bash
# Option 1: Use environment variable
export GITHUB_TOKEN="ghp_your_token_here"

# Option 2: Use GitHub CLI (recommended)
gh auth login
```

Required permissions:
- `repo` - Full repository access
- `workflow` - Update GitHub Actions
- `write:packages` - (Optional) Package publishing

### 2. Configure CCO for GitHub

Update `.cco/config.yaml`:

```yaml
github:
  enable: true
  owner: "your-username"
  repo: "your-repo"
  auto_pr: true
  semantic_commits: true
  branch_strategy: "feature"  # or "fix", "chore"
  base_branch: "main"
```

### 3. Install GitHub Action

Add `.github/workflows/cco-mission.yml`:

```yaml
name: CCO Mission Execution

on:
  issue_comment:
    types: [created]
  workflow_dispatch:
    inputs:
      issue_number:
        description: 'Issue number to convert to mission'
        required: false
        type: number

jobs:
  execute-mission:
    if: contains(github.event.comment.body, '/cco run')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install CCO
        run: npm install -g claude-code-orchestrator
      
      - name: Execute Mission
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          cco init
          cco github-mission --issue ${{ github.event.issue.number }}
```

## Issue-to-Mission Conversion

### Issue Format

Create issues that CCO can understand:

```markdown
Title: [CCO] Implement user authentication system

## Mission Objective
Create a complete authentication system with JWT tokens

## Definition of Done
- [ ] User registration endpoint
- [ ] Login/logout functionality
- [ ] JWT token generation and validation
- [ ] Password hashing with bcrypt
- [ ] Rate limiting on auth endpoints
- [ ] Unit tests with 90% coverage
- [ ] API documentation

## Context
This authentication system will be used for our REST API.

## Constraints
- Use Express.js
- PostgreSQL for user storage
- Follow OAuth 2.0 standards where applicable

## Configuration
```yaml
model: "openai/gpt-4o"
max_iterations: 20
temperature: 0.3
```
```

### Automatic DoD Extraction

CCO automatically:
- Extracts checkboxes as DoD criteria
- Parses YAML configuration blocks
- Determines priority from labels
- Generates default DoD based on issue type

### Issue Labels

Use labels to control mission behavior:

- `cco-mission` - Marks issue as CCO-compatible
- `priority:critical` - Sets mission priority
- `bug` - Generates bug-fix DoD
- `enhancement` - Generates feature DoD
- `documentation` - Generates docs DoD
- `auto-execute` - Triggers immediate execution

## GitHub Actions

### Trigger Methods

1. **Issue Comment Trigger**:
```markdown
/cco run
```

2. **Label Trigger**:
Add `cco-execute` label to issue

3. **Manual Workflow Dispatch**:
Go to Actions tab → CCO Mission → Run workflow

4. **Push Trigger**:
```yaml
on:
  push:
    branches: [main]
    paths:
      - 'missions/*.yaml'
```

### Advanced Workflow

```yaml
name: Advanced CCO Workflow

on:
  issues:
    types: [labeled]

jobs:
  plan:
    if: github.event.label.name == 'cco-plan'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          npx cco plan --issue ${{ github.event.issue.number }}
          
  execute:
    if: github.event.label.name == 'cco-execute'
    needs: plan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          npx cco execute --issue ${{ github.event.issue.number }}
          
  review:
    if: github.event.label.name == 'cco-review'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          npx cco review --pr ${{ github.event.pull_request.number }}
```

## Pull Request Automation

### Automatic PR Creation

CCO creates comprehensive PRs with:

```markdown
## 🎯 Mission: [Mission Title]

**Mission ID**: cco-abc123
**Issue**: #42
**Execution Time**: 45 minutes
**Token Usage**: 125,432

### 📋 Definition of Done
- [x] Criterion 1 ✅
- [x] Criterion 2 ✅
- [ ] Criterion 3 (partial)

### 📊 Metrics
- Files Changed: 12
- Lines Added: 1,847
- Test Coverage: 94.2%
- Performance Impact: +2ms

### 🧪 Test Results
✓ All tests passing (42 tests)

### 📝 Changes Summary
[AI-generated summary of changes]
```

### PR Configuration

```yaml
# .cco/github.yaml
pull_request:
  template: "detailed"  # or "simple", "custom"
  reviewers:
    - "@teamlead"
    - "@senior-dev"
  labels:
    - "cco-generated"
    - "needs-review"
  auto_merge: false
  require_checks:
    - "tests"
    - "lint"
  draft: false
```

## Semantic Commits

### Automatic Commit Generation

CCO analyzes changes to create meaningful commits:

```bash
feat(auth): implement JWT authentication system

- Add JWT token generation and validation
- Implement refresh token mechanism
- Create authentication middleware
- Add rate limiting to prevent brute force

Mission: cco-mission-abc123
Fixes: #42

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Commit Types

CCO automatically detects:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `perf`: Performance improvements
- `test`: Test additions
- `chore`: Maintenance tasks

### Custom Commit Rules

```yaml
# .cco/commit-rules.yaml
semantic_commits:
  enabled: true
  format: "conventional"  # or "angular", "atom"
  scope_detection: "auto"  # or "manual", "directory"
  sign_commits: true
  batch_size: 5  # Files per commit
  
  type_mapping:
    "*.test.ts": "test"
    "*.md": "docs"
    "src/api/*": "feat"
    "src/utils/*": "refactor"
```

## Slash Commands

### Available Commands

Use these in issue/PR comments:

| Command | Description |
|---------|-------------|
| `/cco run` | Execute mission from issue |
| `/cco status` | Check mission progress |
| `/cco abort` | Stop current execution |
| `/cco review` | Run code review |
| `/cco test` | Run test suite |
| `/cco deploy` | Deploy changes |
| `/cco rollback` | Revert changes |
| `/cco help` | Show available commands |

### Command Options

```markdown
/cco run --model gpt-4o --iterations 10
/cco status --verbose
/cco review --focus security
/cco test --coverage
```

## API Usage

### Programmatic Integration

```typescript
import { GitHubOrchestrator } from 'cco/github';

const orchestrator = new GitHubOrchestrator({
  owner: 'your-org',
  repo: 'your-repo',
  token: process.env.GITHUB_TOKEN
});

// Convert issue to mission
const mission = await orchestrator.createMissionFromIssue(123);

// Execute mission
const result = await orchestrator.execute(mission);

// Create PR
const prUrl = await orchestrator.createPR(mission, result);

// Update issue progress
await orchestrator.updateIssueProgress(123, mission, 75);
```

### GitHub CLI Extension

```bash
# Install extension
gh extension install mivertowski/gh-cco

# Commands
gh cco mission create --from-issue 123
gh cco mission run --file mission.yaml
gh cco pr create --mission abc123
gh cco review --pr 456
```

## Examples

### Example 1: Bug Fix Workflow

1. **Create Issue**:
```markdown
Title: [BUG] Login fails with special characters

## Definition of Done
- [ ] Fix special character handling
- [ ] Add input validation
- [ ] Write regression tests
- [ ] Update documentation
```

2. **Trigger Fix**:
```markdown
/cco run --branch-strategy fix
```

3. **Result**: PR with fix and tests

### Example 2: Feature Development

1. **Create Feature Issue**:
```markdown
Title: [FEATURE] Add export functionality

## Definition of Done
- [ ] CSV export endpoint
- [ ] JSON export endpoint
- [ ] PDF generation
- [ ] Rate limiting
- [ ] Documentation
```

2. **Execute**:
```markdown
/cco run --model claude-3-opus
```

3. **Monitor Progress**:
```markdown
/cco status
```

### Example 3: Automated Documentation

```yaml
# .github/workflows/docs.yml
on:
  push:
    paths:
      - 'src/**/*.ts'

jobs:
  update-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          npx cco start --mission templates/update-docs.yaml
          npx cco github create-pr --auto-merge
```

## Best Practices

### 1. Issue Templates

Create `.github/ISSUE_TEMPLATE/cco-mission.md`:

```markdown
---
name: CCO Mission
about: Create a mission for Claude Code Orchestrator
labels: cco-mission
---

## Mission Objective
<!-- Clear description of what needs to be accomplished -->

## Definition of Done
- [ ] <!-- Specific, measurable criterion -->
- [ ] <!-- Another criterion -->

## Context
<!-- Any relevant background information -->

## Constraints
<!-- Technical or business constraints -->
```

### 2. Branch Protection

Protect main branch with:
- Require PR reviews
- Require status checks (tests, lint)
- Require up-to-date branches
- Include CCO checks

### 3. Security

- Never commit secrets
- Use GitHub Secrets for API keys
- Review CCO-generated code
- Enable security scanning

### 4. Monitoring

Track CCO performance:
- Mission success rate
- Average completion time
- Token usage per mission
- PR approval rate

## Troubleshooting

### Common Issues

**Issue: "Permission denied" errors**
- Check GitHub token permissions
- Ensure workflow has correct permissions
- Verify repository settings

**Issue: "Cannot create PR"**
- Check branch protection rules
- Verify base branch exists
- Ensure no conflicts

**Issue: "Mission not recognized"**
- Check issue format
- Verify DoD criteria syntax
- Ensure labels are correct

**Issue: "Workflow not triggering"**
- Check workflow syntax
- Verify trigger conditions
- Check GitHub Actions status

## Advanced Configuration

### Custom GitHub App

Create a GitHub App for CCO:

1. Go to Settings → Developer settings → GitHub Apps
2. Create new app with permissions:
   - Issues: Read & Write
   - Pull Requests: Read & Write
   - Contents: Read & Write
   - Actions: Read & Write
3. Install app on repository
4. Use app token in CCO config

### Webhook Integration

Set up webhooks for real-time updates:

```javascript
// webhook-handler.js
app.post('/webhook', (req, res) => {
  const event = req.headers['x-github-event'];
  
  switch(event) {
    case 'issues':
      if (req.body.action === 'opened') {
        cco.parseIssue(req.body.issue);
      }
      break;
    case 'issue_comment':
      if (req.body.comment.body.includes('/cco')) {
        cco.handleCommand(req.body);
      }
      break;
  }
});
```

## Next Steps

- Explore [Mission Templates](mission-templates.md)
- Learn about [SDK Integration](sdk-integration.md)
- Read [API Reference](api-reference.md)
- Join [Discussions](https://github.com/mivertowski/cco/discussions)