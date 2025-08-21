# Using CCO with npx

## Quick Start (No Installation Required)

CCO can be used directly with `npx` without installing it globally. This is perfect for:
- Testing CCO before committing to installation
- Running one-off orchestrations
- Using in CI/CD pipelines
- Keeping your global namespace clean

## Usage Methods

### 1. From npm Registry (After Publishing)

```bash
# Initialize CCO in current directory
npx claude-code-orchestrator init

# Start orchestration with a mission file
npx claude-code-orchestrator start --mission mission.yaml

# Check status
npx claude-code-orchestrator status

# Resume a session
npx claude-code-orchestrator resume
```

Short form using the `cco` alias:
```bash
npx claude-code-orchestrator@latest init
# or if the package name is unique enough:
npx cco init
```

### 2. Directly from GitHub

```bash
# Using GitHub repository directly (no npm publish required)
npx github:mivertowski/cco init
npx github:mivertowski/cco start --mission mission.yaml
```

### 3. From a Specific Branch or Tag

```bash
# Use a specific version tag
npx github:mivertowski/cco#v0.1.0 init

# Use a development branch
npx github:mivertowski/cco#develop init
```

### 4. From Local Development

```bash
# During development, from the project directory
npm run build
npx . init
npx . start --mission mission.yaml
```

## Complete Workflow Example

```bash
# 1. Create a new project directory
mkdir my-ai-project
cd my-ai-project

# 2. Set up environment variables
export OPENROUTER_API_KEY="your-key-here"
# Optional: export ANTHROPIC_API_KEY="your-key-here"

# 3. Initialize CCO
npx claude-code-orchestrator init

# 4. Create your mission file
cat > mission.yaml << 'EOF'
mission:
  title: "Build Hello World API"
  repository: "."
  description: "Create a simple REST API"
  definition_of_done:
    - criteria: "Express server with /hello endpoint"
      priority: critical
    - criteria: "Returns JSON response"
      priority: high
EOF

# 5. Start orchestration
npx claude-code-orchestrator start --mission mission.yaml

# 6. Check status
npx claude-code-orchestrator status
```

## Using with Free Models

```bash
# Create a config that uses free models
cat > .cco/config.yaml << 'EOF'
openrouter:
  api_key: ${OPENROUTER_API_KEY}
  model: "meta-llama/llama-3.2-3b-instruct:free"
  temperature: 0.5

claude_code:
  use_subscription: true  # No API key needed
  workspace: "."
EOF

# Run with the free configuration
npx claude-code-orchestrator start --config .cco/config.yaml
```

## CI/CD Pipeline Usage

### GitHub Actions

```yaml
name: AI Orchestration
on:
  workflow_dispatch:
    inputs:
      mission:
        description: 'Mission file path'
        required: true
        default: 'mission.yaml'

jobs:
  orchestrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Run CCO
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          npx claude-code-orchestrator init
          npx claude-code-orchestrator start --mission ${{ inputs.mission }}
```

### GitLab CI

```yaml
orchestrate:
  image: node:18
  script:
    - npx claude-code-orchestrator init
    - npx claude-code-orchestrator start --mission mission.yaml
  variables:
    OPENROUTER_API_KEY: $OPENROUTER_API_KEY
    ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY
```

## Docker Usage

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY mission.yaml .
ENV OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
RUN npx claude-code-orchestrator init
CMD ["npx", "claude-code-orchestrator", "start", "--mission", "mission.yaml"]
```

## Advantages of npx Usage

1. **No Installation**: Run immediately without `npm install -g`
2. **Always Latest**: Automatically uses the latest version
3. **Clean System**: Doesn't pollute global npm packages
4. **Version Flexibility**: Easy to test different versions
5. **CI/CD Friendly**: Perfect for automated pipelines
6. **Team Consistency**: Everyone uses the same version

## Troubleshooting

### Command Not Found
```bash
# Ensure you're using the full package name
npx claude-code-orchestrator init
# Not just: npx cco init (unless package is installed)
```

### Using Specific Version
```bash
# Force latest version
npx claude-code-orchestrator@latest init

# Use specific version
npx claude-code-orchestrator@0.1.0 init
```

### Cache Issues
```bash
# Clear npx cache if having issues
npx clear-npx-cache
# Or manually: rm -rf ~/.npm/_npx

# Force fresh download
npx --ignore-existing claude-code-orchestrator init
```

### Behind Corporate Proxy
```bash
# Set proxy for npm/npx
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
npx claude-code-orchestrator init
```

## Development Workflow

For developers working on CCO:

```bash
# Clone and build
git clone https://github.com/mivertowski/cco.git
cd cco
npm install
npm run build

# Test locally with npx
npx . init
npx . start --mission test-mission.yaml

# Or link globally for development
npm link
cco init  # Now available globally during development
```

## Publishing to npm

To make CCO available via `npx` from npm registry:

```bash
# Build the project
npm run build

# Login to npm
npm login

# Publish
npm publish

# Now anyone can use:
npx claude-code-orchestrator init
```

## Version Management

```bash
# View available versions
npm view claude-code-orchestrator versions

# Use specific version
npx claude-code-orchestrator@0.1.0 init

# Use latest beta
npx claude-code-orchestrator@beta init

# Use from specific commit
npx github:mivertowski/cco#commit-hash init
```