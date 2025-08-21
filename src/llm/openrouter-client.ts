import OpenAI from 'openai';
import { z } from 'zod';
import { TokenMetrics } from '@models/metrics';
import winston from 'winston';

export const OpenRouterConfigSchema = z.object({
  apiKey: z.string(),
  model: z.string().default('meta-llama/llama-3.2-3b-instruct:free'), // Default to free model
  temperature: z.number().min(0).max(2).default(0.5),
  maxTokens: z.number().default(4096),
  baseURL: z.string().default('https://openrouter.ai/api/v1'),
  retryAttempts: z.number().default(3),
  retryDelay: z.number().default(1000)
});

export type OpenRouterConfig = z.infer<typeof OpenRouterConfigSchema>;

export interface ManagerResponse {
  content: string;
  tokenUsage: TokenMetrics;
  model: string;
  finishReason?: string;
}

export class OpenRouterClient {
  private client: OpenAI;
  private config: OpenRouterConfig;
  private logger: winston.Logger;

  constructor(config: OpenRouterConfig, logger: winston.Logger) {
    this.config = OpenRouterConfigSchema.parse(config);
    this.logger = logger;
    
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/mivertowski/cco',
        'X-Title': 'Claude Code Orchestrator'
      }
    });
  }

  async sendMessage(
    systemPrompt: string,
    userMessage: string,
    context?: Record<string, any>
  ): Promise<ManagerResponse> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        this.logger.debug(`Sending message to OpenRouter (attempt ${attempt + 1})`, {
          model: this.config.model,
          contextKeys: context ? Object.keys(context) : []
        });

        const response = await this.client.chat.completions.create({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          stream: false
        });

        const choice = response.choices[0];
        const usage = response.usage;

        if (!choice.message.content) {
          throw new Error('Empty response from OpenRouter');
        }

        const tokenMetrics: TokenMetrics = {
          promptTokens: usage?.prompt_tokens || 0,
          completionTokens: usage?.completion_tokens || 0,
          totalTokens: usage?.total_tokens || 0,
          estimatedCost: this.calculateCost(
            usage?.prompt_tokens || 0,
            usage?.completion_tokens || 0
          )
        };

        this.logger.info('Successfully received response from OpenRouter', {
          model: this.config.model,
          tokens: tokenMetrics.totalTokens,
          cost: tokenMetrics.estimatedCost
        });

        return {
          content: choice.message.content,
          tokenUsage: tokenMetrics,
          model: this.config.model,
          finishReason: choice.finish_reason || undefined
        };
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`OpenRouter request failed (attempt ${attempt + 1})`, {
          error: lastError.message,
          model: this.config.model
        });

        if (this.isRateLimitError(error)) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt));
        } else if (!this.isRetryableError(error)) {
          throw error;
        }
        
        await this.delay(this.config.retryDelay);
      }
    }

    throw new Error(`Failed after ${this.config.retryAttempts} attempts: ${lastError?.message}`);
  }

  async streamMessage(
    systemPrompt: string,
    userMessage: string,
    onChunk: (chunk: string) => void
  ): Promise<ManagerResponse> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true
      });

      let fullContent = '';
      let tokenCount = 0;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          onChunk(content);
          tokenCount += this.estimateTokens(content);
        }
      }

      const promptTokens = this.estimateTokens(systemPrompt + userMessage);
      const tokenMetrics: TokenMetrics = {
        promptTokens,
        completionTokens: tokenCount,
        totalTokens: promptTokens + tokenCount,
        estimatedCost: this.calculateCost(promptTokens, tokenCount)
      };

      return {
        content: fullContent,
        tokenUsage: tokenMetrics,
        model: this.config.model
      };
    } catch (error) {
      this.logger.error('Stream message failed', { error });
      throw error;
    }
  }

  private calculateCost(promptTokens: number, completionTokens: number): number {
    const costs: Record<string, { prompt: number; completion: number }> = {
      // Anthropic models (2025 pricing)
      'anthropic/claude-opus-4-1': { prompt: 0.015, completion: 0.075 },
      'anthropic/claude-3.5-sonnet': { prompt: 0.003, completion: 0.015 },
      'anthropic/claude-3.5-haiku': { prompt: 0.00025, completion: 0.00125 },
      
      // OpenAI models (2025 pricing)
      'openai/gpt-4o': { prompt: 0.005, completion: 0.015 },
      'openai/gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
      'openai/gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
      'openai/gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
      
      // Google models
      'google/gemini-pro-1.5': { prompt: 0.00125, completion: 0.005 },
      'google/gemini-flash-1.5': { prompt: 0.00025, completion: 0.001 },
      
      // Free models
      'meta-llama/llama-3.2-3b-instruct:free': { prompt: 0, completion: 0 },
      'meta-llama/llama-3.2-1b-instruct:free': { prompt: 0, completion: 0 },
      'google/gemini-2.0-flash-exp:free': { prompt: 0, completion: 0 },
      'mistralai/mistral-7b-instruct:free': { prompt: 0, completion: 0 },
      'huggingface/zephyr-7b-beta:free': { prompt: 0, completion: 0 },
      'openchat/openchat-7b:free': { prompt: 0, completion: 0 },
      'gryphe/mythomist-7b:free': { prompt: 0, completion: 0 },
      'undi95/toppy-m-7b:free': { prompt: 0, completion: 0 },
      
      // DeepSeek models
      'deepseek/deepseek-v3': { prompt: 0.00014, completion: 0.00028 },
      'deepseek/deepseek-r1': { prompt: 0.00055, completion: 0.00275 },
      'deepseek/deepseek-coder': { prompt: 0.00014, completion: 0.00028 }
    };

    const modelCost = costs[this.config.model] || { prompt: 0, completion: 0 };
    
    return (
      (promptTokens / 1000) * modelCost.prompt +
      (completionTokens / 1000) * modelCost.completion
    );
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private isRateLimitError(error: any): boolean {
    return error?.status === 429 || error?.message?.includes('rate limit');
  }

  private isRetryableError(error: any): boolean {
    const status = error?.status;
    return status >= 500 || status === 429 || !status;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updateConfig(config: Partial<OpenRouterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): OpenRouterConfig {
    return { ...this.config };
  }
}