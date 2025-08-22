# Troubleshooting Guide

## Common Issues and Solutions

### NODE_TLS_REJECT_UNAUTHORIZED Warning

**Problem**: You see a warning about `NODE_TLS_REJECT_UNAUTHORIZED` when running CCO.

```
Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections and HTTPS requests insecure
```

**Solution**: This warning appears when the environment variable is set to bypass certificate verification. To fix:

```bash
# Remove the environment variable
unset NODE_TLS_REJECT_UNAUTHORIZED

# Or set it to 1 (default secure behavior)
export NODE_TLS_REJECT_UNAUTHORIZED=1
```

**Note**: This is typically set in development environments. CCO attempts to suppress this warning but it may still appear in some contexts.

### Module Not Found Error with npx

**Problem**: When running with `npx github:mivertowski/cco`, you get:
```
Error: Cannot find module '../monitoring/logger'
```

**Solution**: The dist folder must be present. Either:
1. Clone and build locally:
   ```bash
   git clone https://github.com/mivertowski/cco.git
   cd cco
   npm install
   npm run build
   npx . init
   ```

2. Use the npm published version (when available):
   ```bash
   npx cco-cli init
   ```

### Deprecated Package Warnings

**Problem**: You see warnings about deprecated packages during installation.

**Solution**: These warnings come from transient dependencies and don't affect CCO's functionality. We've removed direct usage of deprecated packages. The warnings will disappear as upstream packages update.

### API Key Issues

**Problem**: CCO says API key is required even though you're using Claude Code subscription.

**Solution**: Ensure your config file has `use_subscription: true`:

```yaml
# .cco/config.yaml
claude_code:
  use_subscription: true  # This tells CCO to use subscription mode
  workspace: "."
```

### Claude Code Subscription Mode Limitations

**Problem**: Tasks show as "manual execution required" in subscription mode.

**Solution**: This is expected behavior. Subscription mode currently:
- Bypasses environment validation (always returns true)
- Returns instructions for manual execution in Claude Code
- Does not automate the actual code execution

For full automation, you need:
```yaml
claude_code:
  use_subscription: false
  api_key: ${ANTHROPIC_API_KEY}
```

Subscription mode is useful for:
- Testing orchestration logic without API costs
- Semi-automated workflows where you execute in Claude Code manually
- Development and debugging

### Permission Denied Errors

**Problem**: Permission errors when running CCO commands.

**Solution**: 
1. Ensure the CLI is executable:
   ```bash
   chmod +x node_modules/.bin/cco
   ```

2. Check file permissions in your project:
   ```bash
   ls -la .cco/
   ```

3. Run with proper permissions:
   ```bash
   sudo npx cco-cli init  # Only if absolutely necessary
   ```

### Build Failures

**Problem**: TypeScript compilation errors.

**Solution**:
1. Ensure you have the correct Node version:
   ```bash
   node --version  # Should be 18+
   ```

2. Clean and rebuild:
   ```bash
   npm run clean
   npm install
   npm run build
   ```

3. Check for type errors:
   ```bash
   npm run typecheck
   ```

### Session Recovery Issues

**Problem**: Can't resume a previous session.

**Solution**:
1. Check session files exist:
   ```bash
   ls -la .cco/sessions/
   ```

2. List available sessions:
   ```bash
   npx cco status
   ```

3. Resume with specific session ID:
   ```bash
   npx cco resume --session <session-id>
   ```

### Rate Limiting with Free Models

**Problem**: Getting rate limit errors with free models.

**Solution**: Free models have limited requests per day:
- Without credits: 50 requests/day
- With $10+ credits: 1000 requests/day

Consider:
1. Purchasing OpenRouter credits
2. Switching to a different free model
3. Using premium models for production

### Docker Issues

**Problem**: CCO doesn't work in Docker container.

**Solution**: Ensure environment variables are passed:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
ENV OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
ENV ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
CMD ["npm", "start"]
```

### Memory Issues with Large Projects

**Problem**: Node runs out of memory.

**Solution**: Increase Node's heap size:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npx cco start
```

## Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/mivertowski/cco/issues)
2. Review the [documentation](https://github.com/mivertowski/cco/docs)
3. Create a new issue with:
   - Your environment (OS, Node version)
   - Complete error message
   - Steps to reproduce
   - Your mission.yaml (if applicable)