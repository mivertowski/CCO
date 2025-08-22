"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Orchestrator = void 0;
const session_1 = require("../models/session");
const progress_tracker_1 = require("./progress-tracker");
const manager_llm_1 = require("../llm/manager-llm");
const logger_1 = require("../monitoring/logger");
const progress_reporter_1 = require("../monitoring/progress-reporter");
const telemetry_1 = require("../monitoring/telemetry");
const uuid_1 = require("uuid");
class Orchestrator {
    mission;
    openRouterClient;
    claudeCodeClient;
    sessionManager;
    progressTracker;
    managerLLM;
    logger;
    progressReporter;
    telemetry;
    checkpointInterval;
    maxIterations;
    currentSession = null;
    interactive;
    constructor(config) {
        this.mission = config.mission;
        this.openRouterClient = config.openRouterClient;
        this.claudeCodeClient = config.claudeCodeClient;
        this.sessionManager = config.sessionManager;
        // Create enhanced logger
        this.logger = config.logger instanceof logger_1.EnhancedLogger
            ? config.logger
            : (0, logger_1.createEnhancedLogger)('.cco/logs', {
                missionId: config.mission.id,
                repository: config.mission.repository
            });
        this.checkpointInterval = config.checkpointInterval || 5;
        this.maxIterations = config.maxIterations || 1000;
        this.interactive = config.interactive ?? true;
        // Create progress reporter
        this.progressReporter = (0, progress_reporter_1.createProgressReporter)(this.logger, this.interactive);
        // Create telemetry collector if enabled
        if (config.enableTelemetry ?? process.env.ENABLE_TELEMETRY === 'true') {
            this.telemetry = (0, telemetry_1.createTelemetryCollector)(this.logger);
        }
        // Get winston logger for components that require it
        const winstonLogger = this.logger instanceof logger_1.EnhancedLogger
            ? this.logger.winstonLogger
            : this.logger;
        this.progressTracker = new progress_tracker_1.ProgressTracker(winstonLogger);
        this.managerLLM = new manager_llm_1.ManagerLLM(this.openRouterClient, winstonLogger);
    }
    async orchestrate() {
        const orchestrationTimer = this.logger.startTimer();
        try {
            this.logger.orchestration('Starting orchestration', {
                missionId: this.mission.id,
                title: this.mission.title,
                repository: this.mission.repository
            });
            // Start progress reporting
            this.progressReporter.startPhase('Initialization', 'Setting up orchestration environment...');
            // Initialize or recover session
            this.currentSession = await this.initializeSession();
            // Initialize DoD progress tracking
            this.progressReporter.initializeDoDProgress(this.mission);
            // Validate Claude Code environment
            this.progressReporter.updatePhase('Validating Claude Code environment...');
            const envTimer = this.telemetry?.startTimer('claudecode.validation');
            const isValidEnvironment = await this.claudeCodeClient.validateEnvironment();
            const envDuration = envTimer ? envTimer() : 0;
            if (!isValidEnvironment) {
                this.progressReporter.completePhase(false, 'Claude Code environment validation failed');
                throw new Error('Claude Code environment validation failed');
            }
            this.progressReporter.completePhase(true, 'Environment validated');
            if (typeof envDuration === 'number') {
                this.telemetry?.trackApiCall('claudecode', 'validate', true, envDuration);
            }
            // Start Claude Code session
            if (this.claudeCodeClient.startSession) {
                this.claudeCodeClient.startSession(this.currentSession.sessionId);
                this.logger.claudeCode('Session started', { sessionId: this.currentSession.sessionId });
            }
            // Main orchestration loop
            this.progressReporter.startPhase('Execution', 'Running orchestration iterations...');
            while (!this.isComplete() && this.currentSession.iterations < this.maxIterations) {
                await this.executeIteration();
                // Report iteration progress
                this.progressReporter.reportIteration(this.currentSession.iterations, this.maxIterations, this.currentSession);
                // Track mission progress in telemetry
                this.telemetry?.trackMissionProgress(this.mission.id, this.currentSession.phase || this.currentSession.currentPhase, this.currentSession.iterations, this.currentSession.completedDoDCriteria?.length || 0, this.mission.definitionOfDone.length);
                // Checkpoint periodically
                if (this.currentSession.iterations % this.checkpointInterval === 0) {
                    await this.checkpoint();
                }
            }
            this.progressReporter.completePhase(true, 'Execution completed');
            // Final checkpoint
            await this.checkpoint();
            // End Claude Code session
            if (this.claudeCodeClient.endSession) {
                this.claudeCodeClient.endSession();
            }
            // Prepare final result
            const finalResult = await this.prepareFinalResult();
            const duration = orchestrationTimer();
            // Generate final report
            this.progressReporter.generateFinalReport(finalResult.success, this.currentSession, this.mission);
            // Log orchestration completion
            this.logger.orchestration('Orchestration completed', {
                missionId: this.mission.id,
                success: finalResult.success,
                iterations: this.currentSession.iterations,
                completionPercentage: this.progressTracker.calculateProgress(this.mission).completionPercentage,
                duration
            });
            // Record performance metrics
            this.logger.performance('Total orchestration time', duration, {
                missionId: this.mission.id,
                success: finalResult.success
            });
            // Clean up telemetry
            if (this.telemetry) {
                await this.telemetry.stop();
            }
            return finalResult;
        }
        catch (error) {
            // Report error through progress reporter
            this.progressReporter.reportError(error, 'orchestration', false);
            // Log error with enhanced context
            this.logger.error('Orchestration failed', error, {
                missionId: this.mission.id,
                phase: this.currentSession?.phase || this.currentSession?.currentPhase,
                iteration: this.currentSession?.iterations,
                completedTasks: this.currentSession?.completedDoDCriteria?.length || 0
            });
            // Track error in telemetry
            this.telemetry?.trackError(error, 'orchestration', false);
            if (this.currentSession) {
                await this.sessionManager.addError(this.currentSession.sessionId, {
                    id: (0, uuid_1.v4)(),
                    timestamp: new Date(),
                    type: 'OrchestrationError',
                    message: error.message,
                    stack: error.stack,
                    resolved: false
                });
                // Generate final report even on failure
                this.progressReporter.generateFinalReport(false, this.currentSession, this.mission);
            }
            // Clean up telemetry even on error
            if (this.telemetry) {
                await this.telemetry.stop();
            }
            throw error;
        }
    }
    async initializeSession() {
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
        return await this.sessionManager.createSession(this.mission.id, this.mission.repository);
    }
    async executeIteration() {
        if (!this.currentSession) {
            throw new Error('No active session');
        }
        this.logger.debug('Starting iteration', {
            iteration: this.currentSession.iterations + 1,
            sessionId: this.currentSession.sessionId
        });
        try {
            // Phase 1: Analysis
            await this.updatePhase(session_1.SessionPhase.PLANNING);
            const analysis = await this.managerLLM.analyzeCurrentState(this.mission, this.currentSession, this.progressTracker.calculateProgress(this.mission));
            // Phase 2: Planning
            const nextCriterion = this.progressTracker.getNextPriorityCriterion(this.mission);
            if (!nextCriterion) {
                this.logger.info('No more criteria to complete');
                await this.updatePhase(session_1.SessionPhase.COMPLETION);
                return;
            }
            const actionPlan = await this.managerLLM.planNextAction(analysis, nextCriterion, this.currentSession);
            // Phase 3: Execution
            await this.updatePhase(session_1.SessionPhase.EXECUTION);
            const executionResult = await this.executeAction(actionPlan);
            // Phase 4: Validation
            await this.updatePhase(session_1.SessionPhase.VALIDATION);
            await this.validateAndUpdateProgress(executionResult, nextCriterion);
            // Update iteration count
            this.currentSession.iterations++;
            await this.sessionManager.saveSession(this.currentSession);
        }
        catch (error) {
            this.logger.error('Iteration failed', {
                iteration: this.currentSession.iterations,
                error
            });
            await this.handleIterationError(error);
        }
    }
    async executeAction(actionPlan) {
        if (!this.currentSession) {
            throw new Error('No active session');
        }
        const context = {
            workingDirectory: this.mission.repository,
            environment: process.env,
            previousArtifacts: this.currentSession.artifacts.map(a => ({
                path: a.path,
                content: a.content.substring(0, 500) // Truncate for context
            }))
        };
        const result = await this.claudeCodeClient.execute(actionPlan, context);
        // Store artifacts
        for (const artifact of result.artifacts) {
            await this.sessionManager.addArtifact(this.currentSession.sessionId, {
                id: (0, uuid_1.v4)(),
                type: artifact.type,
                path: artifact.path,
                content: artifact.content,
                version: this.currentSession.artifacts.filter(a => a.path === artifact.path).length + 1,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
        return result;
    }
    async validateAndUpdateProgress(executionResult, criterion) {
        if (!this.currentSession) {
            throw new Error('No active session');
        }
        const validation = await this.managerLLM.validateCriterionCompletion(criterion, executionResult, this.currentSession);
        if (validation.completed) {
            this.mission = this.progressTracker.markCriterionComplete(this.mission, criterion.id, validation.evidence);
            this.currentSession.completedTasks.push(criterion.id);
            const pendingIndex = this.currentSession.pendingTasks.indexOf(criterion.id);
            if (pendingIndex > -1) {
                this.currentSession.pendingTasks.splice(pendingIndex, 1);
            }
            this.logger.info('Criterion completed', {
                criterionId: criterion.id,
                description: criterion.description
            });
        }
        else {
            this.logger.info('Criterion not yet complete', {
                criterionId: criterion.id,
                reason: validation.reason
            });
        }
    }
    async handleIterationError(error) {
        if (!this.currentSession) {
            throw new Error('No active session');
        }
        await this.updatePhase(session_1.SessionPhase.ERROR_RECOVERY);
        const recovery = await this.managerLLM.generateErrorRecovery(error, this.currentSession);
        if (recovery.canRecover) {
            this.logger.info('Attempting error recovery', {
                strategy: recovery.strategy
            });
            // Add recovery action to pending tasks
            if (recovery.recoveryAction) {
                this.currentSession.pendingTasks.unshift(recovery.recoveryAction);
            }
        }
        else {
            this.logger.error('Cannot recover from error', {
                error: error.message
            });
            throw error;
        }
    }
    async updatePhase(phase) {
        if (!this.currentSession) {
            throw new Error('No active session');
        }
        this.currentSession.currentPhase = phase;
        await this.sessionManager.updatePhase(this.currentSession.sessionId, phase);
    }
    async checkpoint() {
        if (!this.currentSession) {
            throw new Error('No active session');
        }
        this.logger.debug('Creating checkpoint', {
            sessionId: this.currentSession.sessionId,
            iteration: this.currentSession.iterations
        });
        await this.sessionManager.checkpoint(this.currentSession.sessionId);
    }
    isComplete() {
        return this.progressTracker.checkCompletion(this.mission);
    }
    async prepareFinalResult() {
        if (!this.currentSession) {
            throw new Error('No active session');
        }
        const progress = this.progressTracker.calculateProgress(this.mission);
        const success = this.isComplete();
        const metrics = {
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
            filesModified: this.currentSession.artifacts.filter(a => a.type === session_1.ArtifactType.CODE).length,
            linesOfCodeAdded: 0, // Would need to track this
            testsCreated: this.currentSession.artifacts.filter(a => a.type === session_1.ArtifactType.TEST).length,
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
exports.Orchestrator = Orchestrator;
//# sourceMappingURL=orchestrator.js.map