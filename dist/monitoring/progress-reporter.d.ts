/**
 * Progress reporting and visualization utilities
 */
import { EnhancedLogger, LogMetadata } from './logger';
import { Mission, DoDCriteria } from '../models/mission';
import { SessionState } from '../models/session';
export interface ProgressState {
    phase: string;
    iteration: number;
    totalIterations: number;
    completedTasks: number;
    totalTasks: number;
    currentTask?: string;
    tokenUsage: {
        total: number;
        cost: number;
    };
    startTime: Date;
    estimatedCompletion?: Date;
}
export declare class ProgressReporter {
    private logger;
    private spinner?;
    private progressBar?;
    private state;
    private isInteractive;
    constructor(logger: EnhancedLogger, interactive?: boolean);
    /**
     * Start a new phase with spinner
     */
    startPhase(phase: string, message?: string): void;
    /**
     * Update current phase progress
     */
    updatePhase(message: string, metadata?: LogMetadata): void;
    /**
     * Complete current phase
     */
    completePhase(success?: boolean, message?: string): void;
    /**
     * Initialize progress bar for DoD tracking
     */
    initializeDoDProgress(mission: Mission): void;
    /**
     * Update DoD progress
     */
    updateDoDProgress(completedCriteria: DoDCriteria[]): void;
    /**
     * Complete progress bar
     */
    completeDoDProgress(): void;
    /**
     * Report iteration progress
     */
    reportIteration(iteration: number, maxIterations: number, session: SessionState): void;
    /**
     * Report token usage
     */
    reportTokenUsage(tokens: number, cost: number, context: string): void;
    /**
     * Report error with context
     */
    reportError(error: any, context: string, recoverable?: boolean): void;
    /**
     * Generate final report
     */
    generateFinalReport(success: boolean, session: SessionState, mission: Mission): void;
    /**
     * Format duration for display
     */
    private formatDuration;
    /**
     * Create a simple text-based progress bar for non-interactive mode
     */
    logProgress(current: number, total: number, label?: string): void;
}
/**
 * Create a progress reporter for a session
 */
export declare function createProgressReporter(logger: EnhancedLogger, interactive?: boolean): ProgressReporter;
//# sourceMappingURL=progress-reporter.d.ts.map