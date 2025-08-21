import { describe, it, expect, beforeEach } from 'vitest';
import { ProgressTracker } from '../../src/core/progress-tracker';
import { Mission, DoDCriteria, DoDPriority } from '../../src/models/mission';
import { SessionState, SessionPhase } from '../../src/models/session';
import winston from 'winston';

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;
  let logger: winston.Logger;
  let testMission: Mission;
  let testSession: SessionState;

  beforeEach(() => {
    logger = winston.createLogger({ silent: true });
    tracker = new ProgressTracker(logger);

    testMission = {
      id: 'mission-1',
      title: 'Test Mission',
      repository: '/test/repo',
      description: 'Test description',
      definitionOfDone: [
        {
          id: 'dod-1',
          description: 'Critical task 1',
          measurable: true,
          priority: DoDPriority.CRITICAL,
          completed: false
        },
        {
          id: 'dod-2',
          description: 'Critical task 2',
          measurable: true,
          priority: DoDPriority.CRITICAL,
          completed: false
        },
        {
          id: 'dod-3',
          description: 'High priority task',
          measurable: true,
          priority: DoDPriority.HIGH,
          completed: false
        },
        {
          id: 'dod-4',
          description: 'Medium priority task',
          measurable: true,
          priority: DoDPriority.MEDIUM,
          completed: false
        },
        {
          id: 'dod-5',
          description: 'Low priority task',
          measurable: true,
          priority: DoDPriority.LOW,
          completed: false
        }
      ],
      createdAt: new Date()
    };

    testSession = {
      sessionId: 'session-1',
      missionId: 'mission-1',
      repository: '/test/repo',
      ccInstanceId: 'cc-123',
      currentPhase: SessionPhase.EXECUTION,
      completedTasks: [],
      pendingTasks: ['dod-1', 'dod-2', 'dod-3', 'dod-4', 'dod-5'],
      artifacts: [],
      logs: [],
      errors: [],
      iterations: 5,
      timestamp: new Date()
    };
  });

  describe('calculateProgress', () => {
    it('should calculate 0% progress for no completed tasks', () => {
      const progress = tracker.calculateProgress(testMission);

      expect(progress.missionId).toBe('mission-1');
      expect(progress.totalCriteria).toBe(5);
      expect(progress.completedCriteria).toBe(0);
      expect(progress.criticalCriteria).toBe(2);
      expect(progress.criticalCompleted).toBe(0);
      expect(progress.completionPercentage).toBe(0);
      expect(progress.currentPhase).toBe('Initialization');
    });

    it('should calculate correct progress for partially completed tasks', () => {
      testMission.definitionOfDone[0].completed = true;
      testMission.definitionOfDone[2].completed = true;

      const progress = tracker.calculateProgress(testMission);

      expect(progress.completedCriteria).toBe(2);
      expect(progress.criticalCompleted).toBe(1);
      expect(progress.completionPercentage).toBe(40);
      expect(progress.currentPhase).toBe('Core Implementation');
    });

    it('should calculate 100% progress for all completed tasks', () => {
      testMission.definitionOfDone.forEach(dod => dod.completed = true);

      const progress = tracker.calculateProgress(testMission);

      expect(progress.completedCriteria).toBe(5);
      expect(progress.criticalCompleted).toBe(2);
      expect(progress.completionPercentage).toBe(100);
      expect(progress.currentPhase).toBe('Complete');
    });

    it('should handle empty DoD list', () => {
      testMission.definitionOfDone = [];

      const progress = tracker.calculateProgress(testMission);

      expect(progress.totalCriteria).toBe(0);
      expect(progress.completedCriteria).toBe(0);
      expect(progress.completionPercentage).toBe(0);
    });
  });

  describe('checkCompletion', () => {
    it('should return false if critical criteria are not complete', () => {
      testMission.definitionOfDone[2].completed = true; // High priority
      testMission.definitionOfDone[3].completed = true; // Medium priority
      testMission.definitionOfDone[4].completed = true; // Low priority

      const isComplete = tracker.checkCompletion(testMission);

      expect(isComplete).toBe(false);
    });

    it('should return true if all criteria are complete', () => {
      testMission.definitionOfDone.forEach(dod => dod.completed = true);

      const isComplete = tracker.checkCompletion(testMission);

      expect(isComplete).toBe(true);
    });

    it('should return true if all critical and high priority are complete', () => {
      testMission.definitionOfDone[0].completed = true; // Critical
      testMission.definitionOfDone[1].completed = true; // Critical
      testMission.definitionOfDone[2].completed = true; // High

      const isComplete = tracker.checkCompletion(testMission);

      expect(isComplete).toBe(true);
    });
  });

  describe('markCriterionComplete', () => {
    it('should mark a criterion as complete with evidence', () => {
      const updatedMission = tracker.markCriterionComplete(
        testMission,
        'dod-1',
        'Test completed successfully'
      );

      const criterion = updatedMission.definitionOfDone.find(d => d.id === 'dod-1');
      
      expect(criterion?.completed).toBe(true);
      expect(criterion?.evidence).toBe('Test completed successfully');
      expect(criterion?.completedAt).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent criterion', () => {
      expect(() => {
        tracker.markCriterionComplete(testMission, 'invalid-id');
      }).toThrow('Criterion invalid-id not found');
    });
  });

  describe('getNextPriorityCriterion', () => {
    it('should return critical criterion first', () => {
      const next = tracker.getNextPriorityCriterion(testMission);

      expect(next?.id).toBe('dod-1');
      expect(next?.priority).toBe(DoDPriority.CRITICAL);
    });

    it('should return high priority when critical are complete', () => {
      testMission.definitionOfDone[0].completed = true;
      testMission.definitionOfDone[1].completed = true;

      const next = tracker.getNextPriorityCriterion(testMission);

      expect(next?.id).toBe('dod-3');
      expect(next?.priority).toBe(DoDPriority.HIGH);
    });

    it('should return null when all criteria are complete', () => {
      testMission.definitionOfDone.forEach(dod => dod.completed = true);

      const next = tracker.getNextPriorityCriterion(testMission);

      expect(next).toBeNull();
    });
  });

  describe('getPendingCriteria', () => {
    it('should return all criteria when none are complete', () => {
      const pending = tracker.getPendingCriteria(testMission);

      expect(pending).toHaveLength(5);
    });

    it('should return only incomplete criteria', () => {
      testMission.definitionOfDone[0].completed = true;
      testMission.definitionOfDone[2].completed = true;

      const pending = tracker.getPendingCriteria(testMission);

      expect(pending).toHaveLength(3);
      expect(pending.map(p => p.id)).toEqual(['dod-2', 'dod-4', 'dod-5']);
    });

    it('should return empty array when all are complete', () => {
      testMission.definitionOfDone.forEach(dod => dod.completed = true);

      const pending = tracker.getPendingCriteria(testMission);

      expect(pending).toHaveLength(0);
    });
  });

  describe('getCompletedCriteria', () => {
    it('should return empty array when none are complete', () => {
      const completed = tracker.getCompletedCriteria(testMission);

      expect(completed).toHaveLength(0);
    });

    it('should return only completed criteria', () => {
      testMission.definitionOfDone[1].completed = true;
      testMission.definitionOfDone[3].completed = true;

      const completed = tracker.getCompletedCriteria(testMission);

      expect(completed).toHaveLength(2);
      expect(completed.map(c => c.id)).toEqual(['dod-2', 'dod-4']);
    });
  });

  describe('generateProgressReport', () => {
    it('should generate a comprehensive progress report', () => {
      testMission.definitionOfDone[0].completed = true;
      testMission.definitionOfDone[0].completedAt = new Date();
      testSession.completedTasks = ['dod-1'];
      testSession.pendingTasks = ['dod-2', 'dod-3', 'dod-4', 'dod-5'];

      const report = tracker.generateProgressReport(testMission, testSession);

      expect(report).toContain('Mission Progress Report');
      expect(report).toContain('Test Mission');
      expect(report).toContain('20% Complete');
      expect(report).toContain('Iterations: 5');
      expect(report).toContain('✓ [critical] Critical task 1');
      expect(report).toContain('○ [critical] Critical task 2');
    });

    it('should include unresolved errors in report', () => {
      testSession.errors = [
        {
          id: 'error-1',
          timestamp: new Date(),
          type: 'TestError',
          message: 'Test error message',
          resolved: false
        },
        {
          id: 'error-2',
          timestamp: new Date(),
          type: 'OtherError',
          message: 'Resolved error',
          resolved: true
        }
      ];

      const report = tracker.generateProgressReport(testMission, testSession);

      expect(report).toContain('Unresolved Errors: 1');
    });
  });

  describe('estimateTimeRemaining', () => {
    it('should return 0 when no criteria are pending', () => {
      testMission.definitionOfDone.forEach(dod => dod.completed = true);

      const estimate = tracker.estimateTimeRemaining(testMission, testSession, 1000);

      expect(estimate).toBe(0);
    });

    it('should use average time when no criteria completed yet', () => {
      const estimate = tracker.estimateTimeRemaining(testMission, testSession, 1000);

      expect(estimate).toBe(5000); // 5 pending * 1000ms average
    });

    it('should calculate based on actual progress when some completed', () => {
      testMission.definitionOfDone[0].completed = true;
      testSession.completedTasks = ['dod-1'];
      testSession.timestamp = new Date(Date.now() - 10000); // 10 seconds ago
      testSession.iterations = 1;

      const estimate = tracker.estimateTimeRemaining(testMission, testSession, 1000);

      // Should estimate based on actual time taken
      expect(estimate).toBeGreaterThan(0);
      expect(estimate).toBeLessThan(50000); // Reasonable upper bound
    });
  });
});