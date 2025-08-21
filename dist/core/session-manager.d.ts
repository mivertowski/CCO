import { SessionState, SessionPhase, Artifact, SessionError, SessionManager as ISessionManager } from '../models/session';
import winston from 'winston';
export declare class SessionManager implements ISessionManager {
    private logger;
    private storagePath;
    private sessions;
    constructor(storagePath: string, logger: winston.Logger);
    private ensureStorageDirectory;
    createSession(missionId: string, repository: string): Promise<SessionState>;
    loadSession(sessionId: string): Promise<SessionState | null>;
    saveSession(state: SessionState): Promise<void>;
    updatePhase(sessionId: string, phase: SessionPhase): Promise<void>;
    addArtifact(sessionId: string, artifact: Artifact): Promise<void>;
    addError(sessionId: string, error: SessionError): Promise<void>;
    checkpoint(sessionId: string): Promise<void>;
    recover(sessionId: string): Promise<SessionState>;
    findActiveSession(missionId: string): Promise<SessionState | null>;
    listSessions(): Promise<SessionState[]>;
    private serializeSession;
    private deserializeSession;
}
//# sourceMappingURL=session-manager.d.ts.map