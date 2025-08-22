#!/bin/bash

# NPM Publication Script for Claude Code Orchestrator

set -e

echo "🚀 Preparing to publish Claude Code Orchestrator to NPM..."

# Check if logged in to NPM
if ! npm whoami &> /dev/null; then
    echo "❌ Not logged in to NPM. Please run 'npm login' first."
    exit 1
fi

# Clean and build
echo "🧹 Cleaning previous builds..."
npm run clean

echo "🔨 Building project..."
npm run build

echo "🧪 Running tests..."
npm test

echo "📦 Package contents:"
npm pack --dry-run

# Confirm publication
echo ""
echo "Ready to publish version $(node -p "require('./package.json').version")"
echo "This will publish to: https://www.npmjs.com/package/cco-cli"
read -p "Continue with publication? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Publishing to NPM..."
    npm publish --access public
    
    echo "✅ Successfully published!"
    echo "View at: https://www.npmjs.com/package/cco-cli"
    
    # Create git tag
    VERSION=$(node -p "require('./package.json').version")
    git tag -a "v$VERSION" -m "Release v$VERSION"
    echo "📌 Created git tag v$VERSION"
    echo "Push tag with: git push origin v$VERSION"
else
    echo "❌ Publication cancelled"
    exit 1
fi