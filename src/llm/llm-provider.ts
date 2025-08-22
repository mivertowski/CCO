/**
 * LLM Provider Interface and Factory
 * Supports multiple LLM backends for orchestration
 */

import { OpenRouterClient } from './openrouter-client';
import { ClaudeCodeSDKClient } from './claude-code-sdk-client';
import { LocalLLMClient } from './local-llm-client';
import { IClaudeCodeClient } from './claude-code-interface';
import winston from 'winston';

export enum LLMProvider {
  OPENROUTER = 'openrouter',
  CLAUDE_CODE = 'claude-code',
  LOCAL_CUDA = 'local-cuda',
  LOCAL_CPU = 'local-cpu',
  OLLAMA = 'ollama',
  LLAMACPP = 'llamacpp',
  VLLM = 'vllm'
}

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  baseURL?: string;
  
  // Local LLM specific options
  localModel?: {
    path?: string;           // Path to model file (for llama.cpp)
    name?: string;           // Model name (for ollama)
    quantization?: string;   // e.g., 'q4_0', 'q8_0'
    contextSize?: number;    // Context window size
    gpuLayers?: number;      // Number of layers to offload to GPU
    threads?: number;        // CPU threads
    useMmap?: boolean;       // Memory mapping
    useMLock?: boolean;      // Lock model in RAM
  };
  
  // VLLM specific options
  vllmOptions?: {
    tensorParallelSize?: number;
    dtype?: 'auto' | 'half' | 'float16' | 'bfloat16' | 'float32';
    gpuMemoryUtilization?: number; // 0.0 to 1.0
  };
}

export interface ILLMClient {
  generateResponse(prompt: string, systemPrompt?: string): Promise<string>;
  validateEnvironment?(): Promise<boolean>;
  getModelInfo?(): Promise<{ name: string; parameters?: number; context?: number }>;
}

// Adapter to make OpenRouterClient compatible with ILLMClient
export class OpenRouterAdapter implements ILLMClient {
  constructor(private client: OpenRouterClient) {}
  
  async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
    const response = await this.client.sendMessage(
      systemPrompt || 'You are an AI assistant',
      prompt
    );
    return response.content;
  }
  
  async validateEnvironment(): Promise<boolean> {
    // OpenRouter doesn't have a specific validation method, assume valid if configured
    return true;
  }
}

export class LLMProviderFactory {
  static async create(
    config: LLMConfig,
    logger: winston.Logger
  ): Promise<{ orchestratorClient: ILLMClient | null; claudeCodeClient: IClaudeCodeClient | null }> {
    
    let orchestratorClient: ILLMClient | null = null;
    let claudeCodeClient: IClaudeCodeClient | null = null;

    switch (config.provider) {
      case LLMProvider.OPENROUTER:
        if (!config.apiKey) {
          throw new Error('OpenRouter API key is required');
        }
        const openRouterClient = new OpenRouterClient({
          apiKey: config.apiKey,
          model: config.model || 'claude-3-opus',
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 100000,
          baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
          retryAttempts: 3,
          retryDelay: 1000
        }, logger);
        orchestratorClient = new OpenRouterAdapter(openRouterClient);
        break;

      case LLMProvider.CLAUDE_CODE:
        // Use Claude Code SDK for both orchestration and execution
        if (!config.apiKey && !process.env.ANTHROPIC_API_KEY) {
          logger.warn('No Anthropic API key found - will use Claude Code subscription if available');
        }
        
        const claudeClient = new ClaudeCodeSDKClient({
          apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
          model: config.model || 'claude-opus-4-1-20250805',
          temperature: config.temperature || 0.3,
          projectPath: process.cwd(),
          maxTurns: 10,
          planMode: false,
          jsonMode: false
        }, logger);
        
        // Claude Code client can serve both roles
        claudeCodeClient = claudeClient;
        // Create adapter for orchestrator use
        orchestratorClient = {
          async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
            const result = await claudeClient.execute(
              systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
              {
                workingDirectory: process.cwd(),
                environment: process.env as Record<string, string>,
                previousArtifacts: []
              }
            );
            return result.output || '';
          },
          async validateEnvironment(): Promise<boolean> {
            return await claudeClient.validateEnvironment();
          }
        };
        break;

      case LLMProvider.LOCAL_CUDA:
      case LLMProvider.LOCAL_CPU:
        orchestratorClient = new LocalLLMClient({
          ...config,
          useCUDA: config.provider === LLMProvider.LOCAL_CUDA
        }, logger);
        break;

      case LLMProvider.OLLAMA:
        orchestratorClient = new LocalLLMClient({
          ...config,
          backend: 'ollama'
        }, logger);
        break;

      case LLMProvider.LLAMACPP:
        orchestratorClient = new LocalLLMClient({
          ...config,
          backend: 'llamacpp'
        }, logger);
        break;

      case LLMProvider.VLLM:
        orchestratorClient = new LocalLLMClient({
          ...config,
          backend: 'vllm'
        }, logger);
        break;

      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }

    // If we don't have a Claude Code client yet, create one if needed
    if (!claudeCodeClient && (config.apiKey || process.env.ANTHROPIC_API_KEY)) {
      claudeCodeClient = new ClaudeCodeSDKClient({
        apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
        model: 'claude-opus-4-1-20250805',
        temperature: 0.3,
        projectPath: process.cwd(),
        maxTurns: 10,
        planMode: false,
        jsonMode: false
      }, logger);
    }

    return { orchestratorClient, claudeCodeClient };
  }

  static async detectBestProvider(logger: winston.Logger): Promise<LLMProvider> {
    // Check for CUDA availability
    try {
      const { execSync } = require('child_process');
      execSync('nvidia-smi', { stdio: 'ignore' });
      logger.info('CUDA GPU detected, can use local CUDA models');
      
      // Check if a local model server is running
      try {
        const http = require('http');
        await new Promise((resolve, reject) => {
          http.get('http://localhost:11434/api/tags', (res: any) => {
            if (res.statusCode === 200) {
              resolve(true);
            } else {
              reject(false);
            }
          }).on('error', reject);
        });
        logger.info('Ollama server detected on localhost:11434');
        return LLMProvider.OLLAMA;
      } catch {
        // Ollama not running
      }

      // Check for VLLM
      try {
        const http = require('http');
        await new Promise((resolve, reject) => {
          http.get('http://localhost:8000/v1/models', (res: any) => {
            if (res.statusCode === 200) {
              resolve(true);
            } else {
              reject(false);
            }
          }).on('error', reject);
        });
        logger.info('VLLM server detected on localhost:8000');
        return LLMProvider.VLLM;
      } catch {
        // VLLM not running
      }
      
      return LLMProvider.LOCAL_CUDA;
    } catch {
      logger.debug('No CUDA GPU detected');
    }

    // Check for API keys
    if (process.env.OPENROUTER_API_KEY) {
      return LLMProvider.OPENROUTER;
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      return LLMProvider.CLAUDE_CODE;
    }

    // Default to CPU-based local model
    return LLMProvider.LOCAL_CPU;
  }
}