"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
const fs = __importStar(require("fs/promises"));
const yaml = __importStar(require("js-yaml"));
const zod_1 = require("zod");
const ConfigSchema = zod_1.z.object({
    orchestrator: zod_1.z.object({
        mode: zod_1.z.string().default('single_instance'),
        max_iterations: zod_1.z.number().default(1000),
        checkpoint_interval: zod_1.z.number().default(5),
        llm_provider: zod_1.z.enum(['openrouter', 'claude-code', 'local-cuda', 'local-cpu', 'ollama', 'llamacpp', 'vllm']).optional()
    }),
    repository: zod_1.z.object({
        path: zod_1.z.string(),
        auto_commit: zod_1.z.boolean().default(true),
        commit_frequency: zod_1.z.string().default('per_session')
    }),
    llm: zod_1.z.object({
        provider: zod_1.z.enum(['openrouter', 'claude-code', 'local-cuda', 'local-cpu', 'ollama', 'llamacpp', 'vllm']).default('openrouter'),
        huggingface_token: zod_1.z.string().optional(),
        local_model: zod_1.z.object({
            path: zod_1.z.string().optional(),
            name: zod_1.z.string().optional(),
            quantization: zod_1.z.string().optional(),
            context_size: zod_1.z.number().default(4096),
            gpu_layers: zod_1.z.number().optional(),
            threads: zod_1.z.number().optional()
        }).optional(),
        vllm_options: zod_1.z.object({
            tensor_parallel_size: zod_1.z.number().optional(),
            dtype: zod_1.z.enum(['auto', 'half', 'float16', 'bfloat16', 'float32']).optional(),
            gpu_memory_utilization: zod_1.z.number().optional()
        }).optional()
    }).optional(),
    openrouter: zod_1.z.object({
        api_key: zod_1.z.string().optional(),
        model: zod_1.z.string().default('anthropic/claude-3-opus'),
        temperature: zod_1.z.number().default(0.5)
    }),
    claude_code: zod_1.z.object({
        api_key: zod_1.z.string().optional(),
        use_subscription: zod_1.z.boolean().default(false),
        use_sdk: zod_1.z.boolean().default(true), // Use SDK by default for better automation
        workspace: zod_1.z.string(),
        max_file_size: zod_1.z.number().default(100000)
    }),
    persistence: zod_1.z.object({
        type: zod_1.z.string().default('file'),
        path: zod_1.z.string().default('.cco/sessions')
    }),
    monitoring: zod_1.z.object({
        log_level: zod_1.z.string().default('info'),
        log_path: zod_1.z.string().default('.cco/logs'),
        enable_telemetry: zod_1.z.boolean().default(false),
        enable_perf_logs: zod_1.z.boolean().default(false)
    })
});
async function loadConfig(configPath) {
    try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const rawConfig = yaml.load(configContent);
        // Replace environment variables
        const config = replaceEnvVars(rawConfig);
        // Validate and parse
        return ConfigSchema.parse(config);
    }
    catch (error) {
        throw new Error(`Failed to load config from ${configPath}: ${error}`);
    }
}
function replaceEnvVars(obj) {
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
        const result = {};
        for (const key in obj) {
            result[key] = replaceEnvVars(obj[key]);
        }
        return result;
    }
    return obj;
}
async function saveConfig(config, configPath) {
    const yamlContent = yaml.dump(config, { indent: 2 });
    await fs.writeFile(configPath, yamlContent, 'utf-8');
}
//# sourceMappingURL=config-loader.js.map