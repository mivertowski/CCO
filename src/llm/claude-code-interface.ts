import { TokenMetrics } from '../models/metrics';

export interface ClaudeCodeResult {
  success: boolean;
  output: string;
  artifacts: Array<{
    path: string;
    content: string;
    type: string;
    operation?: 'create' | 'update' | 'delete';
  }>;
  sessionEnded: boolean;
  tokenUsage: TokenMetrics;
  error?: string;
  metadata?: {
    toolsUsed?: string[];
    filesModified?: string[];
    testsRun?: boolean;
  };
}

export interface IClaudeCodeClient {
  execute(
    task: string,
    context?: any
  ): Promise<ClaudeCodeResult>;
  
  validateEnvironment(): Promise<boolean>;
  startSession?(sessionId: string): void;
  endSession?(): void;
}