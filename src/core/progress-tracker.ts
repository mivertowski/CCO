import { Mission, DoDCriteria, DoDPriority, MissionProgress } from '../models/mission';
import { SessionState } from '../models/session';
import winston from 'winston';

export class ProgressTracker {
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  calculateProgress(mission: Mission): MissionProgress {
    const totalCriteria = mission.definitionOfDone.length;
    const completedCriteria = mission.definitionOfDone.filter(dod => dod.completed).length;
    
    const criticalCriteria = mission.definitionOfDone.filter(
      dod => dod.priority === DoDPriority.CRITICAL
    );
    const criticalCompleted = criticalCriteria.filter(dod => dod.completed).length;
    
    const completionPercentage = totalCriteria > 0 
      ? Math.round((completedCriteria / totalCriteria) * 100)
      : 0;
    
    const currentPhase = this.determineCurrentPhase(completionPercentage);
    
    this.logger.info('Progress calculated', {
      missionId: mission.id,
      completedCriteria,
      totalCriteria,
      completionPercentage,
      currentPhase
    });
    
    return {
      missionId: mission.id,
      totalCriteria,
      completedCriteria,
      criticalCriteria: criticalCriteria.length,
      criticalCompleted,
      completionPercentage,
      currentPhase
    };
  }

  checkCompletion(mission: Mission): boolean {
    // If there are no DoD criteria, the mission cannot be complete
    if (mission.definitionOfDone.length === 0) {
      this.logger.warn('Mission has no Definition of Done criteria', {
        missionId: mission.id
      });
      return false;
    }
    
    const allCompleted = mission.definitionOfDone.every(dod => dod.completed);
    
    // Get criteria by priority
    const criticalCriteria = mission.definitionOfDone
      .filter(dod => dod.priority === DoDPriority.CRITICAL);
    const highCriteria = mission.definitionOfDone
      .filter(dod => dod.priority === DoDPriority.HIGH);
    
    // Check if all critical criteria are completed (if any exist)
    if (criticalCriteria.length > 0) {
      const allCriticalCompleted = criticalCriteria.every(dod => dod.completed);
      if (!allCriticalCompleted) {
        this.logger.info('Mission not complete - critical criteria pending', {
          missionId: mission.id
        });
        return false;
      }
    }
    
    // If all criteria are completed, mission is complete
    if (allCompleted) {
      this.logger.info('Mission complete - all DoD criteria met', {
        missionId: mission.id
      });
      return true;
    }
    
    // If there are high priority criteria, they must be completed along with critical
    if (highCriteria.length > 0 || criticalCriteria.length > 0) {
      const highCompleted = highCriteria.length === 0 || highCriteria.every(dod => dod.completed);
      const criticalCompleted = criticalCriteria.length === 0 || criticalCriteria.every(dod => dod.completed);
      return highCompleted && criticalCompleted;
    }
    
    // For medium and low priority only missions, all must be completed
    return false;
  }

  markCriterionComplete(
    mission: Mission,
    criterionId: string,
    evidence?: string
  ): Mission {
    const updatedMission = { ...mission };
    const criterion = updatedMission.definitionOfDone.find(dod => dod.id === criterionId);
    
    if (!criterion) {
      throw new Error(`Criterion ${criterionId} not found in mission ${mission.id}`);
    }
    
    criterion.completed = true;
    criterion.completedAt = new Date();
    
    if (evidence) {
      criterion.evidence = evidence;
    }
    
    this.logger.info('Marked criterion as complete', {
      missionId: mission.id,
      criterionId,
      description: criterion.description
    });
    
    return updatedMission;
  }

  getNextPriorityCriterion(mission: Mission): DoDCriteria | null {
    const priorityOrder = [
      DoDPriority.CRITICAL,
      DoDPriority.HIGH,
      DoDPriority.MEDIUM,
      DoDPriority.LOW
    ];
    
    for (const priority of priorityOrder) {
      const pendingCriteria = mission.definitionOfDone.find(
        dod => dod.priority === priority && !dod.completed
      );
      
      if (pendingCriteria) {
        this.logger.debug('Found next priority criterion', {
          criterionId: pendingCriteria.id,
          priority: pendingCriteria.priority,
          description: pendingCriteria.description
        });
        return pendingCriteria;
      }
    }
    
    return null;
  }

  getPendingCriteria(mission: Mission): DoDCriteria[] {
    return mission.definitionOfDone.filter(dod => !dod.completed);
  }

  getCompletedCriteria(mission: Mission): DoDCriteria[] {
    return mission.definitionOfDone.filter(dod => dod.completed);
  }

  generateProgressReport(mission: Mission, session: SessionState): string {
    const progress = this.calculateProgress(mission);
    const pendingCriteria = this.getPendingCriteria(mission);
    const completedCriteria = this.getCompletedCriteria(mission);
    
    let report = `Mission Progress Report\n`;
    report += `========================\n\n`;
    report += `Mission: ${mission.title}\n`;
    report += `Repository: ${mission.repository}\n`;
    report += `Session: ${session.sessionId}\n`;
    report += `Iterations: ${session.iterations}\n\n`;
    
    report += `Progress: ${progress.completionPercentage}% Complete\n`;
    report += `Phase: ${progress.currentPhase}\n`;
    report += `Criteria: ${progress.completedCriteria}/${progress.totalCriteria}\n`;
    report += `Critical: ${progress.criticalCompleted}/${progress.criticalCriteria}\n\n`;
    
    if (completedCriteria.length > 0) {
      report += `Completed Criteria:\n`;
      for (const criterion of completedCriteria) {
        report += `  ✓ [${criterion.priority}] ${criterion.description}\n`;
        if (criterion.completedAt) {
          report += `    Completed: ${criterion.completedAt.toISOString()}\n`;
        }
      }
      report += `\n`;
    }
    
    if (pendingCriteria.length > 0) {
      report += `Pending Criteria:\n`;
      for (const criterion of pendingCriteria) {
        report += `  ○ [${criterion.priority}] ${criterion.description}\n`;
      }
      report += `\n`;
    }
    
    if (session.errors.length > 0) {
      const unresolvedErrors = session.errors.filter(e => !e.resolved);
      if (unresolvedErrors.length > 0) {
        report += `Unresolved Errors: ${unresolvedErrors.length}\n`;
      }
    }
    
    return report;
  }

  estimateTimeRemaining(
    mission: Mission,
    session: SessionState,
    averageTimePerCriterion: number
  ): number {
    const pendingCount = this.getPendingCriteria(mission).length;
    
    if (pendingCount === 0) {
      return 0;
    }
    
    if (session.iterations === 0) {
      return pendingCount * averageTimePerCriterion;
    }
    
    const completedCount = this.getCompletedCriteria(mission).length;
    
    if (completedCount === 0) {
      return pendingCount * averageTimePerCriterion;
    }
    
    const timePerCriterion = (Date.now() - session.timestamp.getTime()) / completedCount;
    
    return Math.round(pendingCount * timePerCriterion);
  }

  private determineCurrentPhase(completionPercentage: number): string {
    if (completionPercentage === 0) {
      return 'Initialization';
    } else if (completionPercentage < 25) {
      return 'Early Development';
    } else if (completionPercentage < 50) {
      return 'Core Implementation';
    } else if (completionPercentage < 75) {
      return 'Feature Completion';
    } else if (completionPercentage < 100) {
      return 'Final Validation';
    } else {
      return 'Complete';
    }
  }
}