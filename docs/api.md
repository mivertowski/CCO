# CCO API Reference

## Overview

Claude Code Orchestrator (CCO) provides a comprehensive API for programmatic access to its orchestration capabilities. This document covers the public API surface for integrating CCO into your applications.

## Installation

```bash
npm install cco-cli
```

## Core Classes

### Orchestrator

The main orchestration engine that manages mission execution.

```typescript
import { Orchestrator } from 'cco-cli';

const orchestrator = new Orchestrator({
  mission: Mission,
  openRouterClient: ILLMClient,
  claudeCodeClient: IClaudeCodeClient,
  sessionManager: SessionManager,
  logger: winston.Logger,
  maxIterations?: number,
  checkpointInterval?: number,
  timeout?: number
});
```

#### Methods

##### `orchestrate(): Promise<OrchestrationResult>`
Execute the mission orchestration.

```typescript
const result = await orchestrator.orchestrate();
console.log(`Success: ${result.success}`);
console.log(`Completed DoD: ${result.completedDoD.length}`);
```

##### `on(event: string, handler: Function): void`
Subscribe to orchestration events.

```typescript
orchestrator.on('progress', (data) => {
  console.log(`Progress: ${data.percentage}%`);
});

orchestrator.on('phase-change', (phase) => {
  console.log(`Entering phase: ${phase}`);
});

orchestrator.on('dod-completed', (criteria) => {
  console.log(`Completed: ${criteria.description}`);
});
```

### GitHubOrchestrator

Specialized orchestrator for GitHub issue processing.

```typescript
import { GitHubOrchestrator } from 'cco-cli';

const githubOrch = new GitHubOrchestrator({
  owner: string,
  repo: string,
  token?: string,
  llmClient: ILLMClient,
  claudeCodeClient?: IClaudeCodeClient,
  sessionManager?: SessionManager,
  logger?: winston.Logger
});
```

#### Methods

##### `createMissionFromIssue(issueNumber: number): Promise<Mission>`
Convert a GitHub issue into an executable mission.

```typescript
const mission = await githubOrch.createMissionFromIssue(123);
```

##### `orchestrate(mission: Mission): Promise<OrchestrationResult>`
Execute orchestration for a GitHub-based mission.

##### `createPRFromMission(mission: Mission, result: OrchestrationResult): Promise<string>`
Create a pull request from completed mission.

```typescript
const prUrl = await githubOrch.createPRFromMission(mission, result);
console.log(`PR created: ${prUrl}`);
```

##### `selectIssuesInteractively(): Promise<number[]>`
Display interactive issue selector.

```typescript
const selectedIssues = await githubOrch.selectIssuesInteractively();
```

##### `processIssuesAutomatically(options): Promise<void>`
Process issues in automated mode.

```typescript
await githubOrch.processIssuesAutomatically({
  pollInterval: 60, // seconds
  labels: ['bug', 'enhancement'],
  createPR: true
});
```

## LLM Providers

### LLMProviderFactory

Factory for creating LLM client instances.

```typescript
import { LLMProviderFactory } from 'cco-cli';

const client = await LLMProviderFactory.createProvider(
  'claude-code', // or 'openrouter', 'ollama', 'local-cuda', etc.
  {
    model: 'claude-opus-4-1-20250805',
    temperature: 0.3,
    apiKey: process.env.ANTHROPIC_API_KEY
  },
  logger
);
```

#### Supported Providers

- `claude-code`: Claude Code SDK (with automatic permission bypass)
- `openrouter`: OpenRouter API (100+ models)
- `ollama`: Local Ollama models
- `local-cuda`: CUDA-accelerated local models
- `local-cpu`: CPU-only local models
- `llamacpp`: llama.cpp backend
- `vllm`: VLLM high-performance serving

### ILLMClient Interface

All LLM providers implement this interface:

```typescript
interface ILLMClient {
  generateResponse(
    prompt: string, 
    systemPrompt?: string
  ): Promise<string>;
  
  validateEnvironment?(): Promise<boolean>;
  
  getModelInfo?(): Promise<{
    name: string;
    parameters?: number;
    context?: number;
  }>;
}
```

## Mission Management

### MissionParser

Parse missions from YAML files.

```typescript
import { MissionParser } from 'cco-cli';

const parser = new MissionParser(logger);
const mission = await parser.parseMission('mission.yaml');
```

### Mission Interface

```typescript
interface Mission {
  id: string;
  title: string;
  description: string;
  repository: string;
  definitionOfDone: DoDCriteria[];
  createdAt: Date;
  completedAt?: Date;
  currentPhase?: string;
  metadata?: {
    github?: {
      issueNumber: number;
      issueUrl: string;
      author: string;
      labels: string[];
    };
  };
}
```

### DoDCriteria Interface

```typescript
interface DoDCriteria {
  id: string;
  description: string;
  measurable: boolean;
  priority: DoDPriority;
  completed: boolean;
  completedAt?: Date;
}

enum DoDPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}
```

## Session Management

### SessionManager

Manages orchestration sessions with checkpointing.

```typescript
import { SessionManager } from 'cco-cli';

const sessionManager = new SessionManager({
  persistencePath: '.cco/sessions',
  logger
});
```

#### Methods

##### `createSession(mission: Mission): Promise<string>`
Create a new orchestration session.

```typescript
const sessionId = await sessionManager.createSession(mission);
```

##### `saveCheckpoint(sessionId: string, state: any): Promise<void>`
Save session checkpoint.

##### `loadSession(sessionId: string): Promise<SessionData>`
Load existing session.

##### `listSessions(): Promise<SessionInfo[]>`
List all available sessions.

## Configuration

### ConfigLoader

Load and validate configuration files.

```typescript
import { loadConfig } from 'cco-cli';

const config = await loadConfig('config.yaml');
```

### Configuration Schema

```typescript
interface Config {
  orchestrator: {
    mode: string;
    max_iterations: number;
    checkpoint_interval: number;
    llm_provider?: string;
  };
  repository: {
    path: string;
    auto_commit: boolean;
    commit_frequency: string;
  };
  llm?: {
    provider: string;
    huggingface_token?: string;
    local_model?: {
      name?: string;
      context_size: number;
      gpu_layers?: number;
    };
  };
  openrouter: {
    api_key?: string;
    model: string;
    temperature: number;
  };
  claude_code: {
    api_key?: string;
    use_subscription: boolean;
    use_sdk: boolean;
    workspace: string;
    max_file_size: number;
  };
  github?: {
    auto_create_pr: boolean;
    auto_close_issues: boolean;
    pr_template?: string;
  };
  monitoring: {
    log_level: string;
    log_path: string;
    enable_telemetry: boolean;
  };
}
```

## Utilities

### GitUtils

Git repository utilities.

```typescript
import { GitUtils } from 'cco-cli';

const utils = new GitUtils(logger);

// Get repository info
const { owner, repo } = await utils.getRepositoryInfo();

// Create branch
await utils.createBranch('feature/new-feature');

// Commit changes
await utils.commit('feat: add new feature');

// Push to remote
await utils.push('origin', 'feature/new-feature');
```

### TokenCounter

Token usage tracking and optimization.

```typescript
import { TokenCounter } from 'cco-cli';

const counter = new TokenCounter();
const tokens = counter.countTokens(text);
const cost = counter.estimateCost(tokens, 'claude-opus-4-1-20250805');
```

## Events

### Orchestrator Events

- `progress`: Emitted with progress percentage and message
- `phase-change`: Emitted when orchestration phase changes
- `dod-completed`: Emitted when a DoD criterion is completed
- `checkpoint`: Emitted when checkpoint is saved
- `error`: Emitted on orchestration errors

### GitHub Events

- `issue-selected`: Emitted when issues are selected
- `pr-created`: Emitted when PR is created
- `comment-posted`: Emitted when issue comment is posted

## Error Handling

All API methods throw typed errors:

```typescript
try {
  await orchestrator.orchestrate();
} catch (error) {
  if (error instanceof OrchestrationError) {
    console.error(`Orchestration failed: ${error.message}`);
    console.error(`Phase: ${error.phase}`);
    console.error(`Iteration: ${error.iteration}`);
  }
}
```

### Error Types

- `OrchestrationError`: General orchestration failures
- `ConfigurationError`: Invalid configuration
- `GitHubError`: GitHub API errors
- `LLMError`: LLM provider errors
- `SessionError`: Session management errors

## Examples

### Complete GitHub Issue Processing

```typescript
import { 
  GitHubOrchestrator, 
  LLMProviderFactory,
  SessionManager 
} from 'cco-cli';
import winston from 'winston';

async function processGitHubIssue(issueNumber: number) {
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [new winston.transports.Console()]
  });

  // Create LLM client
  const llmClient = await LLMProviderFactory.createProvider(
    'claude-code',
    {
      model: 'claude-opus-4-1-20250805',
      permissionMode: 'bypassPermissions'
    },
    logger
  );

  // Create GitHub orchestrator
  const orchestrator = new GitHubOrchestrator({
    owner: 'your-org',
    repo: 'your-repo',
    token: process.env.GITHUB_TOKEN,
    llmClient,
    logger
  });

  // Convert issue to mission
  const mission = await orchestrator.createMissionFromIssue(issueNumber);

  // Execute orchestration
  orchestrator.on('progress', (data) => {
    console.log(`Progress: ${data.percentage}% - ${data.message}`);
  });

  const result = await orchestrator.orchestrate(mission);

  // Create PR if successful
  if (result.success) {
    const prUrl = await orchestrator.createPRFromMission(mission, result);
    console.log(`✅ PR created: ${prUrl}`);
  }
}

// Run
processGitHubIssue(123).catch(console.error);
```

### Custom Mission Execution

```typescript
import { 
  Orchestrator,
  MissionParser,
  LLMProviderFactory,
  SessionManager 
} from 'cco-cli';

async function executeMission(missionPath: string) {
  const logger = createLogger();
  
  // Parse mission
  const parser = new MissionParser(logger);
  const mission = await parser.parseMission(missionPath);

  // Create clients
  const llmClient = await LLMProviderFactory.createProvider(
    'openrouter',
    {
      model: 'anthropic/claude-opus-4-1',
      apiKey: process.env.OPENROUTER_API_KEY
    },
    logger
  );

  const claudeCodeClient = await LLMProviderFactory.createProvider(
    'claude-code',
    { permissionMode: 'bypassPermissions' },
    logger
  );

  // Create session manager
  const sessionManager = new SessionManager({
    persistencePath: '.cco/sessions',
    logger
  });

  // Create orchestrator
  const orchestrator = new Orchestrator({
    mission,
    openRouterClient: llmClient,
    claudeCodeClient,
    sessionManager,
    logger,
    maxIterations: 100,
    checkpointInterval: 5
  });

  // Execute
  const result = await orchestrator.orchestrate();
  console.log('Mission completed:', result.success);
}
```

### Automated Issue Processing

```typescript
import { GitHubOrchestrator, LLMProviderFactory } from 'cco-cli';

async function automateIssueProcessing() {
  const llmClient = await LLMProviderFactory.createProvider(
    'claude-code',
    { permissionMode: 'bypassPermissions' },
    createLogger()
  );

  const orchestrator = new GitHubOrchestrator({
    owner: 'your-org',
    repo: 'your-repo',
    llmClient
  });

  // Process issues automatically
  await orchestrator.processIssuesAutomatically({
    pollInterval: 300, // 5 minutes
    labels: ['auto-process', 'bug'],
    createPR: true,
    maxConcurrent: 1
  });
}
```

## Migration Guide

### From v1.0.2 to v1.0.3

#### Updated Default Model
The default model is now Claude Opus 4.1:

```typescript
// Before
{ model: 'claude-3-5-sonnet' }

// After  
{ model: 'claude-opus-4-1-20250805' }
```

#### New LLM Provider Interface
Use `ILLMClient` instead of specific client types:

```typescript
// Before
import { OpenRouterClient } from 'cco-cli';
const client = new OpenRouterClient(config);

// After
import { LLMProviderFactory } from 'cco-cli';
const client = await LLMProviderFactory.createProvider('openrouter', config, logger);
```

#### Permission Mode for Automation
Claude Code now uses `bypassPermissions` by default:

```typescript
// Automatic - no need to specify
const client = await LLMProviderFactory.createProvider('claude-code', {}, logger);

// Explicit (optional)
const client = await LLMProviderFactory.createProvider('claude-code', {
  permissionMode: 'bypassPermissions'
}, logger);
```

## Rate Limits and Quotas

### API Rate Limits
- OpenRouter: Varies by model (typically 10-100 req/min)
- Claude Code: Based on subscription tier
- Local models: No limits

### Token Limits
- Claude Opus 4.1: 200K context window
- Most models: 4K-128K context
- Local models: Depends on VRAM/RAM

### Cost Optimization
- Use token counting before API calls
- Implement caching for repeated queries
- Use checkpoint/resume for long tasks
- Choose appropriate models for task complexity

## Support

- **GitHub Issues**: [github.com/mivertowski/cco/issues](https://github.com/mivertowski/cco/issues)
- **Documentation**: [github.com/mivertowski/cco/docs](https://github.com/mivertowski/cco/docs)
- **NPM Package**: [npmjs.com/package/cco-cli](https://www.npmjs.com/package/cco-cli)