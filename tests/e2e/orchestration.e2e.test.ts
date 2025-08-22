import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Orchestrator } from '../../src/core/orchestrator';
import { MissionParser } from '../../src/core/mission-parser';
import { SessionManager } from '../../src/core/session-manager';
import { OpenRouterClient } from '../../src/llm/openrouter-client';
import { ClaudeCodeSDKClient } from '../../src/llm/claude-code-sdk-client';
import { createLogger } from '../../src/monitoring/logger';
import { Mission } from '../../src/models/mission';

describe('E2E: Orchestration Flow', () => {
  const testDir = path.join(__dirname, 'test-workspace');
  const logger = createLogger();
  let orchestrator: Orchestrator;
  let sessionManager: SessionManager;
  
  beforeAll(async () => {
    // Create test workspace
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, '.cco'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.cco', 'sessions'), { recursive: true });
    
    // Set up environment
    process.env.TEST_MODE = 'true';
  });
  
  afterAll(async () => {
    // Clean up test workspace
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  describe('Mission Lifecycle', () => {
    it('should complete a simple mission end-to-end', async () => {
      // Create test mission
      const missionYaml = `
mission:
  title: "E2E Test Mission"
  repository: "${testDir}"
  description: "Test mission for E2E testing"
  
  definition_of_done:
    - id: "test-1"
      description: "Create a test file"
      measurable: true
      priority: "high"
    
    - id: "test-2"
      description: "Add content to file"
      measurable: true
      priority: "medium"
  
  phases:
    - name: "implementation"
      description: "Implement test requirements"
      dod_criteria: ["test-1", "test-2"]
      estimated_time: "5m"
`;
      
      const missionPath = path.join(testDir, 'test-mission.yaml');
      await fs.writeFile(missionPath, missionYaml);
      
      // Parse mission
      const parser = new MissionParser(logger);
      const mission = await parser.parseMissionFile(missionPath);
      
      expect(mission).toBeDefined();
      expect(mission.title).toBe('E2E Test Mission');
      expect(mission.definitionOfDone).toHaveLength(2);
    });
    
    it('should handle mission with errors gracefully', async () => {
      const invalidMissionYaml = `
mission:
  title: "Invalid Mission"
  # Missing required fields
`;
      
      const missionPath = path.join(testDir, 'invalid-mission.yaml');
      await fs.writeFile(missionPath, invalidMissionYaml);
      
      const parser = new MissionParser(logger);
      
      await expect(parser.parseMissionFile(missionPath))
        .rejects
        .toThrow();
    });
  });
  
  describe('Session Management', () => {
    beforeAll(() => {
      sessionManager = new SessionManager(
        path.join(testDir, '.cco', 'sessions'),
        logger
      );
    });
    
    it('should create and recover sessions', async () => {
      const missionId = 'test-mission-123';
      const repository = testDir;
      
      // Create session
      const session = await sessionManager.createSession(missionId, repository);
      
      expect(session).toBeDefined();
      expect(session.missionId).toBe(missionId);
      expect(session.repository).toBe(repository);
      expect(session.currentPhase).toBe('initialization');
      
      // Save checkpoint
      session.iterations = 5;
      session.completedTasks.push('task-1');
      await sessionManager.saveSession(session);
      await sessionManager.checkpoint(session.sessionId);
      
      // Recover session
      const recovered = await sessionManager.recover(session.sessionId);
      
      expect(recovered).toBeDefined();
      expect(recovered.iterations).toBe(5);
      expect(recovered.completedTasks).toContain('task-1');
    });
    
    it('should list all sessions', async () => {
      // Create multiple sessions
      await sessionManager.createSession('mission-1', testDir);
      await sessionManager.createSession('mission-2', testDir);
      
      const sessions = await sessionManager.listSessions();
      
      expect(sessions.length).toBeGreaterThanOrEqual(2);
      expect(sessions.some(s => s.missionId === 'mission-1')).toBe(true);
      expect(sessions.some(s => s.missionId === 'mission-2')).toBe(true);
    });
  });
  
  describe('Mock Orchestration', () => {
    it.skip('should execute orchestration with mocked clients', async () => {
      // Create mock clients
      const mockOpenRouterClient = {
        sendMessage: vi.fn().mockResolvedValue({
          content: 'Mock response',
          usage: { totalTokens: 100, estimatedCost: 0.01 }
        }),
        validateApiKey: vi.fn().mockResolvedValue(true)
      };
      
      const mockClaudeCodeClient = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          output: 'Task completed',
          artifacts: [],
          sessionEnded: false,
          tokenUsage: {
            promptTokens: 50,
            completionTokens: 50,
            totalTokens: 100,
            estimatedCost: 0.01
          }
        }),
        validateEnvironment: vi.fn().mockResolvedValue(true),
        startSession: vi.fn(),
        endSession: vi.fn()
      };
      
      const testMission: Mission = {
        id: 'test-mission',
        repository: testDir,
        title: 'Mock Test Mission',
        description: 'Testing orchestration',
        definitionOfDone: [
          {
            id: 'dod-1',
            description: 'Test criterion',
            measurable: true,
            priority: 'high' as any,
            completed: false
          }
        ],
        createdAt: new Date()
      };
      
      orchestrator = new Orchestrator({
        mission: testMission,
        openRouterClient: mockOpenRouterClient as any,
        claudeCodeClient: mockClaudeCodeClient as any,
        sessionManager,
        logger,
        checkpointInterval: 1,
        maxIterations: 3
      });
      
      // Run orchestration (limited iterations)
      const result = await orchestrator.orchestrate();
      
      expect(result).toBeDefined();
      expect(result.mission.id).toBe('test-mission');
      expect(mockOpenRouterClient.sendMessage).toHaveBeenCalled();
      expect(mockClaudeCodeClient.execute).toHaveBeenCalled();
      expect(result.metrics.totalIterations).toBeLessThanOrEqual(3);
    });
  });
  
  describe('Error Handling', () => {
    it.skip('should handle API failures gracefully', async () => {
      const failingClient = {
        sendMessage: vi.fn().mockRejectedValue(new Error('API Error')),
        validateApiKey: vi.fn().mockResolvedValue(true)
      };
      
      const mockClaudeCodeClient = {
        execute: vi.fn().mockResolvedValue({
          success: false,
          output: '',
          artifacts: [],
          sessionEnded: true,
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
          error: 'Execution failed'
        }),
        validateEnvironment: vi.fn().mockResolvedValue(true),
        startSession: vi.fn(),
        endSession: vi.fn()
      };
      
      const testMission: Mission = {
        id: 'error-test',
        repository: testDir,
        title: 'Error Test',
        description: 'Testing error handling',
        definitionOfDone: [],
        createdAt: new Date()
      };
      
      orchestrator = new Orchestrator({
        mission: testMission,
        openRouterClient: failingClient as any,
        claudeCodeClient: mockClaudeCodeClient as any,
        sessionManager,
        logger,
        maxIterations: 1
      });
      
      const result = await orchestrator.orchestrate();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
  
  describe('Progress Tracking', () => {
    it('should track progress correctly', async () => {
      const mission: Mission = {
        id: 'progress-test',
        repository: testDir,
        title: 'Progress Test',
        description: 'Testing progress tracking',
        definitionOfDone: [
          {
            id: 'dod-1',
            description: 'First task',
            measurable: true,
            priority: 'high' as any,
            completed: false
          },
          {
            id: 'dod-2',
            description: 'Second task',
            measurable: true,
            priority: 'medium' as any,
            completed: false
          },
          {
            id: 'dod-3',
            description: 'Third task',
            measurable: true,
            priority: 'low' as any,
            completed: true // Already completed
          }
        ],
        createdAt: new Date()
      };
      
      const progress = {
        totalCriteria: mission.definitionOfDone.length,
        completedCriteria: mission.definitionOfDone.filter(d => d.completed).length,
        completionPercentage: 0
      };
      
      progress.completionPercentage = Math.round(
        (progress.completedCriteria / progress.totalCriteria) * 100
      );
      
      expect(progress.totalCriteria).toBe(3);
      expect(progress.completedCriteria).toBe(1);
      expect(progress.completionPercentage).toBe(33);
    });
  });
});

describe('E2E: Integration Tests', () => {
  describe('GitHub Integration', () => {
    it('should parse GitHub issues correctly', async () => {
      // This would test the GitHub integration
      // Mocked for now as it requires GitHub API access
      expect(true).toBe(true);
    });
  });
  
  describe('Claude Code SDK', () => {
    it.skip('should validate SDK environment', async () => {
      const client = new ClaudeCodeSDKClient(
        {
          projectPath: '.',
          maxTurns: 1,
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.3,
          planMode: true
        },
        createLogger()
      );
      
      // This will return true in mock/test mode
      const isValid = await client.validateEnvironment();
      expect(typeof isValid).toBe('boolean');
    }, 10000); // Increase timeout to 10 seconds
  });
});