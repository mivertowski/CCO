import { z } from 'zod';
declare const ConfigSchema: z.ZodObject<{
    orchestrator: z.ZodObject<{
        mode: z.ZodDefault<z.ZodString>;
        max_iterations: z.ZodDefault<z.ZodNumber>;
        checkpoint_interval: z.ZodDefault<z.ZodNumber>;
        llm_provider: z.ZodOptional<z.ZodEnum<["openrouter", "claude-code", "local-cuda", "local-cpu", "ollama", "llamacpp", "vllm"]>>;
    }, "strip", z.ZodTypeAny, {
        mode: string;
        max_iterations: number;
        checkpoint_interval: number;
        llm_provider?: "ollama" | "llamacpp" | "vllm" | "openrouter" | "claude-code" | "local-cuda" | "local-cpu" | undefined;
    }, {
        mode?: string | undefined;
        max_iterations?: number | undefined;
        checkpoint_interval?: number | undefined;
        llm_provider?: "ollama" | "llamacpp" | "vllm" | "openrouter" | "claude-code" | "local-cuda" | "local-cpu" | undefined;
    }>;
    repository: z.ZodObject<{
        path: z.ZodString;
        auto_commit: z.ZodDefault<z.ZodBoolean>;
        commit_frequency: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        auto_commit: boolean;
        commit_frequency: string;
    }, {
        path: string;
        auto_commit?: boolean | undefined;
        commit_frequency?: string | undefined;
    }>;
    llm: z.ZodOptional<z.ZodObject<{
        provider: z.ZodDefault<z.ZodEnum<["openrouter", "claude-code", "local-cuda", "local-cpu", "ollama", "llamacpp", "vllm"]>>;
        huggingface_token: z.ZodOptional<z.ZodString>;
        local_model: z.ZodOptional<z.ZodObject<{
            path: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            quantization: z.ZodOptional<z.ZodString>;
            context_size: z.ZodDefault<z.ZodNumber>;
            gpu_layers: z.ZodOptional<z.ZodNumber>;
            threads: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            context_size: number;
            path?: string | undefined;
            name?: string | undefined;
            threads?: number | undefined;
            quantization?: string | undefined;
            gpu_layers?: number | undefined;
        }, {
            path?: string | undefined;
            name?: string | undefined;
            threads?: number | undefined;
            quantization?: string | undefined;
            context_size?: number | undefined;
            gpu_layers?: number | undefined;
        }>>;
        vllm_options: z.ZodOptional<z.ZodObject<{
            tensor_parallel_size: z.ZodOptional<z.ZodNumber>;
            dtype: z.ZodOptional<z.ZodEnum<["auto", "half", "float16", "bfloat16", "float32"]>>;
            gpu_memory_utilization: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            dtype?: "auto" | "half" | "float16" | "bfloat16" | "float32" | undefined;
            tensor_parallel_size?: number | undefined;
            gpu_memory_utilization?: number | undefined;
        }, {
            dtype?: "auto" | "half" | "float16" | "bfloat16" | "float32" | undefined;
            tensor_parallel_size?: number | undefined;
            gpu_memory_utilization?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        provider: "ollama" | "llamacpp" | "vllm" | "openrouter" | "claude-code" | "local-cuda" | "local-cpu";
        huggingface_token?: string | undefined;
        local_model?: {
            context_size: number;
            path?: string | undefined;
            name?: string | undefined;
            threads?: number | undefined;
            quantization?: string | undefined;
            gpu_layers?: number | undefined;
        } | undefined;
        vllm_options?: {
            dtype?: "auto" | "half" | "float16" | "bfloat16" | "float32" | undefined;
            tensor_parallel_size?: number | undefined;
            gpu_memory_utilization?: number | undefined;
        } | undefined;
    }, {
        provider?: "ollama" | "llamacpp" | "vllm" | "openrouter" | "claude-code" | "local-cuda" | "local-cpu" | undefined;
        huggingface_token?: string | undefined;
        local_model?: {
            path?: string | undefined;
            name?: string | undefined;
            threads?: number | undefined;
            quantization?: string | undefined;
            context_size?: number | undefined;
            gpu_layers?: number | undefined;
        } | undefined;
        vllm_options?: {
            dtype?: "auto" | "half" | "float16" | "bfloat16" | "float32" | undefined;
            tensor_parallel_size?: number | undefined;
            gpu_memory_utilization?: number | undefined;
        } | undefined;
    }>>;
    openrouter: z.ZodObject<{
        api_key: z.ZodOptional<z.ZodString>;
        model: z.ZodDefault<z.ZodString>;
        temperature: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        model: string;
        temperature: number;
        api_key?: string | undefined;
    }, {
        model?: string | undefined;
        temperature?: number | undefined;
        api_key?: string | undefined;
    }>;
    claude_code: z.ZodObject<{
        api_key: z.ZodOptional<z.ZodString>;
        use_subscription: z.ZodDefault<z.ZodBoolean>;
        use_sdk: z.ZodDefault<z.ZodBoolean>;
        workspace: z.ZodString;
        max_file_size: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        use_subscription: boolean;
        use_sdk: boolean;
        workspace: string;
        max_file_size: number;
        api_key?: string | undefined;
    }, {
        workspace: string;
        api_key?: string | undefined;
        use_subscription?: boolean | undefined;
        use_sdk?: boolean | undefined;
        max_file_size?: number | undefined;
    }>;
    persistence: z.ZodObject<{
        type: z.ZodDefault<z.ZodString>;
        path: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        type: string;
    }, {
        path?: string | undefined;
        type?: string | undefined;
    }>;
    monitoring: z.ZodObject<{
        log_level: z.ZodDefault<z.ZodString>;
        log_path: z.ZodDefault<z.ZodString>;
        enable_telemetry: z.ZodDefault<z.ZodBoolean>;
        enable_perf_logs: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        log_level: string;
        log_path: string;
        enable_telemetry: boolean;
        enable_perf_logs: boolean;
    }, {
        log_level?: string | undefined;
        log_path?: string | undefined;
        enable_telemetry?: boolean | undefined;
        enable_perf_logs?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    repository: {
        path: string;
        auto_commit: boolean;
        commit_frequency: string;
    };
    openrouter: {
        model: string;
        temperature: number;
        api_key?: string | undefined;
    };
    orchestrator: {
        mode: string;
        max_iterations: number;
        checkpoint_interval: number;
        llm_provider?: "ollama" | "llamacpp" | "vllm" | "openrouter" | "claude-code" | "local-cuda" | "local-cpu" | undefined;
    };
    claude_code: {
        use_subscription: boolean;
        use_sdk: boolean;
        workspace: string;
        max_file_size: number;
        api_key?: string | undefined;
    };
    persistence: {
        path: string;
        type: string;
    };
    monitoring: {
        log_level: string;
        log_path: string;
        enable_telemetry: boolean;
        enable_perf_logs: boolean;
    };
    llm?: {
        provider: "ollama" | "llamacpp" | "vllm" | "openrouter" | "claude-code" | "local-cuda" | "local-cpu";
        huggingface_token?: string | undefined;
        local_model?: {
            context_size: number;
            path?: string | undefined;
            name?: string | undefined;
            threads?: number | undefined;
            quantization?: string | undefined;
            gpu_layers?: number | undefined;
        } | undefined;
        vllm_options?: {
            dtype?: "auto" | "half" | "float16" | "bfloat16" | "float32" | undefined;
            tensor_parallel_size?: number | undefined;
            gpu_memory_utilization?: number | undefined;
        } | undefined;
    } | undefined;
}, {
    repository: {
        path: string;
        auto_commit?: boolean | undefined;
        commit_frequency?: string | undefined;
    };
    openrouter: {
        model?: string | undefined;
        temperature?: number | undefined;
        api_key?: string | undefined;
    };
    orchestrator: {
        mode?: string | undefined;
        max_iterations?: number | undefined;
        checkpoint_interval?: number | undefined;
        llm_provider?: "ollama" | "llamacpp" | "vllm" | "openrouter" | "claude-code" | "local-cuda" | "local-cpu" | undefined;
    };
    claude_code: {
        workspace: string;
        api_key?: string | undefined;
        use_subscription?: boolean | undefined;
        use_sdk?: boolean | undefined;
        max_file_size?: number | undefined;
    };
    persistence: {
        path?: string | undefined;
        type?: string | undefined;
    };
    monitoring: {
        log_level?: string | undefined;
        log_path?: string | undefined;
        enable_telemetry?: boolean | undefined;
        enable_perf_logs?: boolean | undefined;
    };
    llm?: {
        provider?: "ollama" | "llamacpp" | "vllm" | "openrouter" | "claude-code" | "local-cuda" | "local-cpu" | undefined;
        huggingface_token?: string | undefined;
        local_model?: {
            path?: string | undefined;
            name?: string | undefined;
            threads?: number | undefined;
            quantization?: string | undefined;
            context_size?: number | undefined;
            gpu_layers?: number | undefined;
        } | undefined;
        vllm_options?: {
            dtype?: "auto" | "half" | "float16" | "bfloat16" | "float32" | undefined;
            tensor_parallel_size?: number | undefined;
            gpu_memory_utilization?: number | undefined;
        } | undefined;
    } | undefined;
}>;
export type Config = z.infer<typeof ConfigSchema>;
export declare function loadConfig(configPath: string): Promise<Config>;
export declare function saveConfig(config: Config, configPath: string): Promise<void>;
export {};
//# sourceMappingURL=config-loader.d.ts.map