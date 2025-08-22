#!/bin/bash

# CCO Local Testing Setup Script
# This script helps you test the GitHub integration locally

echo "🚀 CCO GitHub Integration Test Setup"
echo "====================================="
echo ""

# Check if we're in the CCO directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo "❌ Error: Please run this script from the CCO root directory"
    exit 1
fi

# Check for required tools
echo "📋 Checking prerequisites..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
else
    echo "✅ Node.js: $(node --version)"
fi

# Check for GitHub CLI (optional but recommended)
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI: $(gh --version | head -n 1)"
    echo "   You can use GitHub CLI authentication (recommended)"
else
    echo "⚠️  GitHub CLI not found - you'll need to use a GitHub token"
fi

# Build the project
echo ""
echo "🔨 Building CCO..."
npm run build

# Check for .env file
if [ ! -f ".env" ]; then
    echo ""
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# GitHub Integration
# Option 1: Use GitHub Personal Access Token
# GITHUB_TOKEN=ghp_your_token_here

# Option 2: Use GitHub CLI (if installed)
# Leave GITHUB_TOKEN empty to use gh CLI

# LLM Providers (at least one required for orchestration)
# OPENROUTER_API_KEY=your_openrouter_key_here
# ANTHROPIC_API_KEY=your_anthropic_key_here

# Optional: Claude Code Subscription
# CLAUDE_CODE_SUBSCRIPTION=false
EOF
    echo "✅ Created .env file - please add your API keys"
fi

# Create test config if it doesn't exist
if [ ! -f ".cco/config.yaml" ]; then
    echo ""
    echo "📝 Creating CCO config..."
    mkdir -p .cco
    cat > .cco/config.yaml << 'EOF'
# CCO Configuration for Testing
repository:
  path: "."
  auto_commit: false
  commit_frequency: "per_task"

openrouter:
  model: "claude-3-opus"
  temperature: 0.7

claude_code:
  use_subscription: false
  model: "claude-opus-4-1-20250805"

orchestrator:
  mode: "autonomous"
  max_iterations: 10
  checkpoint_interval: 5

monitoring:
  enable_telemetry: true
  log_level: "info"

persistence:
  enable: true
  path: ".cco/sessions"
EOF
    echo "✅ Created .cco/config.yaml"
fi

echo ""
echo "======================================"
echo "🎯 Test Commands"
echo "======================================"
echo ""
echo "1️⃣  Test Interactive Mode (select issues to work on):"
echo "   node dist/cli/index.js github --interactive"
echo ""
echo "2️⃣  Test with Dry Run (see issues without processing):"
echo "   node dist/cli/index.js github --interactive --dry-run"
echo ""
echo "3️⃣  Test Automated Mode (process by priority):"
echo "   node dist/cli/index.js github --auto --poll-interval 1 --max-issues 1"
echo ""
echo "4️⃣  Test Single Issue:"
echo "   node dist/cli/index.js github -i 1"
echo ""
echo "5️⃣  Test with Label Filter:"
echo "   node dist/cli/index.js github --interactive --labels documentation"
echo ""
echo "======================================"
echo "⚙️  Advanced Options"
echo "======================================"
echo ""
echo "Create PR after completion:"
echo "   --create-pr --semantic-commits"
echo ""
echo "Use different base branch:"
echo "   --base-branch develop"
echo ""
echo "Specify repository explicitly:"
echo "   -r mivertowski/CCO"
echo ""
echo "======================================"
echo "📌 Tips"
echo "======================================"
echo ""
echo "• If using GitHub CLI, authenticate first:"
echo "  gh auth login"
echo ""
echo "• For testing without API calls, add --dry-run flag"
echo ""
echo "• Watch logs in real-time:"
echo "  tail -f .cco/logs/*.log"
echo ""
echo "• Check session status:"
echo "  node dist/cli/index.js status"
echo ""

# Make the script executable
chmod +x test-setup.sh

echo "✅ Setup complete! You can now test the GitHub integration."
echo ""
echo "Next steps:"
echo "1. Edit .env to add your API keys"
echo "2. Run one of the test commands above"
echo "3. Open another terminal to monitor progress"