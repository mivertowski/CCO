# Getting Started with CCO

Welcome to Claude Code Orchestrator! This guide will help you get up and running quickly.

## Table of Contents
- [Quick Start (5 minutes)](#quick-start-5-minutes)
- [Installation Options](#installation-options)
- [Your First Mission](#your-first-mission)
- [Configuration Basics](#configuration-basics)
- [Using Free Models](#using-free-models)
- [GitHub Integration](#github-integration)
- [Next Steps](#next-steps)

## Quick Start (5 minutes)

Get CCO running in under 5 minutes:

```bash
# 1. Install and initialize CCO
npx cco-cli init

# 2. Set your API key
export OPENROUTER_API_KEY="your_api_key_here"

# 3. Create a simple mission
cat > mission.yaml << EOF
mission:
  title: "Create Hello World API"
  repository: "."
  description: "Build a simple Express.js API"
  
  definition_of_done:
    - criteria: "GET /hello endpoint returns 'Hello World'"
      measurable: true
      priority: "high"
EOF

# 4. Run the mission
npx cco-cli start --mission mission.yaml
```

That's it! CCO will now work on completing your mission.

## Installation Options

### Option 1: No Installation (Recommended for trying CCO)

```bash
# Run directly with npx
npx cco-cli init
npx cco-cli start --mission mission.yaml
```

### Option 2: Global Installation

```bash
# Install globally
npm install -g cco-cli

# Now use the 'cco' command
cco init
cco start --mission mission.yaml
```

### Option 3: Local Development

```bash
# Clone the repository
git clone https://github.com/mivertowski/cco.git
cd cco

# Install dependencies
npm install

# Build the project
npm run build

# Use locally
npx . init
npx . start --mission mission.yaml
```

## Your First Mission

### Step 1: Get API Keys

#### OpenRouter (Required)
1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Sign up for a free account
3. Get your API key from settings
4. You get free credits to start!

#### Anthropic (Optional)
- Only needed if not using Claude Code subscription
- Get from [Anthropic Console](https://console.anthropic.com)

### Step 2: Configure Environment

Create a `.env` file:

```env
# Required
OPENROUTER_API_KEY=sk-or-v1-your_key_here

# Optional - only if not using subscription
ANTHROPIC_API_KEY=sk-ant-your_key_here

# Optional
LOG_LEVEL=INFO
```

Or export directly:

```bash
export OPENROUTER_API_KEY="sk-or-v1-your_key_here"
```

### Step 3: Initialize CCO

```bash
cco init
```

This creates:
```
.cco/
├── config.yaml       # Configuration
├── sessions/         # Session data
└── logs/            # Execution logs
```

### Step 4: Create Your Mission

Create `mission.yaml`:

```yaml
mission:
  title: "Build a Todo API"
  repository: "."
  description: |
    Create a REST API for managing todo items with CRUD operations
    
  definition_of_done:
    - criteria: "GET /todos returns list of todos"
      measurable: true
      priority: "high"
      
    - criteria: "POST /todos creates a new todo"
      measurable: true
      priority: "high"
      
    - criteria: "PUT /todos/:id updates a todo"
      measurable: true
      priority: "medium"
      
    - criteria: "DELETE /todos/:id deletes a todo"
      measurable: true
      priority: "medium"
      
    - criteria: "Data persists in memory"
      measurable: true
      priority: "low"
```

### Step 5: Run Your Mission

```bash
cco start --mission mission.yaml
```

Watch as CCO:
1. Analyzes your requirements
2. Plans the implementation
3. Executes the tasks
4. Tracks progress
5. Completes the DoD criteria

## Configuration Basics

### Default Configuration

CCO creates this default config in `.cco/config.yaml`:

```yaml
orchestrator:
  mode: "single_instance"
  max_iterations: 1000
  checkpoint_interval: 5
  
repository:
  path: "."
  auto_commit: true
  
openrouter:
  api_key: ${OPENROUTER_API_KEY}
  model: "meta-llama/llama-3.2-3b-instruct:free"
  temperature: 0.5
  
claude_code:
  use_sdk: true  # Use official SDK
  use_subscription: false
  api_key: ${ANTHROPIC_API_KEY}
  workspace: "."
```

### Key Settings Explained

| Setting | Description | Default |
|---------|-------------|---------|
| `max_iterations` | Maximum orchestration cycles | 1000 |
| `checkpoint_interval` | Save progress every N iterations | 5 |
| `model` | OpenRouter model to use | Free Llama model |
| `use_sdk` | Use Claude Code SDK | true |
| `use_subscription` | Use Claude subscription (no API key) | false |

## Using Free Models

### Available Free Models

Start with these free models on OpenRouter:

```yaml
openrouter:
  # Option 1: Meta Llama (Recommended)
  model: "meta-llama/llama-3.2-3b-instruct:free"
  
  # Option 2: Google Gemini
  # model: "google/gemini-2.0-flash-exp:free"
  
  # Option 3: Mistral
  # model: "mistralai/mistral-7b-instruct:free"
  
  # Option 4: Qwen
  # model: "qwen/qwen-2-7b-instruct:free"
```

### Free Model Limitations

- **Rate limits**: 1-10 requests per minute
- **Daily limits**: 50-200 requests per day
- **Solution**: Purchase $10 credits for 1000+ requests/day

### Upgrading to Premium Models

When ready for production:

```yaml
openrouter:
  # Best overall performance
  model: "anthropic/claude-3-opus"
  
  # Fast and capable
  # model: "openai/gpt-4o"
  
  # Cost-effective
  # model: "anthropic/claude-3-haiku"
```

## GitHub Integration

### Quick GitHub Setup

1. **Create GitHub Issue**:
```markdown
Title: [CCO] Add user authentication

## Definition of Done
- [ ] Login endpoint
- [ ] Logout endpoint
- [ ] JWT tokens
```

2. **Add GitHub Action** (`.github/workflows/cco.yml`):
```yaml
name: CCO Runner
on:
  issue_comment:
    types: [created]
jobs:
  run:
    if: contains(github.event.comment.body, '/cco run')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          npx cco github-mission --issue ${{ github.event.issue.number }}
```

3. **Trigger**: Comment `/cco run` on the issue

## Common Use Cases

### 1. Building an API

```yaml
mission:
  title: "REST API Development"
  repository: "."
  
  definition_of_done:
    - criteria: "Express server running on port 3000"
    - criteria: "CRUD endpoints for resource"
    - criteria: "Input validation"
    - criteria: "Error handling"
    - criteria: "Basic tests"
```

### 2. Adding Tests

```yaml
mission:
  title: "Test Coverage Improvement"
  repository: "."
  
  definition_of_done:
    - criteria: "Unit tests for all functions"
    - criteria: "Integration tests for API"
    - criteria: "Test coverage above 80%"
    - criteria: "All tests passing"
```

### 3. Refactoring Code

```yaml
mission:
  title: "Code Refactoring"
  repository: "."
  
  definition_of_done:
    - criteria: "Extract common functions"
    - criteria: "Improve error handling"
    - criteria: "Update documentation"
    - criteria: "Maintain all tests passing"
```

### 4. Documentation

```yaml
mission:
  title: "Documentation Update"
  repository: "."
  
  definition_of_done:
    - criteria: "API documentation complete"
    - criteria: "README updated"
    - criteria: "Code comments added"
    - criteria: "Examples provided"
```

## Monitoring Progress

### Check Status

```bash
# Current status
cco status

# Detailed session info
cco status --session <session-id>

# List all sessions
cco status --list
```

### View Logs

```bash
# Real-time logs
tail -f .cco/logs/*.log

# Filter errors
grep ERROR .cco/logs/*.log

# View specific session
cat .cco/sessions/<session-id>.json
```

### Progress Indicators

CCO shows progress in real-time:
```
🚀 Starting orchestration...
✓ DoD 1/5: Express server running
✓ DoD 2/5: GET endpoint implemented
⚡ DoD 3/5: POST endpoint in progress...
○ DoD 4/5: PUT endpoint pending
○ DoD 5/5: DELETE endpoint pending

Progress: 40% complete
```

## Tips for Success

### 1. Start Small
Begin with simple missions to understand CCO's capabilities:
- Create a single endpoint
- Add a simple feature
- Write basic tests

### 2. Clear DoD Criteria
Make criteria specific and measurable:
- ✅ "GET /users returns JSON array"
- ❌ "Make API better"

### 3. Use Checkpoints
CCO saves progress automatically:
- Resume interrupted sessions with `cco resume`
- Review checkpoints in `.cco/sessions/`

### 4. Monitor Token Usage
Track costs and usage:
```bash
# View token usage in logs
grep "Token usage" .cco/logs/*.log

# Estimate costs
grep "Estimated cost" .cco/logs/*.log
```

### 5. Iterate and Refine
- Start with basic implementation
- Add complexity gradually
- Use feedback to improve missions

## Troubleshooting

### Common Issues

**"API key not found"**
```bash
# Check if set
echo $OPENROUTER_API_KEY

# Set it
export OPENROUTER_API_KEY="your_key"
```

**"Rate limit exceeded"**
- Wait 1 minute (free tier)
- Switch to different model
- Purchase credits ($10 recommended)

**"Module not found"**
```bash
# Rebuild
npm run clean
npm install
npm run build
```

**"Claude Code environment validation failed"**
```yaml
# Use subscription mode
claude_code:
  use_subscription: true
```

## Next Steps

Now that you're up and running:

1. **Explore Templates**: Check `templates/` for mission examples
2. **Read Documentation**:
   - [Mission Templates](mission-templates.md) - Pre-built missions
   - [GitHub Integration](github-integration.md) - Automate with GitHub
   - [SDK Integration](sdk-integration.md) - Use Claude Code SDK
   - [Configuration Reference](configuration.md) - All settings explained

3. **Join Community**:
   - [GitHub Discussions](https://github.com/mivertowski/cco/discussions)
   - [Report Issues](https://github.com/mivertowski/cco/issues)
   - [Contribute](https://github.com/mivertowski/cco/pulls)

4. **Advanced Features**:
   - Multi-phase missions
   - Custom validation
   - Webhook integration
   - API automation

## Getting Help

If you need help:

1. Check [Troubleshooting Guide](troubleshooting.md)
2. Search [GitHub Issues](https://github.com/mivertowski/cco/issues)
3. Ask in [Discussions](https://github.com/mivertowski/cco/discussions)
4. Read the [FAQ](faq.md)

## Example Output

Here's what a successful mission looks like:

```
$ cco start --mission mission.yaml

🚀 Starting orchestration...
✔ Mission loaded successfully
Mission: Build a Todo API
Repository: /home/user/todo-api
DoD Criteria: 5

📋 Analyzing requirements...
✓ Planning implementation strategy
✓ Setting up Express server
✓ Implementing GET /todos
✓ Implementing POST /todos
✓ Implementing PUT /todos/:id
✓ Implementing DELETE /todos/:id
✓ Adding in-memory storage
✓ Testing endpoints
✓ Generating documentation

✅ Mission completed successfully!
Total iterations: 12
Completion: 100%
Artifacts created: 8
Token usage: 45,231
Estimated cost: $0.68

All Definition of Done criteria met! 🎉
```

---

Ready to build something amazing? Start with a simple mission and let CCO handle the implementation details!