# Claude Code Orchestrator (CCO)

[![npm version](https://img.shields.io/npm/v/cco-cli)](https://www.npmjs.com/package/cco-cli)
[![npm downloads](https://img.shields.io/npm/dm/cco-cli)](https://www.npmjs.com/package/cco-cli)
[![GitHub stars](https://img.shields.io/github/stars/mivertowski/cco)](https://github.com/mivertowski/cco/stargazers)
[![License](https://img.shields.io/github/license/mivertowski/cco)](https://github.com/mivertowski/cco/blob/main/LICENSE)
[![CI Status](https://img.shields.io/github/actions/workflow/status/mivertowski/cco/ci.yml)](https://github.com/mivertowski/cco/actions)
[![codecov](https://img.shields.io/codecov/c/github/mivertowski/cco)](https://codecov.io/gh/mivertowski/cco)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/mivertowski/cco/blob/main/CONTRIBUTING.md)

An intelligent orchestration system that transforms GitHub issues into working code using Claude Code and other LLMs. CCO automatically manages the entire development lifecycle from issue analysis to pull request creation, acting as an autonomous AI project manager.

## 🌟 Key Features

### 🤖 Multi-LLM Support
- **Claude Code as Orchestrator**: Use Claude Code itself as the orchestrator LLM (with automatic permission bypass)
- **OpenRouter Integration**: Access 100+ models including Claude Opus 4.1, GPT-4, and free models
- **Local LLM Support**: Run models locally with CUDA/CPU acceleration
  - Ollama integration for easy local model management
  - llama.cpp support for optimized inference
  - VLLM for high-performance serving
  - HuggingFace Transformers models
- **Claude Code Subscription Support**: Works with Claude Code subscriptions - no API key required

### 🔄 Advanced GitHub Integration
- **Interactive Issue Selection**: Browse and select issues with priority indicators (p0-critical, p1-high, p2-medium, p3-low)
- **Automated Processing Mode**: Continuously process issues by priority with configurable polling
- **Smart PR Creation**: Automatically creates PRs with "Fixes #X" for automatic issue closing upon merge
- **Progress Comments**: Real-time progress updates posted to GitHub issues
- **Semantic Commits**: Follows conventional commit standards
- **GitHub Actions Support**: CI/CD ready with included workflows

### 🎯 Intelligent Orchestration
- **Definition of Done (DoD) Driven**: Success measured by achieving specific, measurable criteria
- **Multi-Phase Execution**: Planning → Implementation → Validation → Integration
- **Session Persistence**: Checkpoint and resume long-running tasks
- **Smart Token Optimization**: Context management reduces API costs by 50-80%
- **Error Recovery**: Automatic retry strategies with exponential backoff
- **Progress Visualization**: Real-time console output with progress bars and status updates

### 🛠️ Enterprise Ready
- **Corporate Proxy Support**: Works behind Zscaler and other corporate proxies
- **Security First**: No hardcoded secrets, secure token handling
- **Extensive Logging**: Debug, info, error levels with automatic rotation
- **Telemetry Support**: Optional OpenTelemetry integration for monitoring
- **Configuration Management**: YAML-based config with environment variable overrides

## 📦 Installation

```bash
# Install globally
npm install -g cco-cli

# Or use directly with npx (no installation)
npx cco-cli --help
```

## 🚀 Quick Start

### 1. Initialize Configuration

```bash
cco init
```

This creates:
- `.env` file for API keys
- `config.yaml` for orchestration settings
- `.cco/` directory for logs and sessions

### 2. Set Up API Keys

Edit `.env`:

```env
# Choose your LLM provider (at least one required)
OPENROUTER_API_KEY=sk-or-v1-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx  # Optional with Claude Code subscription

# GitHub token (for issue integration)
GITHUB_TOKEN=ghp_xxxxx  # Or use GitHub CLI

# Optional: Claude Code subscription mode
CLAUDE_CODE_SUBSCRIPTION=true

# Optional: For local models with HuggingFace
HUGGINGFACE_TOKEN=hf_xxxxx
```

### 3. Process GitHub Issues

```bash
# Process a specific issue
cco github --issue 123

# Interactive mode - select from open issues
cco github --interactive

# Automated mode - process all issues by priority
cco github --auto --poll-interval 30

# Use Claude Code as the orchestrator
cco github --issue 123 --llm claude-code

# Create PR automatically when done
cco github --issue 123 --create-pr

# Process issues with specific labels
cco github --auto --labels "bug,enhancement"
```

## 📚 Usage Examples

### Run a Custom Mission

Create `mission.yaml`:

```yaml
mission:
  id: auth-system
  title: Implement JWT Authentication
  description: Add secure authentication to the API
  repository: .
  definition_of_done:
    - id: jwt-middleware
      description: Create JWT validation middleware
      priority: CRITICAL
      measurable: Middleware validates and refreshes tokens
      completed: false
    - id: user-endpoints
      description: Implement login and registration endpoints
      priority: HIGH
      measurable: Endpoints handle user auth with proper validation
      completed: false
    - id: test-coverage
      description: Add comprehensive test coverage
      priority: HIGH
      measurable: Auth system has >90% test coverage
      completed: false
    - id: documentation
      description: Create API documentation
      priority: MEDIUM
      measurable: All endpoints documented with examples
      completed: false
```

Run the mission:

```bash
# Start orchestration
cco start --mission mission.yaml

# Use specific LLM provider
cco start --mission mission.yaml --llm claude-code

# Resume a previous session
cco resume <session-id>
```

### Using Different LLM Providers

```bash
# Use Claude Code (with automatic permission bypass)
cco github --issue 123 --llm claude-code

# Use OpenRouter with specific model
cco github --issue 123 --llm openrouter --model anthropic/claude-opus-4-1

# Use local Ollama model
cco github --issue 123 --llm ollama --local-model codellama:13b

# Use local CUDA-accelerated model
cco github --issue 123 --llm local-cuda --local-model meta-llama/Llama-2-13b-chat-hf
```

## 🔧 Configuration

### Full Configuration Example

`config.yaml`:

```yaml
# Orchestrator settings
orchestrator:
  max_iterations: 100
  checkpoint_interval: 5
  timeout_ms: 3600000  # 1 hour
  llm_provider: claude-code  # Default provider

# OpenRouter configuration
openrouter:
  api_key: ${OPENROUTER_API_KEY}  # From environment
  model: anthropic/claude-opus-4-1  # Latest Opus 4.1
  temperature: 0.3
  max_tokens: 100000

# Claude Code configuration
claude_code:
  use_subscription: true
  api_key: ${ANTHROPIC_API_KEY}
  max_iterations: 50
  project_path: .

# Local LLM configuration
llm:
  provider: ollama
  huggingface_token: ${HUGGINGFACE_TOKEN}
  local_model:
    name: codellama:13b
    context_size: 8192
    gpu_layers: 35
    temperature: 0.2
  vllm_options:
    tensor_parallel_size: 1
    gpu_memory_utilization: 0.9

# GitHub integration
github:
  auto_create_pr: true
  auto_close_issues: false  # Close when PR merges
  pr_template: |
    ## Summary
    This PR was automatically generated by CCO to address issue #{{issue_number}}.
    
    {{description}}
    
    ## Changes
    {{changes_summary}}
    
    ## Definition of Done
    {{dod_checklist}}
    
    ## Testing
    {{test_summary}}
    
    Fixes #{{issue_number}}

# Monitoring
monitoring:
  enable_telemetry: false
  log_level: info
  performance_tracking: true
```

## 📊 API Usage

### As a Library

```typescript
import { 
  Orchestrator, 
  GitHubOrchestrator, 
  LLMProviderFactory,
  MissionParser 
} from 'cco-cli';

// Create LLM client (supports multiple providers)
const llmClient = await LLMProviderFactory.createProvider(
  'claude-code',  // or 'openrouter', 'ollama', 'local-cuda'
  {
    model: 'claude-opus-4-1-20250805',
    temperature: 0.3,
    permissionMode: 'bypassPermissions'  // For automation
  },
  logger
);

// Process GitHub issue
const githubOrch = new GitHubOrchestrator({
  owner: 'your-org',
  repo: 'your-repo',
  token: process.env.GITHUB_TOKEN,
  llmClient: llmClient
});

const mission = await githubOrch.createMissionFromIssue(123);
const result = await githubOrch.orchestrate(mission);

if (result.success) {
  const prUrl = await githubOrch.createPRFromMission(mission, result);
  console.log(`✅ PR created: ${prUrl}`);
}
```

### Custom Mission Execution

```typescript
// Parse mission from YAML
const missionParser = new MissionParser(logger);
const mission = await missionParser.parseMission('mission.yaml');

// Create orchestrator
const orchestrator = new Orchestrator({
  mission,
  openRouterClient: llmClient,
  claudeCodeClient: claudeCodeClient,
  sessionManager,
  logger,
  maxIterations: 100,
  checkpointInterval: 5
});

// Execute with progress tracking
orchestrator.on('progress', (data) => {
  console.log(`Progress: ${data.percentage}% - ${data.message}`);
});

const result = await orchestrator.orchestrate();
```

## 🌍 Environment Support

### Corporate Proxy / Zscaler

CCO automatically handles SSL certificate issues:

```bash
# Automatically set when needed
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

### GPU Acceleration

```bash
# Check CUDA availability
cco status --check-cuda

# Use GPU-accelerated inference
cco github --issue 123 --llm local-cuda \
  --local-model meta-llama/Llama-2-13b-chat-hf \
  --gpu-layers 40
```

## 📈 Performance Metrics

Typical performance with token optimization:
- **Issue → Mission**: ~5 seconds
- **Mission → Code**: 2-10 minutes (complexity dependent)
- **Code → PR**: ~30 seconds
- **Token Reduction**: 50-80% vs. naive approach
- **Cost Savings**: Up to 70% reduction in API costs

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- --grep "GitHub"

# E2E tests
npm run test:e2e
```

## 🔍 Debugging

```bash
# Enable debug logging
export LOG_LEVEL=debug
cco github --issue 123

# View session logs
tail -f .cco/logs/sessions/<session-id>.log

# Check orchestration state
cco status --session <session-id>

# Export logs for analysis
cco logs export --session <session-id> --format json
```

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone repository
git clone https://github.com/mivertowski/cco.git
cd cco

# Install dependencies
npm install

# Build project
npm run build

# Run locally
npm link
cco --version

# Watch mode for development
npm run dev
```

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

### Latest Updates (v1.0.3)
- 🎉 Claude Code as orchestrator LLM with automatic permission bypass
- 🚀 Interactive GitHub issue selection with priority indicators
- 🔄 Automated issue processing mode with polling
- 🖥️ Local LLM support with CUDA acceleration
- 🔒 Corporate proxy support (Zscaler compatible)
- 📊 50-80% token usage reduction
- 🎯 Default model updated to Claude Opus 4.1

## 📮 Support

- **Issues**: [GitHub Issues](https://github.com/mivertowski/cco/issues)

## 📄 License

MIT © 2025 Michael Ivertowski

## 🙏 Acknowledgments

- Anthropic for Claude and Claude Code
- OpenRouter for unified LLM access
- The open-source community for local LLM tools

---

**Note**: CCO is under active development. Features may change. Always refer to the latest documentation.
