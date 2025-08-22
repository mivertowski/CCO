import { z } from 'zod';

export enum SessionPhase {
  INITIALIZATION = 'initialization',
  PLANNING = 'planning',
  EXECUTION = 'execution',
  VALIDATION = 'validation',
  COMPLETION = 'completion',
  ERROR_RECOVERY = 'error_recovery'
}

export enum ArtifactType {
  CODE = 'code',
  DOCUMENTATION = 'documentation',
  TEST = 'test',
  CONFIG = 'config',
  OTHER = 'other'
}

export const ArtifactSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(ArtifactType),
  path: z.string(),
  content: z.string(),
  version: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  checksum: z.string().optional()
});

export type Artifact = z.infer<typeof ArtifactSchema>;

export const LogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  level: z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']),
  message: z.string(),
  context: z.record(z.any()).optional(),
  source: z.string()
});

export type LogEntry = z.infer<typeof LogEntrySchema>;

export const ErrorSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  type: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  context: z.record(z.any()).optional(),
  resolved: z.boolean().default(false),
  resolution: z.string().optional()
});

export type SessionError = z.infer<typeof ErrorSchema>;

export const SessionStateSchema = z.object({
  sessionId: z.string(),
  missionId: z.string(),
  repository: z.string(),
  ccInstanceId: z.string(),
  currentPhase: z.nativeEnum(SessionPhase),
  phase: z.nativeEnum(SessionPhase).optional(), // Alias for currentPhase
  completedTasks: z.array(z.string()),
  pendingTasks: z.array(z.string()),
  completedDoDCriteria: z.array(z.string()).default([]), // Track completed DoD criteria
  artifacts: z.array(ArtifactSchema),
  logs: z.array(LogEntrySchema),
  errors: z.array(ErrorSchema),
  iterations: z.number().default(0),
  timestamp: z.date(),
  lastCheckpoint: z.date().optional(),
  metadata: z.record(z.any()).optional(),
  phaseHistory: z.array(z.string()).optional() // Track phase transitions
});

export type SessionState = z.infer<typeof SessionStateSchema>;

export interface SessionContext {
  state: SessionState;
  previousStates: SessionState[];
  totalDuration: number;
  averageIterationTime: number;
  successRate: number;
}

export interface SessionManager {
  createSession(missionId: string, repository: string): Promise<SessionState>;
  loadSession(sessionId: string): Promise<SessionState | null>;
  saveSession(state: SessionState): Promise<void>;
  updatePhase(sessionId: string, phase: SessionPhase): Promise<void>;
  addArtifact(sessionId: string, artifact: Artifact): Promise<void>;
  addError(sessionId: string, error: SessionError): Promise<void>;
  checkpoint(sessionId: string): Promise<void>;
  recover(sessionId: string): Promise<SessionState>;
}