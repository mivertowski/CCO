# Claude Code Orchestrator (CCO)

An automated orchestration system that manages Claude Code instances to complete complex, multi-session tasks without constant human intervention. CCO acts as an intelligent project manager, ensuring work continuity until all Definition of Done (DoD) criteria are achieved.

## 🚀 Features

- **Autonomous Task Management**: CCO manages a single Claude Code instance per repository, maintaining focus until mission completion
- **Definition of Done Driven**: Success is measured by achieving specific, measurable criteria
- **Session Persistence**: Automatic state management and recovery across sessions
- **Progress Tracking**: Real-time monitoring of DoD completion and task progress
- **Error Recovery**: Intelligent error handling with automatic recovery strategies
- **Multi-Model Support**: Works with various LLMs through OpenRouter (Claude Opus 4.1, GPT-4o, free models, etc.)
- **Claude Code Subscription Support**: Works with Claude Code subscriptions - no API key required
- **Free Model Options**: Start testing with free models from Meta, Google, Mistral, and more
- **.NET Project Support**: Built-in templates for ASP.NET Core APIs and console applications

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenRouter API key (get free credits to start)
- Anthropic API key (optional - Claude Code works with subscriptions too)

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
      priority: critical
    
    - criteria: "Unit tests with >80% coverage"
      measurable: true
      priority: high
    
    - criteria: "API documentation generated"
      measurable: true
      priority: medium
  
  constraints:
    - "Use TypeScript"
    - "Follow RESTful conventions"
```

### Mission Structure

- **title**: Brief mission name
- **repository**: Path to the target repository
- **description**: Detailed mission description
- **definition_of_done**: Array of criteria that must be met
  - **criteria**: Description of what needs to be achieved
  - **measurable**: Whether the criterion can be objectively verified
  - **priority**: `critical`, `high`, `medium`, or `low`
- **constraints**: Optional list of requirements/limitations
- **context**: Optional additional context for the mission

## 🤖 Available Models (2025)

### Free Models (via OpenRouter)
- `meta-llama/llama-3.2-3b-instruct:free` - Fast, capable open model
- `meta-llama/llama-3.2-1b-instruct:free` - Lightweight for simple tasks
- `google/gemini-2.0-flash-exp:free` - Google's experimental model
- `mistralai/mistral-7b-instruct:free` - Strong general-purpose model
- `huggingface/zephyr-7b-beta:free` - Community fine-tuned model
- `openchat/openchat-7b:free` - Optimized for conversations
- `gryphe/mythomist-7b:free` - Creative and helpful
- `undi95/toppy-m-7b:free` - Balanced performance

### Premium Models
- `anthropic/claude-opus-4-1` - Most capable Claude model (2025)
- `anthropic/claude-3.5-sonnet` - Fast and efficient
- `openai/gpt-4o` - Latest GPT-4 variant
- `openai/gpt-4o-mini` - Cost-effective GPT-4
- `google/gemini-pro-1.5` - Google's flagship model
- `deepseek/deepseek-v3` - Excellent for coding tasks
- `deepseek/deepseek-r1` - Advanced reasoning model

### Claude Code Modes
- **API Mode**: Full automation using Anthropic API key
- **Subscription Mode**: Manual execution mode (no API key needed)
  - Environment validation bypassed (always returns true)
  - Provides task instructions for manual execution in Claude Code
  - Useful for testing and development with Claude Code subscription

## 🚀 Usage

### Start Orchestration

```bash
# Start with default mission.yaml
cco start

# Start with specific mission file
cco start --mission path/to/mission.yaml

# Start with custom config
cco start --config custom-config.yaml
```

### Check Status

```bash
# Check all active sessions
cco status

# Check specific session
cco status --session <session-id>
```

### Resume Session

```bash
# Resume interactive (select from list)
cco resume

# Resume specific session
cco resume --session <session-id>
```

## 🏗️ Architecture

CCO follows a 1:1:1 model:
- **One Repository**: Each orchestration operates on a single git repository
- **One Orchestrator**: Dedicated CCO instance for the mission
- **One Claude Code**: Single CC worker managed throughout
- **One Mission**: Focused execution until completion

### Core Components

1. **Mission Parser**: Validates and processes mission files
2. **Orchestrator Core**: Main execution loop managing the workflow
3. **Manager LLM**: Strategic decision-making via OpenRouter
4. **Claude Code Client**: Task execution interface
5. **Session Manager**: State persistence and recovery
6. **Progress Tracker**: DoD monitoring and validation

## 📊 Monitoring

### Logs

CCO maintains detailed logs in `.cco/logs/`:
- `combined.log` - All orchestration events
- `error.log` - Error events only
- `sessions/` - Individual session logs

### Progress Reports

CCO generates progress reports showing:
- Completion percentage
- Completed vs pending criteria
- Critical criteria status
- Iteration count
- Error summary

## 🔧 Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Type check
npm run typecheck
```

## 🐳 Docker Support

```bash
# Build Docker image
docker build -t cco .

# Run with Docker
docker run -v /path/to/repo:/repo \
  -e OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  cco
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built to work with [Claude Code](https://www.anthropic.com)
- Powered by [OpenRouter](https://openrouter.ai) for LLM flexibility
- Inspired by autonomous agent architectures

## 📚 Documentation

For detailed documentation, see the [docs](docs/) directory:
- [Concept & Specification](docs/concept.md)
- [API Reference](docs/api.md) (coming soon)
- [Mission Examples](mission-examples/)

## ⚠️ Important Notes

- CCO is designed for development environments
- Always review generated code before deployment
- Keep API keys secure and never commit them
- Monitor token usage to manage costs
- CCO continues until DoD is met - set appropriate criteria

## 🐛 Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure environment variables are set correctly
2. **Permission Errors**: Check file system permissions for `.cco` directory
3. **Memory Issues**: Increase Node.js heap size if needed: `NODE_OPTIONS="--max-old-space-size=4096"`
4. **Session Recovery**: Use `cco resume` to continue interrupted sessions

## 📞 Support

- GitHub Issues: [Report bugs or request features](https://github.com/mivertowski/cco/issues)
- Documentation: [Read the docs](https://github.com/mivertowski/cco/docs)

---

Built with ❤️ for developers who value automation and efficiency