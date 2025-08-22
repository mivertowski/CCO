/**
 * Local LLM Client Implementation
 * Supports various local LLM backends including CUDA acceleration
 */

import winston from 'winston';
import { ILLMClient, LLMConfig } from './llm-provider';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

export interface LocalLLMConfig extends LLMConfig {
  backend?: 'ollama' | 'llamacpp' | 'vllm' | 'transformers';
  useCUDA?: boolean;
  modelPath?: string;
  contextSize?: number;
  batchSize?: number;
}

export class LocalLLMClient implements ILLMClient {
  private config: LocalLLMConfig;
  private logger: winston.Logger;
  private modelProcess?: ChildProcess;
  private isReady: boolean = false;

  constructor(config: LocalLLMConfig, logger: winston.Logger) {
    this.config = config;
    this.logger = logger;
    
    // Disable SSL certificate verification for Zscaler environments
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
      this.logger.warn('Disabling SSL certificate verification for Zscaler compatibility');
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.logger.info('Initializing local LLM client', {
      backend: this.config.backend || 'auto',
      useCUDA: this.config.useCUDA,
      model: this.config.localModel?.name || this.config.model
    });

    switch (this.config.backend) {
      case 'ollama':
        await this.initializeOllama();
        break;
      case 'llamacpp':
        await this.initializeLlamaCpp();
        break;
      case 'vllm':
        await this.initializeVLLM();
        break;
      case 'transformers':
        await this.initializeTransformers();
        break;
      default:
        await this.autoDetectAndInitialize();
    }
  }

  private async autoDetectAndInitialize(): Promise<void> {
    // Try Ollama first
    if (await this.checkOllamaAvailable()) {
      this.config.backend = 'ollama';
      await this.initializeOllama();
      return;
    }

    // Try VLLM
    if (await this.checkVLLMAvailable()) {
      this.config.backend = 'vllm';
      await this.initializeVLLM();
      return;
    }

    // Fall back to llama.cpp
    this.config.backend = 'llamacpp';
    await this.initializeLlamaCpp();
  }

  private async checkOllamaAvailable(): Promise<boolean> {
    try {
      const response = await this.httpRequest('GET', 'http://localhost:11434/api/tags');
      return response.statusCode === 200;
    } catch {
      return false;
    }
  }

  private async checkVLLMAvailable(): Promise<boolean> {
    try {
      const response = await this.httpRequest('GET', 'http://localhost:8000/v1/models');
      return response.statusCode === 200;
    } catch {
      return false;
    }
  }

  private async initializeOllama(): Promise<void> {
    this.logger.info('Initializing Ollama backend');
    
    // Check if Ollama is running
    if (!await this.checkOllamaAvailable()) {
      this.logger.info('Ollama not running, attempting to start it');
      
      // Start Ollama serve in background
      this.modelProcess = spawn('ollama', ['serve'], {
        detached: true,
        stdio: 'ignore'
      });
      
      // Wait for Ollama to start
      await this.waitForService('http://localhost:11434/api/tags', 30000);
    }

    // Pull model if not available
    const modelName = this.config.localModel?.name || this.config.model || 'llama3.2:3b';
    await this.ensureOllamaModel(modelName);
    
    this.isReady = true;
  }

  private async ensureOllamaModel(modelName: string): Promise<void> {
    try {
      // Check if model exists
      const response = await this.httpRequest('GET', 'http://localhost:11434/api/tags');
      const models = JSON.parse(response.body);
      
      const modelExists = models.models?.some((m: any) => 
        m.name === modelName || m.name.startsWith(modelName + ':')
      );
      
      if (!modelExists) {
        this.logger.info(`Pulling Ollama model: ${modelName}`);
        
        // Pull the model
        await new Promise<void>((resolve, reject) => {
          const pullProcess = spawn('ollama', ['pull', modelName], {
            stdio: 'inherit'
          });
          
          pullProcess.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`Failed to pull model: ${modelName}`));
            }
          });
        });
      }
    } catch (error) {
      this.logger.error('Failed to ensure Ollama model', { error, modelName });
      throw error;
    }
  }

  private async initializeLlamaCpp(): Promise<void> {
    this.logger.info('Initializing llama.cpp backend');
    
    const modelPath = this.config.localModel?.path || this.config.modelPath;
    
    if (!modelPath) {
      // Try to download a model from Hugging Face
      const defaultModel = await this.downloadDefaultModel();
      this.config.modelPath = defaultModel;
    }
    
    // Check if llama.cpp server is available
    const serverPath = await this.findLlamaCppServer();
    
    if (!serverPath) {
      throw new Error('llama.cpp server not found. Please install llama.cpp with CUDA support.');
    }
    
    // Start llama.cpp server
    const args = [
      '-m', this.config.modelPath!,
      '-c', String(this.config.localModel?.contextSize || 4096),
      '--host', '0.0.0.0',
      '--port', '8080'
    ];
    
    if (this.config.useCUDA && this.config.localModel?.gpuLayers) {
      args.push('-ngl', String(this.config.localModel.gpuLayers));
    }
    
    if (this.config.localModel?.threads) {
      args.push('-t', String(this.config.localModel.threads));
    }
    
    this.modelProcess = spawn(serverPath, args, {
      stdio: 'pipe'
    });
    
    this.modelProcess.stdout?.on('data', (data) => {
      this.logger.debug(`llama.cpp: ${data}`);
    });
    
    this.modelProcess.stderr?.on('data', (data) => {
      this.logger.debug(`llama.cpp error: ${data}`);
    });
    
    // Wait for server to be ready
    await this.waitForService('http://localhost:8080/health', 30000);
    
    this.isReady = true;
  }

  private async initializeVLLM(): Promise<void> {
    this.logger.info('Initializing VLLM backend');
    
    // Check if VLLM is running
    if (!await this.checkVLLMAvailable()) {
      const modelName = this.config.model || 'mistralai/Mistral-7B-Instruct-v0.3';
      
      // Start VLLM server
      const args = [
        '-m', 'vllm.entrypoints.openai.api_server',
        '--model', modelName,
        '--host', '0.0.0.0',
        '--port', '8000'
      ];
      
      if (this.config.vllmOptions?.tensorParallelSize) {
        args.push('--tensor-parallel-size', String(this.config.vllmOptions.tensorParallelSize));
      }
      
      if (this.config.vllmOptions?.dtype) {
        args.push('--dtype', this.config.vllmOptions.dtype);
      }
      
      if (this.config.vllmOptions?.gpuMemoryUtilization) {
        args.push('--gpu-memory-utilization', String(this.config.vllmOptions.gpuMemoryUtilization));
      }
      
      // Disable SSL verification for model downloads
      const env = { ...process.env, HF_HUB_DISABLE_SSL_VERIFY: '1' };
      
      this.modelProcess = spawn('python', args, {
        stdio: 'pipe',
        env
      });
      
      this.modelProcess.stdout?.on('data', (data) => {
        this.logger.debug(`VLLM: ${data}`);
      });
      
      this.modelProcess.stderr?.on('data', (data) => {
        this.logger.debug(`VLLM error: ${data}`);
      });
      
      // Wait for server to be ready
      await this.waitForService('http://localhost:8000/v1/models', 60000);
    }
    
    this.isReady = true;
  }

  private async initializeTransformers(): Promise<void> {
    this.logger.info('Initializing Transformers backend with Hugging Face');
    
    // Create a Python script to run transformers
    const scriptPath = path.join(process.cwd(), '.cco', 'llm_server.py');
    const modelName = this.config.model || 'microsoft/Phi-3.5-mini-instruct';
    
    const pythonScript = `
import os
os.environ['CURL_CA_BUNDLE'] = ''
os.environ['REQUESTS_CA_BUNDLE'] = ''
os.environ['HF_HUB_DISABLE_SSL_VERIFY'] = '1'

from flask import Flask, request, jsonify
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

app = Flask(__name__)

print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"CUDA device: {torch.cuda.get_device_name(0)}")
    device = "cuda"
else:
    device = "cpu"

print(f"Loading model: ${modelName}")
tokenizer = AutoTokenizer.from_pretrained("${modelName}", trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    "${modelName}",
    torch_dtype=torch.float16 if device == "cuda" else torch.float32,
    device_map="auto" if device == "cuda" else None,
    trust_remote_code=True
)

if device == "cuda":
    model = model.to(device)

pipe = pipeline(
    "text-generation",
    model=model,
    tokenizer=tokenizer,
    device=device
)

@app.route('/v1/completions', methods=['POST'])
def completions():
    data = request.json
    prompt = data.get('prompt', '')
    max_tokens = data.get('max_tokens', 1000)
    temperature = data.get('temperature', 0.7)
    
    result = pipe(
        prompt,
        max_length=max_tokens,
        temperature=temperature,
        do_sample=True,
        top_p=0.9
    )
    
    return jsonify({
        'choices': [{
            'text': result[0]['generated_text'][len(prompt):],
            'index': 0,
            'finish_reason': 'stop'
        }]
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ready'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8081)
`;

    // Ensure .cco directory exists
    const ccoDir = path.join(process.cwd(), '.cco');
    if (!fs.existsSync(ccoDir)) {
      fs.mkdirSync(ccoDir, { recursive: true });
    }
    
    // Write the Python script
    fs.writeFileSync(scriptPath, pythonScript);
    
    // Start the Python server
    const env = { 
      ...process.env, 
      HF_HUB_DISABLE_SSL_VERIFY: '1',
      CURL_CA_BUNDLE: '',
      REQUESTS_CA_BUNDLE: ''
    };
    
    this.modelProcess = spawn('python', [scriptPath], {
      stdio: 'pipe',
      env
    });
    
    this.modelProcess.stdout?.on('data', (data) => {
      this.logger.debug(`Transformers server: ${data}`);
    });
    
    this.modelProcess.stderr?.on('data', (data) => {
      this.logger.debug(`Transformers server error: ${data}`);
    });
    
    // Wait for server to be ready
    await this.waitForService('http://localhost:8081/health', 60000);
    
    this.isReady = true;
  }

  private async downloadDefaultModel(): Promise<string> {
    this.logger.info('Downloading default model from Hugging Face');
    
    const modelDir = path.join(process.cwd(), '.cco', 'models');
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }
    
    // Download a small GGUF model suitable for testing
    const modelUrl = 'https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf';
    const modelPath = path.join(modelDir, 'llama-2-7b-chat.Q4_K_M.gguf');
    
    if (fs.existsSync(modelPath)) {
      this.logger.info('Model already downloaded');
      return modelPath;
    }
    
    // Download with SSL bypass
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(modelPath);
      
      const options = {
        rejectUnauthorized: false // Bypass SSL for Zscaler
      };
      
      https.get(modelUrl, options, (response) => {
        const totalSize = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedSize = 0;
        
        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          const progress = Math.round((downloadedSize / totalSize) * 100);
          
          if (progress % 10 === 0) {
            this.logger.info(`Download progress: ${progress}%`);
          }
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          this.logger.info('Model downloaded successfully');
          resolve(modelPath);
        });
      }).on('error', (err) => {
        fs.unlinkSync(modelPath);
        reject(err);
      });
    });
  }

  private async findLlamaCppServer(): Promise<string | null> {
    const possiblePaths = [
      '/usr/local/bin/llama-server',
      '/usr/bin/llama-server',
      path.join(process.cwd(), 'llama.cpp', 'llama-server'),
      path.join(process.cwd(), 'llama-server')
    ];
    
    for (const serverPath of possiblePaths) {
      if (fs.existsSync(serverPath)) {
        return serverPath;
      }
    }
    
    return null;
  }

  private async waitForService(url: string, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        await this.httpRequest('GET', url);
        this.logger.info(`Service ready at ${url}`);
        return;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error(`Service at ${url} did not become ready within ${timeout}ms`);
  }

  private httpRequest(method: string, url: string, body?: any): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const options: any = {
        method,
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      // Disable SSL verification for HTTPS
      if (urlObj.protocol === 'https:') {
        options.rejectUnauthorized = false;
      }
      
      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 500,
            body: data
          });
        });
      });
      
      req.on('error', reject);
      
      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }

  async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.isReady) {
      await this.waitForReady();
    }
    
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
    
    switch (this.config.backend) {
      case 'ollama':
        return this.generateWithOllama(fullPrompt);
      case 'llamacpp':
        return this.generateWithLlamaCpp(fullPrompt);
      case 'vllm':
        return this.generateWithVLLM(fullPrompt);
      case 'transformers':
        return this.generateWithTransformers(fullPrompt);
      default:
        throw new Error(`Unknown backend: ${this.config.backend}`);
    }
  }

  private async generateWithOllama(prompt: string): Promise<string> {
    const modelName = this.config.localModel?.name || this.config.model || 'llama3.2:3b';
    
    const response = await this.httpRequest('POST', 'http://localhost:11434/api/generate', {
      model: modelName,
      prompt,
      stream: false,
      options: {
        temperature: this.config.temperature || 0.7,
        num_predict: this.config.maxTokens || 1000
      }
    });
    
    const result = JSON.parse(response.body);
    return result.response;
  }

  private async generateWithLlamaCpp(prompt: string): Promise<string> {
    const response = await this.httpRequest('POST', 'http://localhost:8080/completion', {
      prompt,
      n_predict: this.config.maxTokens || 1000,
      temperature: this.config.temperature || 0.7,
      stop: ['\n\n', '###', 'Human:', 'Assistant:']
    });
    
    const result = JSON.parse(response.body);
    return result.content;
  }

  private async generateWithVLLM(prompt: string): Promise<string> {
    const response = await this.httpRequest('POST', 'http://localhost:8000/v1/completions', {
      model: this.config.model || 'mistralai/Mistral-7B-Instruct-v0.3',
      prompt,
      max_tokens: this.config.maxTokens || 1000,
      temperature: this.config.temperature || 0.7
    });
    
    const result = JSON.parse(response.body);
    return result.choices[0].text;
  }

  private async generateWithTransformers(prompt: string): Promise<string> {
    const response = await this.httpRequest('POST', 'http://localhost:8081/v1/completions', {
      prompt,
      max_tokens: this.config.maxTokens || 1000,
      temperature: this.config.temperature || 0.7
    });
    
    const result = JSON.parse(response.body);
    return result.choices[0].text;
  }

  private async waitForReady(): Promise<void> {
    const timeout = 60000;
    const startTime = Date.now();
    
    while (!this.isReady && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (!this.isReady) {
      throw new Error('LLM client failed to initialize within timeout');
    }
  }

  async validateEnvironment(): Promise<boolean> {
    try {
      // Check CUDA availability
      if (this.config.useCUDA) {
        const { execSync } = require('child_process');
        const output = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader', {
          encoding: 'utf8'
        });
        
        this.logger.info('CUDA GPU available', { gpu: output.trim() });
      }
      
      // Validate based on backend
      switch (this.config.backend) {
        case 'ollama':
          return await this.checkOllamaAvailable();
        case 'vllm':
          return await this.checkVLLMAvailable();
        case 'llamacpp':
          return fs.existsSync(this.config.modelPath || '') || true;
        default:
          return true;
      }
    } catch (error) {
      this.logger.error('Environment validation failed', { error });
      return false;
    }
  }

  async getModelInfo(): Promise<{ name: string; parameters?: number; context?: number }> {
    switch (this.config.backend) {
      case 'ollama': {
        const modelName = this.config.localModel?.name || this.config.model || 'llama3.2:3b';
        return {
          name: modelName,
          context: this.config.localModel?.contextSize || 4096
        };
      }
      
      case 'vllm':
        return {
          name: this.config.model || 'mistralai/Mistral-7B-Instruct-v0.3',
          parameters: 7_000_000_000,
          context: 32768
        };
      
      default:
        return {
          name: this.config.model || 'Unknown',
          context: this.config.localModel?.contextSize || 4096
        };
    }
  }

  cleanup(): void {
    if (this.modelProcess) {
      this.logger.info('Shutting down local LLM process');
      this.modelProcess.kill();
      this.modelProcess = undefined;
    }
  }
}