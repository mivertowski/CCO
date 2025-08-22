# Claude Code SDK Integration

CCO now supports the official Claude Code SDK (`@anthropic-ai/claude-code`) for automated execution, providing better integration and more reliable automation compared to the legacy API-based approach.

## Overview

The SDK integration offers two execution modes:
- **SDK Mode** (Recommended): Uses the official Claude Code SDK for direct automation with Claude Opus 4.1
- **Legacy Mode**: Uses the Anthropic API directly (for backward compatibility)

### Key Features
- **Claude Opus 4.1**: Latest and most capable model by default
- **Automatic Permission Bypass**: Full automation without user prompts
- **Multi-Turn Conversations**: Configurable iteration limits
- **Session Management**: Persistent context across operations

## Configuration

### Enable SDK Mode (Default)

The SDK is enabled by default in new configurations:

```yaml
# .cco/config.yaml
claude_code:
  use_sdk: true  # Enable SDK mode (default)
  api_key: ${ANTHROPIC_API_KEY}  # Optional with Claude Code subscription
  workspace: "."
```

### Using with Claude Code Subscription

If you have a Claude Code subscription, you can use the SDK without an API key:

```yaml
claude_code:
  use_sdk: true
  use_subscription: true  # Use subscription instead of API key
  workspace: "."
```

### Command Line Usage

You can explicitly enable SDK mode when starting orchestration:

```bash
# Use SDK mode explicitly
npx cco start --mission mission.yaml --use-sdk

# SDK mode is default, so this also works
npx cco start --mission mission.yaml
```

## SDK vs Legacy Mode Comparison

| Feature | SDK Mode | Legacy Mode |
|---------|----------|-------------|
| Automation | Full automation with tool access | API-based with manual parsing |
| Tool Support | Native tool integration | Custom tool implementation |
| Error Handling | Built-in retry and recovery | Manual error handling |
| Token Tracking | Accurate usage reporting | Estimated usage |
| Model Support | Latest Claude models | All Anthropic models |
| Turn Limits | Configurable (default 10) | No hard limit |
| Subscription Support | Native support | Workaround mode |

## SDK Configuration Options

```typescript
interface ClaudeCodeSDKConfig {
  apiKey?: string;           // Optional, uses ANTHROPIC_API_KEY env var
  projectPath: string;       // Working directory for code operations
  maxTurns: number;          // Max conversation turns (default: 10)
  model: string;             // Model to use (default: claude-opus-4-1-20250805)
  temperature: number;       // Response randomness 0-1 (default: 0.3)
  systemPrompt?: string;     // Custom system prompt
  planMode: boolean;         // Analysis without modifications (default: false)
  jsonMode: boolean;         // Structured JSON output (default: false)
}
```

## Environment Setup

### Prerequisites

1. **Install Claude Code SDK**:
   ```bash
   npm install @anthropic-ai/claude-code
   ```

2. **Set API Key** (if not using subscription):
   ```bash
   export ANTHROPIC_API_KEY=your-api-key
   ```

3. **Verify Installation**:
   ```bash
   npx cco init
   ```

## SDK Features

### Tool Access
The SDK provides access to various tools for code operations:
- File operations (read, write, edit)
- Code execution and testing
- Code search and navigation
- Terminal command execution

### Permission Modes
Control how the SDK handles file modifications:
- `default`: Ask for permission before changes
- `acceptEdits`: Auto-accept all edits
- `bypassPermissions`: Skip all permission checks (default for automation)
- `plan`: Analyze without making changes

**Note**: CCO uses `bypassPermissions` mode by default for fully automated execution.

### Session Management
The SDK maintains session context across multiple turns:
```typescript
// Start a session
client.startSession(sessionId);

// Execute tasks with context
await client.execute(task, context);

// End session
client.endSession();
```

## Troubleshooting

### Common Issues

1. **"Cannot find module '@anthropic-ai/claude-code'"**
   - Run: `npm install @anthropic-ai/claude-code`

2. **"Environment validation failed"**
   - Check ANTHROPIC_API_KEY is set (unless using subscription)
   - Verify network connectivity
   - Ensure Claude Code CLI is accessible

3. **"Query ended with error_max_turns"**
   - Increase `maxTurns` in configuration
   - Break complex tasks into smaller steps
   - Use checkpointing for long-running tasks

4. **Token limit exceeded**
   - Reduce context size
   - Clear session history periodically
   - Use more focused prompts

### Debug Mode

Enable debug logging to troubleshoot SDK issues:

```yaml
monitoring:
  log_level: "DEBUG"
```

View SDK-specific logs:
```bash
grep "SDK" .cco/logs/*.log
```

## Migration from Legacy Mode

To migrate existing projects from legacy to SDK mode:

1. **Update Configuration**:
   ```yaml
   claude_code:
     use_sdk: true  # Add this line
     # ... existing config
   ```

2. **Test Migration**:
   ```bash
   npx cco start --mission test-mission.yaml --use-sdk
   ```

3. **Update Custom Code** (if any):
   ```typescript
   // Before (Legacy)
   import { ClaudeCodeClient } from './claude-code-client';
   
   // After (SDK)
   import { ClaudeCodeSDKClient } from './claude-code-sdk-client';
   ```

## Performance Considerations

- **Turn Limits**: SDK has a default limit of 10 turns per conversation
- **Context Window**: Managed automatically by the SDK
- **Rate Limiting**: Built-in retry logic with exponential backoff
- **Caching**: SDK caches certain operations for efficiency

## Best Practices

1. **Use SDK Mode for New Projects**: Better automation and reliability
2. **Set Appropriate Turn Limits**: Balance between task completion and token usage
3. **Provide Clear System Prompts**: Help the SDK understand project context
4. **Use Checkpointing**: Save progress for long-running tasks
5. **Monitor Token Usage**: Track costs and optimize prompts

## API Reference

### Execute Task
```typescript
const result = await client.execute(
  "Implement user authentication",
  {
    workingDirectory: "./src",
    previousArtifacts: [],
    environment: process.env
  }
);
```

### Validate Environment
```typescript
const isValid = await client.validateEnvironment();
if (!isValid) {
  console.error("SDK environment not properly configured");
}
```

### Update Configuration
```typescript
client.updateConfig({
  maxTurns: 20,
  temperature: 0.5
});
```

## Examples

### Basic Task Execution
```typescript
const client = new ClaudeCodeSDKClient({
  projectPath: '.',
  maxTurns: 10
}, logger);

const result = await client.execute(
  "Create a REST API endpoint for user management"
);

console.log(`Success: ${result.success}`);
console.log(`Files modified: ${result.metadata.filesModified}`);
```

### With Custom System Prompt
```typescript
const client = new ClaudeCodeSDKClient({
  projectPath: '.',
  systemPrompt: `You are working on a TypeScript project.
    Follow these conventions:
    - Use functional components
    - Include proper error handling
    - Write unit tests for all functions`
}, logger);
```

### Plan Mode (Analysis Only)
```typescript
const client = new ClaudeCodeSDKClient({
  projectPath: '.',
  planMode: true  // Analyze without modifications
}, logger);

const analysis = await client.execute(
  "Review the codebase and suggest improvements"
);
```

## Related Documentation

- [Configuration Guide](./configuration.md)
- [Troubleshooting Guide](./troubleshooting.md)
- [Mission Templates](./mission-templates.md)
- [API Reference](./api-reference.md)