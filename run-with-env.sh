#!/bin/bash
# Load .env file and run CCO
set -a
source .env
set +a

# Run CCO with all arguments passed through
node dist/cli/index.js "$@"