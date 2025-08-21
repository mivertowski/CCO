#!/bin/bash

# Test script for npx usage of CCO

echo "🧪 Testing CCO with npx..."
echo ""

# First, build the project
echo "📦 Building project..."
npm run build

echo ""
echo "✅ Build complete. Now you can use CCO with npx:"
echo ""
echo "Examples:"
echo "  npx . init                    # Initialize CCO"
echo "  npx . start -m mission.yaml   # Start orchestration"
echo "  npx . status                  # Check status"
echo "  npx . --help                  # Show help"
echo ""
echo "Or from anywhere after publishing to npm:"
echo "  npx claude-code-orchestrator init"
echo ""
echo "Or directly from GitHub:"
echo "  npx github:mivertowski/cco init"
echo ""

# Optional: Test the commands
read -p "Would you like to test 'npx . --help'? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    npx . --help
fi