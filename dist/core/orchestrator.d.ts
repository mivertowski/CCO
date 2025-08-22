import { Mission } from '../models/mission';
import { SessionState, Artifact } from '../models/session';
import { OrchestrationMetrics } from '../models/metrics';
import { ILLMClient } from '../llm/llm-provider';
import { IClaudeCodeClient } from '../llm/claude-code-interface';
import { SessionManager } from './session-manager';
import { EnhancedLogger } from '../monitoring/logger';
import winston from 'winston';
export interface OrchestratorConfig {
    mission: Mission;
    openRouterClient: ILLMClient;
    claudeCodeClient: IClaudeCodeClient;
    sessionManager: SessionManager;
    logger: winston.Logger | EnhancedLogger;
    checkpointInterval?: number;
    maxIterations?: number;
    interactive?: boolean;
    enableTelemetry?: boolean;
}
export interface OrchestrationResult {
    success: boolean;
    mission: Mission;
    finalState: SessionState;
    metrics: OrchestrationMetrics;
    artifacts: Artifact[];
    error?: Error;
}
export declare class Orchestrator {
    private mission;
    private openRouterClient;
    private claudeCodeClient;
    private sessionManager;
    private progressTracker;
    private managerLLM;
    private logger;
    private progressReporter;
    private telemetry?;
    private checkpointInterval;
    private maxIterations;
    private currentSession;
    private interactive;
    constructor(config: OrchestratorConfig);
    orchestrate(): Promise<OrchestrationResult>;
    private initializeSession;
    private executeIteration;
    private executeAction;
    private validateAndUpdateProgress;
    private handleIterationError;
    private updatePhase;
    private checkpoint;
    private isComplete;
    private prepareFinalResult;
}
//# sourceMappingURL=orchestrator.d.ts.map