#!/bin/bash

echo "🔍 Debug Orchestration Test"
echo "=========================="
echo ""

# Load environment
set -a
source .env
set +a

# Check environment variables
echo "Environment Check:"
echo "- OPENROUTER_API_KEY: ${OPENROUTER_API_KEY:+SET (${#OPENROUTER_API_KEY} chars)}"
echo "- ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:+SET (${#ANTHROPIC_API_KEY} chars)}"
echo "- CLAUDE_CODE_SUBSCRIPTION: ${CLAUDE_CODE_SUBSCRIPTION:-not set}"
echo ""

# Check config file
echo "Config File Check:"
if [ -f .cco/config.yaml ]; then
  echo "✅ .cco/config.yaml exists"
  echo "Content preview:"
  head -20 .cco/config.yaml | sed 's/^/  /'
else
  echo "❌ .cco/config.yaml not found"
fi
echo ""

# Run with debug logging
echo "Running orchestration with debug output..."
echo "=========================================="
NODE_ENV=development DEBUG=* node -r dotenv/config dist/cli/index.js github -i 2 2>&1 | tee debug-output.log | grep -E "(OpenRouter|client|DoD|iteration|complete|progress)" | head -50

echo ""
echo "Full log saved to: debug-output.log"
echo ""
echo "Check for issues:"
grep -i "error\|fail\|null\|undefined" debug-output.log | head -10