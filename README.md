# Claude Code Orchestrator (CCO)

An automated orchestration system that manages Claude Code instances to complete complex, multi-session tasks without constant human intervention. CCO acts as an intelligent project manager, ensuring work continuity until all Definition of Done (DoD) criteria are achieved.

## 🚀 Features

- **Autonomous Task Management**: CCO manages a single Claude Code instance per repository, maintaining focus until mission completion
- **Definition of Done Driven**: Success is measured by achieving specific, measurable criteria
- **Session Persistence**: Automatic state management and recovery across sessions
- **Progress Tracking**: Real-time monitoring of DoD completion and task progress
- **Error Recovery**: Intelligent error handling with automatic recovery strategies
- **Multi-Model Support**: Works with various LLMs through OpenRouter (Claude Opus 4.1, GPT-4o, free models, etc.)
- **Claude Code SDK Integration**: Official SDK support for improved automation and reliability
- **GitHub Integration**: Convert issues to missions, create PRs, semantic commits, and GitHub Actions support
- **Claude Code Subscription Support**: Works with Claude Code subscriptions - no API key required
- **Free Model Options**: Start testing with free models from Meta, Google, Mistral, and more
- **.NET Project Support**: Built-in templates for ASP.NET Core APIs and console applications

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenRouter API key (get free credits to start)
- Anthropic API key (optional - Claude Code works with subscriptions too)
- GitHub CLI (optional - for GitHub integration features)

## 🛠️ Installation

### Quick Start with npx (No Installation)

```bash
# Run directly without installing
npx claude-code-orchestrator init
npx claude-code-orchestrator start --mission mission.yaml

# Or from GitHub directly
npx github:mivertowski/cco init
```

### Traditional Installation

```bash
# Clone the repository
git clone https://github.com/mivertowski/cco.git
cd cco

# Install dependencies
npm install

# Build the project
npm run build

# Install globally (optional)
npm install -g .
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
# Required
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional - only if not using Claude Code subscription
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional - for GitHub integration
GITHUB_TOKEN=your_github_token

# Optional configuration
LOG_LEVEL=INFO
NODE_ENV=development
```

### Initialize CCO

```bash
# Initialize CCO in your project directory
cco init

# Initialize with a mission file
cco init --mission mission.yaml
```

This creates a `.cco` directory with:
- `config.yaml` - Configuration file
- `sessions/` - Session state storage
- `logs/` - Orchestration logs

## 🐙 GitHub Integration

CCO now includes deep GitHub integration for seamless workflow automation:

### Features
- **Issue-to-Mission**: Convert GitHub issues directly to executable missions
- **Automated PR Creation**: Generate pull requests with full mission context
- **Semantic Commits**: Automatic conventional commit messages
- **GitHub Actions**: Run missions via workflows and issue comments
- **Progress Tracking**: Update issues with mission progress

### Quick Start with GitHub

1. **Create a GitHub Issue** with CCO format:
```markdown
Title: [CCO] Implement user authentication

## Definition of Done
- [ ] JWT authentication implemented
- [ ] Password hashing with bcrypt
- [ ] Login/logout endpoints
- [ ] Unit tests with 90% coverage
```

2. **Trigger via Comment**: Add `/cco run` in an issue comment

3. **GitHub Action** (add to `.github/workflows/cco.yml`):
```yaml
name: CCO Mission
on:
  issue_comment:
    types: [created]
jobs:
  run-mission:
    if: contains(github.event.comment.body, '/cco run')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: |
          npm install -g claude-code-orchestrator
          cco init
          cco github-mission --issue ${{ github.event.issue.number }}
```

See [GitHub Integration Guide](docs/github-integration.md) for detailed setup.

## 📝 Creating a Mission

Missions define what CCO should accomplish. Create a `mission.yaml` file:

```yaml
mission:
  title: "Build REST API for Task Management"
  repository: "./my-project"
  description: |
    Create a complete REST API with CRUD operations for tasks
    
  definition_of_done:
    - criteria: "All CRUD endpoints implemented"
      measurable: true
      priority: "critical"
    
    - criteria: "Unit tests with >80% coverage"
      measurable: true
      priority: "high"
    
    - criteria: "API documentation generated"
      measurable: true
      priority: "medium"
  
  constraints:
    - "Use Express.js framework"
    - "Include input validation"
    - "Follow RESTful conventions"
```

## 🎯 Running Orchestration

### Basic Usage

```bash
# Start orchestration with a mission file
cco start --mission mission.yaml

# Use SDK mode (recommended)
cco start --mission mission.yaml --use-sdk

# Resume a previous session
cco resume --session <session-id>

# Check status
cco status
```

### Advanced Options

```bash
# Use specific model
cco start --mission mission.yaml --model "openai/gpt-4o"

# Set custom configuration
cco start --mission mission.yaml --config custom-config.yaml

# Dry run (plan mode)
cco start --mission mission.yaml --plan-only
```

## 🤖 Claude Code SDK

CCO supports the official Claude Code SDK for improved automation:

### Enable SDK Mode

```yaml
# .cco/config.yaml
claude_code:
  use_sdk: true  # Enable SDK mode (default)
  api_key: ${ANTHROPIC_API_KEY}  # Optional with subscription
```

### SDK Benefits
- Native tool integration
- Better error handling
- Accurate token tracking
- Session management
- Permission controls

See [SDK Integration Guide](docs/sdk-integration.md) for details.

## 📊 Monitoring Progress

CCO provides multiple ways to monitor mission progress:

### Command Line
```bash
# Check current status
cco status

# View session details
cco status --session <session-id>

# List all sessions
cco status --list
```

### Logs
```bash
# View real-time logs
tail -f .cco/logs/*.log

# Filter by log level
grep ERROR .cco/logs/*.log
```

### Web Dashboard (Coming Soon)
```bash
# Start monitoring dashboard
cco dashboard --port 8080
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- --grep "orchestrator"
```

### Test with Free Models
```yaml
# .cco/config.yaml
openrouter:
  model: "meta-llama/llama-3.2-3b-instruct:free"  # Free model
  # Or try:
  # model: "google/gemini-2.0-flash-exp:free"
  # model: "mistralai/mistral-7b-instruct:free"
```

## 🚀 Example Missions

CCO includes templates for common scenarios:

### Web API Development
```bash
cco start --mission templates/web-api.yaml
```

### Refactoring Project
```bash
cco start --mission templates/refactor.yaml
```

### Test Suite Creation
```bash
cco start --mission templates/testing.yaml
```

### Documentation Generation
```bash
cco start --mission templates/documentation.yaml
```

See [templates/](templates/) directory for more examples.

## 🔧 Advanced Configuration

### Full Configuration Example
```yaml
orchestrator:
  mode: "single_instance"
  max_iterations: 1000
  checkpoint_interval: 5
  
repository:
  path: "."
  auto_commit: true
  commit_frequency: "per_session"
  
openrouter:
  api_key: ${OPENROUTER_API_KEY}
  model: "anthropic/claude-3-opus"
  temperature: 0.5
  
claude_code:
  use_sdk: true
  use_subscription: false
  api_key: ${ANTHROPIC_API_KEY}
  workspace: "."
  max_file_size: 100000
  
github:
  enable: true
  auto_pr: true
  semantic_commits: true
  branch_strategy: "git-flow"
  
persistence:
  type: "file"
  path: ".cco/sessions"
  
monitoring:
  log_level: "INFO"
  log_path: ".cco/logs"
  metrics_enabled: true
```

## 🐛 Troubleshooting

### Common Issues

**API Key Issues**
```bash
# Check environment variables
echo $OPENROUTER_API_KEY
echo $ANTHROPIC_API_KEY

# Or set them directly
export OPENROUTER_API_KEY="your_key"
```

**Rate Limiting**
- Use different models
- Add delays between requests
- Purchase OpenRouter credits for higher limits

**Module Not Found**
```bash
# Rebuild the project
npm run clean
npm install
npm run build
```

See [Troubleshooting Guide](docs/troubleshooting.md) for more solutions.

## 📚 Documentation

- [Getting Started Guide](docs/getting-started.md)
- [Mission Templates](docs/mission-templates.md)
- [Configuration Reference](docs/configuration.md)
- [GitHub Integration](docs/github-integration.md)
- [SDK Integration](docs/sdk-integration.md)
- [API Reference](docs/api-reference.md)
- [Troubleshooting](docs/troubleshooting.md)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Clone repo
git clone https://github.com/mivertowski/cco.git
cd cco

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://www.anthropic.com/) for Claude and the Claude Code SDK
- [OpenRouter](https://openrouter.ai/) for multi-model support
- All contributors and users of CCO

## 📮 Support

- **Issues**: [GitHub Issues](https://github.com/mivertowski/cco/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mivertowski/cco/discussions)
- **Email**: support@example.com

---

**Note**: This project is in active development. Features and APIs may change. Always check the [releases](https://github.com/mivertowski/cco/releases) page for the latest stable version.