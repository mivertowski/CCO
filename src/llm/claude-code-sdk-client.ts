import { query, Options, SDKMessage, SDKResultMessage } from '@anthropic-ai/claude-code';
import { z } from 'zod';
import winston from 'winston';
import * as path from 'path';
import { IClaudeCodeClient, ClaudeCodeResult } from './claude-code-interface';

export const ClaudeCodeSDKConfigSchema = z.object({
  apiKey: z.string().optional(), // Optional, can use ANTHROPIC_API_KEY env var
  projectPath: z.string(),
  maxTurns: z.number().default(10), // Max iterations for multi-turn conversations
  model: z.string().default('claude-opus-4-1-20250805'), // Opus 4.1 - Latest and most capable model
  temperature: z.number().min(0).max(1).default(0.3),
  systemPrompt: z.string().optional(),
  planMode: z.boolean().default(false), // Analysis without modifications
  jsonMode: z.boolean().default(false), // Structured JSON output
});

export type ClaudeCodeSDKConfig = z.infer<typeof ClaudeCodeSDKConfigSchema>;

export type ClaudeCodeSDKResult = ClaudeCodeResult;

export interface ExecutionContext {
  workingDirectory: string;
  environment: Record<string, string>;
  previousArtifacts: Array<{ path: string; content: string }>;
}

export class ClaudeCodeSDKClient implements IClaudeCodeClient {
  private config: ClaudeCodeSDKConfig;
  private logger: winston.Logger;
  private currentSession: string | null = null;

  constructor(config: ClaudeCodeSDKConfig, logger: winston.Logger) {
    this.config = ClaudeCodeSDKConfigSchema.parse(config);
    this.logger = logger;
    
    // Set API key if provided
    if (this.config.apiKey) {
      process.env.ANTHROPIC_API_KEY = this.config.apiKey;
    }
    
    // Verify API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      this.logger.warn('No ANTHROPIC_API_KEY found - SDK will use subscription if available');
    }
  }

  async execute(
    task: string,
    context?: ExecutionContext
  ): Promise<ClaudeCodeSDKResult> {
    try {
      this.logger.info('Executing Claude Code SDK task', {
        task: task.substring(0, 100),
        projectPath: this.config.projectPath,
        session: this.currentSession,
        planMode: this.config.planMode
      });

      // Build the prompt with context
      const prompt = this.buildPrompt(task, context);
      
      // Configure query options
      const options: Options = {
        customSystemPrompt: this.config.systemPrompt || this.buildSystemPrompt(context),
        maxTurns: this.config.maxTurns,
        cwd: context?.workingDirectory || this.config.projectPath,
        // Use bypassPermissions mode to skip all permission prompts for automated execution
        permissionMode: this.config.planMode ? 'plan' : 'bypassPermissions',
        // Let SDK use default tools based on the environment
        // Most common code tools are available by default
      };

      const result: ClaudeCodeSDKResult = {
        success: false,
        output: '',
        artifacts: [],
        sessionEnded: false,
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0
        },
        metadata: {
          toolsUsed: [],
          filesModified: []
        }
      };

      // Execute query using SDK
      const queryResult = query({ prompt, options });
      for await (const message of queryResult) {
        this.handleMessage(message, result);
      }

      // Mark as successful if we got results
      if (result.output) {
        result.success = true;
        result.sessionEnded = true;
      }
      
      this.logger.info('Claude Code SDK execution completed', {
        success: result.success,
        artifactCount: result.artifacts.length,
        toolsUsed: result.metadata?.toolsUsed,
        tokens: result.tokenUsage.totalTokens
      });

      return result;
    } catch (error) {
      this.logger.error('Claude Code SDK execution failed', { error });
      
      return {
        success: false,
        output: '',
        artifacts: [],
        sessionEnded: true,
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0
        },
        error: (error as Error).message
      };
    }
  }

  async validateEnvironment(): Promise<boolean> {
    try {
      this.logger.debug('Validating Claude Code SDK environment', {
        projectPath: this.config.projectPath,
        hasApiKey: !!process.env.ANTHROPIC_API_KEY
      });

      // Try a simple query to validate the environment
      const testPrompt = 'Respond with "OK" if you can assist with code tasks.';
      
      const testQuery = query({ 
        prompt: testPrompt,
        options: { maxTurns: 1 }
      });
      for await (const message of testQuery) {
        if (message.type === 'result' && message.subtype === 'success') {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error('Environment validation failed', { error });
      return false;
    }
  }

  startSession(sessionId: string): void {
    this.currentSession = sessionId;
    this.logger.info('Started Claude Code SDK session', { sessionId });
  }

  endSession(): void {
    const sessionId = this.currentSession;
    this.currentSession = null;
    this.logger.info('Ended Claude Code SDK session', { sessionId });
  }

  private buildPrompt(task: string, context?: ExecutionContext): string {
    let prompt = `Task: ${task}\n\n`;
    
    if (context?.previousArtifacts && context.previousArtifacts.length > 0) {
      prompt += 'Previous work in this session:\n';
      for (const artifact of context.previousArtifacts) {
        prompt += `- ${artifact.path}\n`;
      }
      prompt += '\n';
    }
    
    prompt += `Working directory: ${context?.workingDirectory || this.config.projectPath}\n`;
    prompt += '\nPlease complete this task and provide any necessary file changes.';
    
    return prompt;
  }

  private buildSystemPrompt(_context?: ExecutionContext): string {
    return `You are Claude Code, an expert coding assistant working on a project.

Project location: ${this.config.projectPath}
Current session: ${this.currentSession || 'new'}

Your role is to:
1. Understand and execute programming tasks
2. Write clean, efficient, and well-structured code
3. Follow best practices and conventions
4. Create or modify files as needed
5. Run tests when appropriate
6. Provide clear explanations of your work

When working with files:
- Use appropriate file operations (read, write, update)
- Preserve existing code style and conventions
- Add proper error handling
- Include necessary imports

${this.config.planMode ? 'NOTE: You are in PLAN MODE - analyze and plan but do not make modifications.' : ''}`;
  }

  private handleMessage(message: SDKMessage, result: ClaudeCodeSDKResult): void {
    switch (message.type) {
      case 'result': {
        const resultMsg = message as SDKResultMessage;
        // Handle result based on subtype
        if (resultMsg.subtype === 'success') {
          result.output = resultMsg.result || '';
          result.success = true;
        } else {
          result.error = `Query ended with ${resultMsg.subtype}`;
          result.success = false;
        }
        
        // Update token metrics from usage
        if (resultMsg.usage) {
          result.tokenUsage = {
            promptTokens: resultMsg.usage.input_tokens || 0,
            completionTokens: resultMsg.usage.output_tokens || 0,
            totalTokens: (resultMsg.usage.input_tokens || 0) + (resultMsg.usage.output_tokens || 0),
            estimatedCost: resultMsg.total_cost_usd || this.calculateCost(
              resultMsg.usage.input_tokens || 0,
              resultMsg.usage.output_tokens || 0
            )
          };
        }
        break;
      }
        
      case 'assistant':
        // Assistant messages contain the actual work being done
        if (message.message?.content) {
          // Extract text content from assistant messages
          const content = Array.isArray(message.message.content) 
            ? message.message.content
                .filter((c: any) => c.type === 'text')
                .map((c: any) => c.text)
                .join('\n')
            : message.message.content;
          
          if (content) {
            result.output += content + '\n';
          }
        }
        
        // Track tool usage from assistant messages
        if (message.message?.content && Array.isArray(message.message.content)) {
          for (const block of message.message.content) {
            if (block.type === 'tool_use') {
              result.metadata?.toolsUsed?.push(block.name);
              
              // Track file modifications
              if (block.name === 'str_replace_editor' || block.name === 'write') {
                const path = block.input?.path || block.input?.file_path;
                if (path) {
                  result.metadata?.filesModified?.push(path);
                  result.artifacts.push({
                    path,
                    content: block.input?.new_str || block.input?.content || '',
                    type: this.determineFileType(path),
                    operation: block.name === 'write' ? 'create' : 'update'
                  });
                }
              }
            }
          }
        }
        break;
        
      case 'user':
        // User messages (from prompts)
        this.logger.debug('User message in stream', { message });
        break;
        
      case 'system':
        // System initialization messages
        this.logger.debug('System message', { 
          model: message.model,
          tools: message.tools,
          cwd: message.cwd 
        });
        break;
        
      default:
        this.logger.debug('Unhandled message type', { type: (message as any).type, message });
    }
  }


  private determineFileType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    
    const typeMap: Record<string, string> = {
      '.ts': 'code',
      '.js': 'code',
      '.tsx': 'code',
      '.jsx': 'code',
      '.py': 'code',
      '.java': 'code',
      '.cs': 'code',
      '.go': 'code',
      '.rs': 'code',
      '.md': 'documentation',
      '.txt': 'documentation',
      '.json': 'config',
      '.yaml': 'config',
      '.yml': 'config',
      '.xml': 'config',
      '.toml': 'config',
      '.test.ts': 'test',
      '.spec.ts': 'test',
      '.test.js': 'test',
      '.spec.js': 'test'
    };

    // Check for test files
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      return 'test';
    }

    return typeMap[extension] || 'other';
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Pricing for Claude models (as of 2025)
    const costs = {
      'claude-opus-4-1-20250805': { input: 0.015, output: 0.075 },
      'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
    };

    const modelCost = costs[this.config.model as keyof typeof costs] || 
                     { input: 0.003, output: 0.015 };
    
    return (
      (inputTokens / 1000) * modelCost.input +
      (outputTokens / 1000) * modelCost.output
    );
  }

  updateConfig(config: Partial<ClaudeCodeSDKConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update API key if changed
    if (config.apiKey) {
      process.env.ANTHROPIC_API_KEY = config.apiKey;
    }
  }

  getConfig(): ClaudeCodeSDKConfig {
    return { ...this.config };
  }
}