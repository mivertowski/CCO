import { SessionState, SessionPhase, Artifact, SessionError, SessionManager as ISessionManager } from '@models/session';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import * as fs from 'fs/promises';
import * as path from 'path';

export class SessionManager implements ISessionManager {
  private logger: winston.Logger;
  private storagePath: string;
  private sessions: Map<string, SessionState>;

  constructor(storagePath: string, logger: winston.Logger) {
    this.logger = logger;
    this.storagePath = storagePath;
    this.sessions = new Map();
    this.ensureStorageDirectory();
  }

  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create storage directory', { error });
    }
  }

  async createSession(missionId: string, repository: string): Promise<SessionState> {
    const sessionId = uuidv4();
    const ccInstanceId = `cc-${sessionId.substring(0, 8)}`;
    
    const session: SessionState = {
      sessionId,
      missionId,
      repository,
      ccInstanceId,
      currentPhase: SessionPhase.INITIALIZATION,
      completedTasks: [],
      pendingTasks: [],
      artifacts: [],
      logs: [],
      errors: [],
      iterations: 0,
      timestamp: new Date()
    };

    this.sessions.set(sessionId, session);
    await this.saveSession(session);

    this.logger.info('Created new session', {
      sessionId,
      missionId,
      repository
    });

    return session;
  }

  async loadSession(sessionId: string): Promise<SessionState | null> {
    // Check memory cache first
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!;
    }

    // Load from disk
    try {
      const sessionPath = path.join(this.storagePath, `${sessionId}.json`);
      const data = await fs.readFile(sessionPath, 'utf-8');
      const session = this.deserializeSession(JSON.parse(data));
      
      this.sessions.set(sessionId, session);
      return session;
    } catch (error) {
      this.logger.warn('Failed to load session', { sessionId, error });
      return null;
    }
  }

  async saveSession(state: SessionState): Promise<void> {
    try {
      const sessionPath = path.join(this.storagePath, `${state.sessionId}.json`);
      const data = JSON.stringify(this.serializeSession(state), null, 2);
      
      await fs.writeFile(sessionPath, data, 'utf-8');
      this.sessions.set(state.sessionId, state);

      this.logger.debug('Saved session', { sessionId: state.sessionId });
    } catch (error) {
      this.logger.error('Failed to save session', { 
        sessionId: state.sessionId,
        error 
      });
      throw error;
    }
  }

  async updatePhase(sessionId: string, phase: SessionPhase): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.currentPhase = phase;
    await this.saveSession(session);

    this.logger.debug('Updated session phase', { sessionId, phase });
  }

  async addArtifact(sessionId: string, artifact: Artifact): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.artifacts.push(artifact);
    await this.saveSession(session);

    this.logger.debug('Added artifact to session', {
      sessionId,
      artifactId: artifact.id,
      type: artifact.type,
      path: artifact.path
    });
  }

  async addError(sessionId: string, error: SessionError): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.errors.push(error);
    await this.saveSession(session);

    this.logger.warn('Added error to session', {
      sessionId,
      errorId: error.id,
      type: error.type,
      message: error.message
    });
  }

  async checkpoint(sessionId: string): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.lastCheckpoint = new Date();
    
    // Create checkpoint backup
    const checkpointPath = path.join(
      this.storagePath,
      'checkpoints',
      `${sessionId}-${Date.now()}.json`
    );
    
    await fs.mkdir(path.dirname(checkpointPath), { recursive: true });
    await fs.writeFile(
      checkpointPath,
      JSON.stringify(this.serializeSession(session), null, 2),
      'utf-8'
    );

    await this.saveSession(session);

    this.logger.info('Created session checkpoint', {
      sessionId,
      checkpointPath
    });
  }

  async recover(sessionId: string): Promise<SessionState> {
    // Try to load latest checkpoint
    const checkpointsDir = path.join(this.storagePath, 'checkpoints');
    
    try {
      const files = await fs.readdir(checkpointsDir);
      const sessionCheckpoints = files
        .filter(f => f.startsWith(`${sessionId}-`))
        .sort()
        .reverse();

      if (sessionCheckpoints.length > 0) {
        const latestCheckpoint = sessionCheckpoints[0];
        const checkpointPath = path.join(checkpointsDir, latestCheckpoint);
        const data = await fs.readFile(checkpointPath, 'utf-8');
        const session = this.deserializeSession(JSON.parse(data));

        this.logger.info('Recovered session from checkpoint', {
          sessionId,
          checkpoint: latestCheckpoint
        });

        // Update phase to indicate recovery
        session.currentPhase = SessionPhase.ERROR_RECOVERY;
        await this.saveSession(session);

        return session;
      }
    } catch (error) {
      this.logger.error('Failed to recover from checkpoint', {
        sessionId,
        error
      });
    }

    // Fall back to regular load
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Cannot recover session ${sessionId}`);
    }

    return session;
  }

  async findActiveSession(missionId: string): Promise<SessionState | null> {
    // Check memory cache
    for (const session of this.sessions.values()) {
      if (session.missionId === missionId && 
          session.currentPhase !== SessionPhase.COMPLETION) {
        return session;
      }
    }

    // Check disk storage
    try {
      const files = await fs.readdir(this.storagePath);
      const sessionFiles = files.filter(f => f.endsWith('.json'));

      for (const file of sessionFiles) {
        const sessionPath = path.join(this.storagePath, file);
        const data = await fs.readFile(sessionPath, 'utf-8');
        const session = this.deserializeSession(JSON.parse(data));

        if (session.missionId === missionId && 
            session.currentPhase !== SessionPhase.COMPLETION) {
          this.sessions.set(session.sessionId, session);
          return session;
        }
      }
    } catch (error) {
      this.logger.error('Error finding active session', { missionId, error });
    }

    return null;
  }

  async listSessions(): Promise<SessionState[]> {
    const sessions: SessionState[] = [];

    try {
      const files = await fs.readdir(this.storagePath);
      const sessionFiles = files.filter(f => f.endsWith('.json'));

      for (const file of sessionFiles) {
        const sessionPath = path.join(this.storagePath, file);
        const data = await fs.readFile(sessionPath, 'utf-8');
        const session = this.deserializeSession(JSON.parse(data));
        sessions.push(session);
      }
    } catch (error) {
      this.logger.error('Error listing sessions', { error });
    }

    return sessions;
  }

  private serializeSession(session: SessionState): any {
    return {
      ...session,
      timestamp: session.timestamp.toISOString(),
      lastCheckpoint: session.lastCheckpoint?.toISOString(),
      artifacts: session.artifacts.map(a => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString()
      })),
      logs: session.logs.map(l => ({
        ...l,
        timestamp: l.timestamp.toISOString()
      })),
      errors: session.errors.map(e => ({
        ...e,
        timestamp: e.timestamp.toISOString()
      }))
    };
  }

  private deserializeSession(data: any): SessionState {
    return {
      ...data,
      timestamp: new Date(data.timestamp),
      lastCheckpoint: data.lastCheckpoint ? new Date(data.lastCheckpoint) : undefined,
      artifacts: data.artifacts.map((a: any) => ({
        ...a,
        createdAt: new Date(a.createdAt),
        updatedAt: new Date(a.updatedAt)
      })),
      logs: data.logs.map((l: any) => ({
        ...l,
        timestamp: new Date(l.timestamp)
      })),
      errors: data.errors.map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp)
      }))
    };
  }
}