import { OpenRouterClient } from './openrouter-client';
import { Mission, DoDCriteria, MissionProgress } from '../models/mission';
import { SessionState } from '../models/session';
import { ClaudeCodeResult } from './claude-code-client';
import winston from 'winston';
export interface AnalysisResult {
    currentStatus: string;
    blockers: string[];
    recommendations: string[];
    nextSteps: string[];
    confidence: number;
}
export interface ValidationResult {
    completed: boolean;
    evidence?: string;
    reason?: string;
    confidence: number;
}
export interface ErrorRecovery {
    canRecover: boolean;
    strategy?: string;
    recoveryAction?: string;
    reason?: string;
}
export declare class ManagerLLM {
    private client;
    private logger;
    constructor(client: OpenRouterClient, logger: winston.Logger);
    analyzeCurrentState(mission: Mission, session: SessionState, progress: MissionProgress): Promise<AnalysisResult>;
    planNextAction(analysis: AnalysisResult, criterion: DoDCriteria, session: SessionState): Promise<string>;
    validateCriterionCompletion(criterion: DoDCriteria, executionResult: ClaudeCodeResult, session: SessionState): Promise<ValidationResult>;
    generateErrorRecovery(error: Error, session: SessionState): Promise<ErrorRecovery>;
    provideMotivation(progress: MissionProgress, session: SessionState): Promise<string>;
    private buildAnalysisSystemPrompt;
    private buildAnalysisUserMessage;
    private buildPlanningSystemPrompt;
    private buildPlanningUserMessage;
    private buildValidationSystemPrompt;
    private buildValidationUserMessage;
    private buildErrorRecoverySystemPrompt;
    private buildErrorRecoveryUserMessage;
    private parseAnalysisResponse;
    private parseValidationResponse;
    private parseErrorRecoveryResponse;
}
//# sourceMappingURL=manager-llm.d.ts.map