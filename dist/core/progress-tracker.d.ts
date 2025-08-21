import { Mission, DoDCriteria, MissionProgress } from '../models/mission';
import { SessionState } from '../models/session';
import winston from 'winston';
export declare class ProgressTracker {
    private logger;
    constructor(logger: winston.Logger);
    calculateProgress(mission: Mission): MissionProgress;
    checkCompletion(mission: Mission): boolean;
    markCriterionComplete(mission: Mission, criterionId: string, evidence?: string): Mission;
    getNextPriorityCriterion(mission: Mission): DoDCriteria | null;
    getPendingCriteria(mission: Mission): DoDCriteria[];
    getCompletedCriteria(mission: Mission): DoDCriteria[];
    generateProgressReport(mission: Mission, session: SessionState): string;
    estimateTimeRemaining(mission: Mission, session: SessionState, averageTimePerCriterion: number): number;
    private determineCurrentPhase;
}
//# sourceMappingURL=progress-tracker.d.ts.map