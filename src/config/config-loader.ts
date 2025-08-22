import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import { z } from 'zod';

const ConfigSchema = z.object({
  orchestrator: z.object({
    mode: z.string().default('single_instance'),
    max_iterations: z.number().default(1000),
    checkpoint_interval: z.number().default(5)
  }),
  repository: z.object({
    path: z.string(),
    auto_commit: z.boolean().default(true),
    commit_frequency: z.string().default('per_session')
  }),
  openrouter: z.object({
    api_key: z.string().optional(),
    model: z.string().default('anthropic/claude-3-opus'),
    temperature: z.number().default(0.5)
  }),
  claude_code: z.object({
    api_key: z.string().optional(),
    use_subscription: z.boolean().default(false),
    use_sdk: z.boolean().default(true), // Use SDK by default for better automation
    workspace: z.string(),
    max_file_size: z.number().default(100000)
  }),
  persistence: z.object({
    type: z.string().default('file'),
    path: z.string().default('.cco/sessions')
  }),
  monitoring: z.object({
    log_level: z.string().default('info'),
    log_path: z.string().default('.cco/logs'),
    enable_telemetry: z.boolean().default(false),
    enable_perf_logs: z.boolean().default(false)
  })
});

export type Config = z.infer<typeof ConfigSchema>;

export async function loadConfig(configPath: string): Promise<Config> {
  try {
    const configContent = await fs.readFile(configPath, 'utf-8');
    const rawConfig = yaml.load(configContent) as any;
    
    // Replace environment variables
    const config = replaceEnvVars(rawConfig);
    
    // Validate and parse
    return ConfigSchema.parse(config);
  } catch (error) {
    throw new Error(`Failed to load config from ${configPath}: ${error}`);
  }
}

function replaceEnvVars(obj: any): any {
  if (typeof obj === 'string') {
    // Replace ${VAR_NAME} with environment variable
    return obj.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      return process.env[varName] || match;
    });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => replaceEnvVars(item));
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const result: any = {};
    for (const key in obj) {
      result[key] = replaceEnvVars(obj[key]);
    }
    return result;
  }
  
  return obj;
}

export async function saveConfig(config: Config, configPath: string): Promise<void> {
  const yamlContent = yaml.dump(config, { indent: 2 });
  await fs.writeFile(configPath, yamlContent, 'utf-8');
}