#!/bin/bash

# Quick test script for GitHub integration
# Run this in a separate terminal window

echo "🧪 CCO GitHub Integration Test"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_test() {
    echo -e "${BLUE}▶ TEST:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ SUCCESS:${NC} $1"
}

print_error() {
    echo -e "${RED}❌ ERROR:${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ️  INFO:${NC} $1"
}

# Check if built
if [ ! -d "dist" ]; then
    print_error "Project not built. Run: npm run build"
    exit 1
fi

# Menu for test selection
echo "Select test mode:"
echo ""
echo "1) View available issues (dry run)"
echo "2) Interactive mode - Select issues to process"
echo "3) Test single issue processing"
echo "4) Automated mode - Process by priority"
echo "5) Check current repository issues"
echo "6) View help and all options"
echo ""
read -p "Enter choice [1-6]: " choice

case $choice in
    1)
        print_test "Listing all open issues..."
        echo ""
        # Use gh CLI to list issues
        if command -v gh &> /dev/null; then
            gh issue list --limit 10
        else
            print_info "Install gh CLI for better issue viewing"
            print_info "Run: node dist/cli/index.js github --interactive"
        fi
        ;;
        
    2)
        print_test "Starting interactive mode..."
        print_info "You'll be able to select which issues to process"
        echo ""
        sleep 2
        node dist/cli/index.js github --interactive
        ;;
        
    3)
        print_test "Processing a single issue..."
        read -p "Enter issue number: " issue_num
        echo ""
        print_info "Processing issue #$issue_num"
        node dist/cli/index.js github -i $issue_num
        ;;
        
    4)
        print_test "Starting automated mode..."
        print_info "This will process issues by priority"
        print_info "Press Ctrl+C to stop"
        echo ""
        read -p "Poll interval in minutes (default 1): " interval
        interval=${interval:-1}
        read -p "Max issues per run (default 1): " max_issues
        max_issues=${max_issues:-1}
        echo ""
        node dist/cli/index.js github --auto --poll-interval $interval --max-issues $max_issues
        ;;
        
    5)
        print_test "Checking repository issues..."
        echo ""
        if command -v gh &> /dev/null; then
            echo "Open Issues:"
            gh issue list --state open --limit 10
            echo ""
            echo "Issue Statistics:"
            gh issue list --state all --limit 100 --json state | jq '[.[] | .state] | group_by(.) | map({state: .[0], count: length})'
        else
            print_info "GitHub CLI not installed"
            print_info "Install with: brew install gh (macOS) or see https://cli.github.com"
        fi
        ;;
        
    6)
        print_test "Showing help..."
        echo ""
        node dist/cli/index.js github --help
        ;;
        
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "=============================="
print_success "Test completed!"
echo ""
echo "Other useful commands:"
echo "• Check status: node dist/cli/index.js status"
echo "• View logs: tail -f .cco/logs/*.log"
echo "• Resume session: node dist/cli/index.js resume"