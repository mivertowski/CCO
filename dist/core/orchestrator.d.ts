import { Mission } from '../models/mission';
import { SessionState, Artifact } from '../models/session';
import { OrchestrationMetrics } from '../models/metrics';
import { OpenRouterClient } from '../llm/openrouter-client';
import { ClaudeCodeClient } from '../llm/claude-code-client';
import { SessionManager } from './session-manager';
import winston from 'winston';
export interface OrchestratorConfig {
    mission: Mission;
    openRouterClient: OpenRouterClient;
    claudeCodeClient: ClaudeCodeClient;
    sessionManager: SessionManager;
    logger: winston.Logger;
    checkpointInterval?: number;
    maxIterations?: number;
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
    private checkpointInterval;
    private maxIterations;
    private currentSession;
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