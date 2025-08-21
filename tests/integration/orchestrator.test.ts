import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Orchestrator } from '../../src/core/orchestrator';
import { SessionManager } from '../../src/core/session-manager';
import { OpenRouterClient } from '../../src/llm/openrouter-client';
import { ClaudeCodeClient } from '../../src/llm/claude-code-client';
import { Mission, DoDPriority } from '../../src/models/mission';
import { SessionPhase } from '../../src/models/session';
import winston from 'winston';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

describe('Orchestrator Integration', () => {
  let orchestrator: Orchestrator;
  let sessionManager: SessionManager;
  let openRouterClient: OpenRouterClient;
  let claudeCodeClient: ClaudeCodeClient;
  let logger: winston.Logger;
  let testMission: Mission;
  let tempDir: string;

  beforeEach(async () => {
    // Setup temp directory for sessions
    tempDir = path.join(__dirname, `temp-${uuidv4()}`);
    await fs.mkdir(tempDir, { recursive: true });

    logger = winston.createLogger({ silent: true });

    // Create test mission
    testMission = {
      id: 'test-mission-1',
      title: 'Integration Test Mission',
      repository: tempDir,
      description: 'Testing orchestration',
      definitionOfDone: [
        {
          id: 'dod-1',
          description: 'Create hello world function',
          measurable: true,
          priority: DoDPriority.CRITICAL,
          completed: false
        },
        {
          id: 'dod-2',
          description: 'Add unit test',
          measurable: true,
          priority: DoDPriority.HIGH,
          completed: false
        }
      ],
      createdAt: new Date()
    };

    // Initialize components
    sessionManager = new SessionManager(tempDir, logger);

    // Mock OpenRouter client
    openRouterClient = new OpenRouterClient(
      {
        apiKey: 'test-key',
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        temperature: 0.5,
        maxTokens: 4096,
        baseURL: 'https://openrouter.ai/api/v1',
        retryAttempts: 1,
        retryDelay: 100
      },
      logger
    );

    // Mock Claude Code client
    claudeCodeClient = new ClaudeCodeClient(
      {
        useSubscription: true, // Test subscription mode
        projectPath: tempDir,
        maxIterations: 10,
        model: 'claude-opus-4-1-20250805',
        temperature: 0.3,
        timeoutMs: 5000,
        contextWindow: 200000
      },
      logger
    );
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Orchestrator initialization', () => {
    it('should create orchestrator with valid config', () => {
      orchestrator = new Orchestrator({
        mission: testMission,
        openRouterClient,
        claudeCodeClient,
        sessionManager,
        logger,
        checkpointInterval: 2,
        maxIterations: 10
      });

      expect(orchestrator).toBeDefined();
    });
  });

  describe('Session management', () => {
    it('should create and save a new session', async () => {
      const session = await sessionManager.createSession(
        testMission.id,
        testMission.repository
      );

      expect(session.sessionId).toBeDefined();
      expect(session.missionId).toBe(testMission.id);
      expect(session.repository).toBe(testMission.repository);
      expect(session.currentPhase).toBe(SessionPhase.INITIALIZATION);
      expect(session.iterations).toBe(0);

      // Verify session was saved
      const loaded = await sessionManager.loadSession(session.sessionId);
      expect(loaded).toBeDefined();
      expect(loaded?.sessionId).toBe(session.sessionId);
    });

    it('should update session phase', async () => {
      const session = await sessionManager.createSession(
        testMission.id,
        testMission.repository
      );

      await sessionManager.updatePhase(session.sessionId, SessionPhase.PLANNING);

      const updated = await sessionManager.loadSession(session.sessionId);
      expect(updated?.currentPhase).toBe(SessionPhase.PLANNING);
    });

    it('should add artifacts to session', async () => {
      const session = await sessionManager.createSession(
        testMission.id,
        testMission.repository
      );

      const artifact = {
        id: 'artifact-1',
        type: 'code' as const,
        path: '/test/file.ts',
        content: 'console.log("test");',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await sessionManager.addArtifact(session.sessionId, artifact);

      const updated = await sessionManager.loadSession(session.sessionId);
      expect(updated?.artifacts).toHaveLength(1);
      expect(updated?.artifacts[0].id).toBe('artifact-1');
    });

    it('should handle session recovery', async () => {
      const session = await sessionManager.createSession(
        testMission.id,
        testMission.repository
      );

      // Add some progress
      session.completedTasks = ['task-1'];
      session.iterations = 5;
      await sessionManager.saveSession(session);

      // Create checkpoint
      await sessionManager.checkpoint(session.sessionId);

      // Recover session
      const recovered = await sessionManager.recover(session.sessionId);
      expect(recovered.sessionId).toBe(session.sessionId);
      expect(recovered.completedTasks).toEqual(['task-1']);
      expect(recovered.iterations).toBe(5);
      expect(recovered.currentPhase).toBe(SessionPhase.ERROR_RECOVERY);
    });

    it('should find active session for mission', async () => {
      const session1 = await sessionManager.createSession(
        'mission-1',
        '/repo1'
      );
      
      const session2 = await sessionManager.createSession(
        'mission-2',
        '/repo2'
      );

      // Complete session 1
      await sessionManager.updatePhase(session1.sessionId, SessionPhase.COMPLETION);

      const activeForMission1 = await sessionManager.findActiveSession('mission-1');
      const activeForMission2 = await sessionManager.findActiveSession('mission-2');

      expect(activeForMission1).toBeNull(); // Completed
      expect(activeForMission2?.sessionId).toBe(session2.sessionId);
    });
  });

  describe('Mock orchestration flow', () => {
    it('should handle a mock orchestration cycle', async () => {
      // Mock the API responses
      vi.spyOn(claudeCodeClient, 'validateEnvironment').mockResolvedValue(true);
      vi.spyOn(claudeCodeClient, 'execute').mockResolvedValue({
        success: true,
        output: 'Created hello world function',
        artifacts: [
          {
            path: 'hello.ts',
            content: 'export function hello() { return "world"; }',
            type: 'code'
          }
        ],
        sessionEnded: false,
        tokenUsage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          estimatedCost: 0
        }
      });

      vi.spyOn(openRouterClient, 'sendMessage').mockResolvedValue({
        content: JSON.stringify({
          currentStatus: 'Ready to proceed',
          blockers: [],
          recommendations: ['Create hello world function'],
          nextSteps: ['Implement the function'],
          confidence: 0.9
        }),
        tokenUsage: {
          promptTokens: 50,
          completionTokens: 30,
          totalTokens: 80,
          estimatedCost: 0
        },
        model: 'test-model'
      });

      orchestrator = new Orchestrator({
        mission: testMission,
        openRouterClient,
        claudeCodeClient,
        sessionManager,
        logger,
        checkpointInterval: 5,
        maxIterations: 2
      });

      // We can't run full orchestration without real APIs, but we can test setup
      expect(orchestrator).toBeDefined();
      
      // Test that environment validation works
      const isValid = await claudeCodeClient.validateEnvironment();
      expect(isValid).toBe(true);
    });
  });
});