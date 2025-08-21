import { z } from 'zod';
declare const ConfigSchema: z.ZodObject<{
    orchestrator: z.ZodObject<{
        mode: z.ZodDefault<z.ZodString>;
        max_iterations: z.ZodDefault<z.ZodNumber>;
        checkpoint_interval: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mode: string;
        max_iterations: number;
        checkpoint_interval: number;
    }, {
        mode?: string | undefined;
        max_iterations?: number | undefined;
        checkpoint_interval?: number | undefined;
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
        workspace: z.ZodString;
        max_file_size: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        use_subscription: boolean;
        workspace: string;
        max_file_size: number;
        api_key?: string | undefined;
    }, {
        workspace: string;
        api_key?: string | undefined;
        use_subscription?: boolean | undefined;
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
    }, "strip", z.ZodTypeAny, {
        log_level: string;
        log_path: string;
    }, {
        log_level?: string | undefined;
        log_path?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    repository: {
        path: string;
        auto_commit: boolean;
        commit_frequency: string;
    };
    orchestrator: {
        mode: string;
        max_iterations: number;
        checkpoint_interval: number;
    };
    openrouter: {
        model: string;
        temperature: number;
        api_key?: string | undefined;
    };
    claude_code: {
        use_subscription: boolean;
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
    };
}, {
    repository: {
        path: string;
        auto_commit?: boolean | undefined;
        commit_frequency?: string | undefined;
    };
    orchestrator: {
        mode?: string | undefined;
        max_iterations?: number | undefined;
        checkpoint_interval?: number | undefined;
    };
    openrouter: {
        model?: string | undefined;
        temperature?: number | undefined;
        api_key?: string | undefined;
    };
    claude_code: {
        workspace: string;
        api_key?: string | undefined;
        use_subscription?: boolean | undefined;
        max_file_size?: number | undefined;
    };
    persistence: {
        path?: string | undefined;
        type?: string | undefined;
    };
    monitoring: {
        log_level?: string | undefined;
        log_path?: string | undefined;
    };
}>;
export type Config = z.infer<typeof ConfigSchema>;
export declare function loadConfig(configPath: string): Promise<Config>;
export declare function saveConfig(config: Config, configPath: string): Promise<void>;
export {};
//# sourceMappingURL=config-loader.d.ts.map