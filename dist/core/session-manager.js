"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
const session_1 = require("../models/session");
const uuid_1 = require("uuid");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class SessionManager {
    logger;
    storagePath;
    sessions;
    constructor(storagePath, logger) {
        this.logger = logger;
        this.storagePath = storagePath;
        this.sessions = new Map();
        this.ensureStorageDirectory();
    }
    async ensureStorageDirectory() {
        try {
            await fs.mkdir(this.storagePath, { recursive: true });
        }
        catch (error) {
            this.logger.error('Failed to create storage directory', { error });
        }
    }
    async createSession(missionId, repository) {
        const sessionId = (0, uuid_1.v4)();
        const ccInstanceId = `cc-${sessionId.substring(0, 8)}`;
        const session = {
            sessionId,
            missionId,
            repository,
            ccInstanceId,
            currentPhase: session_1.SessionPhase.INITIALIZATION,
            phase: session_1.SessionPhase.INITIALIZATION,
            completedTasks: [],
            pendingTasks: [],
            completedDoDCriteria: [],
            artifacts: [],
            logs: [],
            errors: [],
            iterations: 0,
            timestamp: new Date(),
            phaseHistory: []
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
    async loadSession(sessionId) {
        // Check memory cache first
        if (this.sessions.has(sessionId)) {
            return this.sessions.get(sessionId);
        }
        // Load from disk
        try {
            const sessionPath = path.join(this.storagePath, `${sessionId}.json`);
            const data = await fs.readFile(sessionPath, 'utf-8');
            const session = this.deserializeSession(JSON.parse(data));
            this.sessions.set(sessionId, session);
            return session;
        }
        catch (error) {
            this.logger.warn('Failed to load session', { sessionId, error });
            return null;
        }
    }
    async saveSession(state) {
        try {
            const sessionPath = path.join(this.storagePath, `${state.sessionId}.json`);
            const data = JSON.stringify(this.serializeSession(state), null, 2);
            await fs.writeFile(sessionPath, data, 'utf-8');
            this.sessions.set(state.sessionId, state);
            this.logger.debug('Saved session', { sessionId: state.sessionId });
        }
        catch (error) {
            this.logger.error('Failed to save session', {
                sessionId: state.sessionId,
                error
            });
            throw error;
        }
    }
    async updatePhase(sessionId, phase) {
        const session = await this.loadSession(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        session.currentPhase = phase;
        await this.saveSession(session);
        this.logger.debug('Updated session phase', { sessionId, phase });
    }
    async addArtifact(sessionId, artifact) {
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
    async addError(sessionId, error) {
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
    async checkpoint(sessionId) {
        const session = await this.loadSession(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        session.lastCheckpoint = new Date();
        // Create checkpoint backup
        const checkpointPath = path.join(this.storagePath, 'checkpoints', `${sessionId}-${Date.now()}.json`);
        await fs.mkdir(path.dirname(checkpointPath), { recursive: true });
        await fs.writeFile(checkpointPath, JSON.stringify(this.serializeSession(session), null, 2), 'utf-8');
        await this.saveSession(session);
        this.logger.info('Created session checkpoint', {
            sessionId,
            checkpointPath
        });
    }
    async recover(sessionId) {
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
                session.currentPhase = session_1.SessionPhase.ERROR_RECOVERY;
                await this.saveSession(session);
                return session;
            }
        }
        catch (error) {
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
    async findActiveSession(missionId) {
        // Check memory cache
        for (const session of this.sessions.values()) {
            if (session.missionId === missionId &&
                session.currentPhase !== session_1.SessionPhase.COMPLETION) {
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
                    session.currentPhase !== session_1.SessionPhase.COMPLETION) {
                    this.sessions.set(session.sessionId, session);
                    return session;
                }
            }
        }
        catch (error) {
            this.logger.error('Error finding active session', { missionId, error });
        }
        return null;
    }
    async listSessions() {
        const sessions = [];
        try {
            const files = await fs.readdir(this.storagePath);
            const sessionFiles = files.filter(f => f.endsWith('.json'));
            for (const file of sessionFiles) {
                const sessionPath = path.join(this.storagePath, file);
                const data = await fs.readFile(sessionPath, 'utf-8');
                const session = this.deserializeSession(JSON.parse(data));
                sessions.push(session);
            }
        }
        catch (error) {
            this.logger.error('Error listing sessions', { error });
        }
        return sessions;
    }
    serializeSession(session) {
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
    deserializeSession(data) {
        return {
            ...data,
            timestamp: new Date(data.timestamp),
            lastCheckpoint: data.lastCheckpoint ? new Date(data.lastCheckpoint) : undefined,
            artifacts: data.artifacts.map((a) => ({
                ...a,
                createdAt: new Date(a.createdAt),
                updatedAt: new Date(a.updatedAt)
            })),
            logs: data.logs.map((l) => ({
                ...l,
                timestamp: new Date(l.timestamp)
            })),
            errors: data.errors.map((e) => ({
                ...e,
                timestamp: new Date(e.timestamp)
            }))
        };
    }
}
exports.SessionManager = SessionManager;
//# sourceMappingURL=session-manager.js.map