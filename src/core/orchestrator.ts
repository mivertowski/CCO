import { Mission, DoDCriteria } from '../models/mission';
import { SessionState, SessionPhase, Artifact, ArtifactType } from '../models/session';
import { OrchestrationMetrics } from '../models/metrics';
import { OpenRouterClient } from '../llm/openrouter-client';
import { IClaudeCodeClient, ClaudeCodeResult } from '../llm/claude-code-interface';
import { ProgressTracker } from './progress-tracker';
import { SessionManager } from './session-manager';
import { ManagerLLM } from '../llm/manager-llm';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

export interface OrchestratorConfig {
  mission: Mission;
  openRouterClient: OpenRouterClient;
  claudeCodeClient: IClaudeCodeClient;
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

export class Orchestrator {
  private mission: Mission;
  private openRouterClient: OpenRouterClient;
  private claudeCodeClient: IClaudeCodeClient;
  private sessionManager: SessionManager;
  private progressTracker: ProgressTracker;
  private managerLLM: ManagerLLM;
  private logger: winston.Logger;
  private checkpointInterval: number;
  private maxIterations: number;
  private currentSession: SessionState | null = null;

  constructor(config: OrchestratorConfig) {
    this.mission = config.mission;
    this.openRouterClient = config.openRouterClient;
    this.claudeCodeClient = config.claudeCodeClient;
    this.sessionManager = config.sessionManager;
    this.logger = config.logger;
    this.checkpointInterval = config.checkpointInterval || 5;
    this.maxIterations = config.maxIterations || 1000;
    
    this.progressTracker = new ProgressTracker(this.logger);
    this.managerLLM = new ManagerLLM(this.openRouterClient, this.logger);
  }

  async orchestrate(): Promise<OrchestrationResult> {
    try {
      this.logger.info('Starting orchestration', {
        missionId: this.mission.id,
        title: this.mission.title,
        repository: this.mission.repository
      });

      // Initialize or recover session
      this.currentSession = await this.initializeSession();
      
      // Validate Claude Code environment
      const isValidEnvironment = await this.claudeCodeClient.validateEnvironment();
      if (!isValidEnvironment) {
        throw new Error('Claude Code environment validation failed');
      }

      // Start Claude Code session
      if (this.claudeCodeClient.startSession) {
        this.claudeCodeClient.startSession(this.currentSession.sessionId);
      }

      // Main orchestration loop
      while (!this.isComplete() && this.currentSession.iterations < this.maxIterations) {
        await this.executeIteration();
        
        // Checkpoint periodically
        if (this.currentSession.iterations % this.checkpointInterval === 0) {
          await this.checkpoint();
        }
      }

      // Final checkpoint
      await this.checkpoint();
      
      // End Claude Code session
      if (this.claudeCodeClient.endSession) {
        this.claudeCodeClient.endSession();
      }

      // Prepare final result
      const finalResult = await this.prepareFinalResult();
      
      this.logger.info('Orchestration completed', {
        missionId: this.mission.id,
        success: finalResult.success,
        iterations: this.currentSession.iterations,
        completionPercentage: this.progressTracker.calculateProgress(this.mission).completionPercentage
      });

      return finalResult;
    } catch (error) {
      this.logger.error('Orchestration failed', { 
        error,
        missionId: this.mission.id 
      });
      
      if (this.currentSession) {
        await this.sessionManager.addError(this.currentSession.sessionId, {
          id: uuidv4(),
          timestamp: new Date(),
          type: 'OrchestrationError',
          message: (error as Error).message,
          stack: (error as Error).stack,
          resolved: false
        });
      }

      throw error;
    }
  }

  private async initializeSession(): Promise<SessionState> {
    // Try to recover existing session
    const existingSession = await this.sessionManager.findActiveSession(this.mission.id);
    
    if (existingSession) {
      this.logger.info('Recovering existing session', {
        sessionId: existingSession.sessionId,
        iterations: existingSession.iterations
      });
      return existingSession;
    }

    // Create new session
    return await this.sessionManager.createSession(
      this.mission.id,
      this.mission.repository
    );
  }

  private async executeIteration(): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.logger.debug('Starting iteration', {
      iteration: this.currentSession.iterations + 1,
      sessionId: this.currentSession.sessionId
    });

    try {
      // Phase 1: Analysis
      await this.updatePhase(SessionPhase.PLANNING);
      const analysis = await this.managerLLM.analyzeCurrentState(
        this.mission,
        this.currentSession,
        this.progressTracker.calculateProgress(this.mission)
      );

      // Phase 2: Planning
      const nextCriterion = this.progressTracker.getNextPriorityCriterion(this.mission);
      if (!nextCriterion) {
        this.logger.info('No more criteria to complete');
        await this.updatePhase(SessionPhase.COMPLETION);
        return;
      }

      const actionPlan = await this.managerLLM.planNextAction(
        analysis,
        nextCriterion,
        this.currentSession
      );

      // Phase 3: Execution
      await this.updatePhase(SessionPhase.EXECUTION);
      const executionResult = await this.executeAction(actionPlan);

      // Phase 4: Validation
      await this.updatePhase(SessionPhase.VALIDATION);
      await this.validateAndUpdateProgress(executionResult, nextCriterion);

      // Update iteration count
      this.currentSession.iterations++;
      await this.sessionManager.saveSession(this.currentSession);

    } catch (error) {
      this.logger.error('Iteration failed', {
        iteration: this.currentSession.iterations,
        error
      });
      
      await this.handleIterationError(error as Error);
    }
  }

  private async executeAction(actionPlan: string): Promise<ClaudeCodeResult> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const context = {
      workingDirectory: this.mission.repository,
      environment: process.env as Record<string, string>,
      previousArtifacts: this.currentSession.artifacts.map(a => ({
        path: a.path,
        content: a.content.substring(0, 500) // Truncate for context
      }))
    };

    const result = await this.claudeCodeClient.execute(actionPlan, context);

    // Store artifacts
    for (const artifact of result.artifacts) {
      await this.sessionManager.addArtifact(this.currentSession.sessionId, {
        id: uuidv4(),
        type: artifact.type as ArtifactType,
        path: artifact.path,
        content: artifact.content,
        version: this.currentSession.artifacts.filter(a => a.path === artifact.path).length + 1,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return result;
  }

  private async validateAndUpdateProgress(
    executionResult: ClaudeCodeResult,
    criterion: DoDCriteria
  ): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const validation = await this.managerLLM.validateCriterionCompletion(
      criterion,
      executionResult,
      this.currentSession
    );

    if (validation.completed) {
      this.mission = this.progressTracker.markCriterionComplete(
        this.mission,
        criterion.id,
        validation.evidence
      );
      
      this.currentSession.completedTasks.push(criterion.id);
      const pendingIndex = this.currentSession.pendingTasks.indexOf(criterion.id);
      if (pendingIndex > -1) {
        this.currentSession.pendingTasks.splice(pendingIndex, 1);
      }

      this.logger.info('Criterion completed', {
        criterionId: criterion.id,
        description: criterion.description
      });
    } else {
      this.logger.info('Criterion not yet complete', {
        criterionId: criterion.id,
        reason: validation.reason
      });
    }
  }

  private async handleIterationError(error: Error): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    await this.updatePhase(SessionPhase.ERROR_RECOVERY);

    const recovery = await this.managerLLM.generateErrorRecovery(
      error,
      this.currentSession
    );

    if (recovery.canRecover) {
      this.logger.info('Attempting error recovery', {
        strategy: recovery.strategy
      });
      
      // Add recovery action to pending tasks
      if (recovery.recoveryAction) {
        this.currentSession.pendingTasks.unshift(recovery.recoveryAction);
      }
    } else {
      this.logger.error('Cannot recover from error', {
        error: error.message
      });
      throw error;
    }
  }

  private async updatePhase(phase: SessionPhase): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.currentPhase = phase;
    await this.sessionManager.updatePhase(this.currentSession.sessionId, phase);
  }

  private async checkpoint(): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.logger.debug('Creating checkpoint', {
      sessionId: this.currentSession.sessionId,
      iteration: this.currentSession.iterations
    });

    await this.sessionManager.checkpoint(this.currentSession.sessionId);
  }

  private isComplete(): boolean {
    return this.progressTracker.checkCompletion(this.mission);
  }

  private async prepareFinalResult(): Promise<OrchestrationResult> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const progress = this.progressTracker.calculateProgress(this.mission);
    const success = this.isComplete();

    const metrics: OrchestrationMetrics = {
      totalIterations: this.currentSession.iterations,
      dodCriteriaCompleted: progress.completedCriteria,
      dodCriteriaTotal: progress.totalCriteria,
      completionPercentage: progress.completionPercentage,
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0
      },
      apiCallsTotal: this.currentSession.iterations * 2, // Rough estimate
      sessionCount: 1,
      errorRecoveries: this.currentSession.errors.filter(e => e.resolved).length,
      successfulActions: this.currentSession.completedTasks.length,
      failedActions: this.currentSession.errors.length,
      filesModified: this.currentSession.artifacts.filter(a => a.type === ArtifactType.CODE).length,
      linesOfCodeAdded: 0, // Would need to track this
      testsCreated: this.currentSession.artifacts.filter(a => a.type === ArtifactType.TEST).length,
      estimatedCost: 0, // Calculate from token usage
      costPerCriteria: 0, // Calculate from total cost
      startTime: this.currentSession.timestamp,
      currentTime: new Date()
    };

    return {
      success,
      mission: this.mission,
      finalState: this.currentSession,
      metrics,
      artifacts: this.currentSession.artifacts
    };
  }
}