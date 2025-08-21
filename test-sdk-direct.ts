#!/usr/bin/env tsx
import { ClaudeCodeSDKClient } from './src/llm/claude-code-sdk-client';
import { createLogger } from './src/monitoring/logger';

async function testSDK() {
  const logger = createLogger();
  
  console.log('Testing Claude Code SDK integration...\n');
  
  const client = new ClaudeCodeSDKClient({
    projectPath: '.',
    maxTurns: 3,
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    systemPrompt: 'You are testing the SDK integration',
    planMode: false
  }, logger);
  
  console.log('1. Testing environment validation...');
  const isValid = await client.validateEnvironment();
  console.log(`   Environment valid: ${isValid}\n`);
  
  if (!isValid) {
    console.log('⚠️  Environment validation failed.');
    console.log('   This may be because:');
    console.log('   - No ANTHROPIC_API_KEY is set');
    console.log('   - Claude Code CLI is not installed');
    console.log('   - Network connectivity issues\n');
  }
  
  console.log('2. Testing task execution...');
  const result = await client.execute(
    'Create a simple file called sdk-test.txt with the content "SDK Integration Successful"'
  );
  
  console.log(`   Success: ${result.success}`);
  console.log(`   Output: ${result.output?.substring(0, 200) || 'No output'}`);
  console.log(`   Artifacts created: ${result.artifacts.length}`);
  console.log(`   Token usage: ${result.tokenUsage.totalTokens} tokens`);
  
  if (result.error) {
    console.log(`   Error: ${result.error}\n`);
  }
  
  if (result.artifacts.length > 0) {
    console.log('\n   Artifacts:');
    result.artifacts.forEach(artifact => {
      console.log(`   - ${artifact.path} (${artifact.operation})`);
    });
  }
  
  console.log('\n✅ SDK integration test complete!');
}

testSDK().catch(console.error);