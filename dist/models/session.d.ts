import { z } from 'zod';
export declare enum SessionPhase {
    INITIALIZATION = "initialization",
    PLANNING = "planning",
    EXECUTION = "execution",
    VALIDATION = "validation",
    COMPLETION = "completion",
    ERROR_RECOVERY = "error_recovery"
}
export declare enum ArtifactType {
    CODE = "code",
    DOCUMENTATION = "documentation",
    TEST = "test",
    CONFIG = "config",
    OTHER = "other"
}
export declare const ArtifactSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodNativeEnum<typeof ArtifactType>;
    path: z.ZodString;
    content: z.ZodString;
    version: z.ZodNumber;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    checksum: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    path: string;
    type: ArtifactType;
    createdAt: Date;
    content: string;
    version: number;
    updatedAt: Date;
    checksum?: string | undefined;
}, {
    id: string;
    path: string;
    type: ArtifactType;
    createdAt: Date;
    content: string;
    version: number;
    updatedAt: Date;
    checksum?: string | undefined;
}>;
export type Artifact = z.infer<typeof ArtifactSchema>;
export declare const LogEntrySchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodDate;
    level: z.ZodEnum<["ERROR", "WARN", "INFO", "DEBUG", "TRACE"]>;
    message: z.ZodString;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    source: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    message: string;
    timestamp: Date;
    level: "ERROR" | "WARN" | "INFO" | "DEBUG" | "TRACE";
    source: string;
    context?: Record<string, any> | undefined;
}, {
    id: string;
    message: string;
    timestamp: Date;
    level: "ERROR" | "WARN" | "INFO" | "DEBUG" | "TRACE";
    source: string;
    context?: Record<string, any> | undefined;
}>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export declare const ErrorSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodDate;
    type: z.ZodString;
    message: z.ZodString;
    stack: z.ZodOptional<z.ZodString>;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    resolved: z.ZodDefault<z.ZodBoolean>;
    resolution: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    message: string;
    type: string;
    timestamp: Date;
    resolved: boolean;
    context?: Record<string, any> | undefined;
    stack?: string | undefined;
    resolution?: string | undefined;
}, {
    id: string;
    message: string;
    type: string;
    timestamp: Date;
    context?: Record<string, any> | undefined;
    stack?: string | undefined;
    resolved?: boolean | undefined;
    resolution?: string | undefined;
}>;
export type SessionError = z.infer<typeof ErrorSchema>;
export declare const SessionStateSchema: z.ZodObject<{
    sessionId: z.ZodString;
    missionId: z.ZodString;
    repository: z.ZodString;
    ccInstanceId: z.ZodString;
    currentPhase: z.ZodNativeEnum<typeof SessionPhase>;
    completedTasks: z.ZodArray<z.ZodString, "many">;
    pendingTasks: z.ZodArray<z.ZodString, "many">;
    artifacts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodNativeEnum<typeof ArtifactType>;
        path: z.ZodString;
        content: z.ZodString;
        version: z.ZodNumber;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        checksum: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        path: string;
        type: ArtifactType;
        createdAt: Date;
        content: string;
        version: number;
        updatedAt: Date;
        checksum?: string | undefined;
    }, {
        id: string;
        path: string;
        type: ArtifactType;
        createdAt: Date;
        content: string;
        version: number;
        updatedAt: Date;
        checksum?: string | undefined;
    }>, "many">;
    logs: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        timestamp: z.ZodDate;
        level: z.ZodEnum<["ERROR", "WARN", "INFO", "DEBUG", "TRACE"]>;
        message: z.ZodString;
        context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        source: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        message: string;
        timestamp: Date;
        level: "ERROR" | "WARN" | "INFO" | "DEBUG" | "TRACE";
        source: string;
        context?: Record<string, any> | undefined;
    }, {
        id: string;
        message: string;
        timestamp: Date;
        level: "ERROR" | "WARN" | "INFO" | "DEBUG" | "TRACE";
        source: string;
        context?: Record<string, any> | undefined;
    }>, "many">;
    errors: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        timestamp: z.ZodDate;
        type: z.ZodString;
        message: z.ZodString;
        stack: z.ZodOptional<z.ZodString>;
        context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        resolved: z.ZodDefault<z.ZodBoolean>;
        resolution: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        message: string;
        type: string;
        timestamp: Date;
        resolved: boolean;
        context?: Record<string, any> | undefined;
        stack?: string | undefined;
        resolution?: string | undefined;
    }, {
        id: string;
        message: string;
        type: string;
        timestamp: Date;
        context?: Record<string, any> | undefined;
        stack?: string | undefined;
        resolved?: boolean | undefined;
        resolution?: string | undefined;
    }>, "many">;
    iterations: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodDate;
    lastCheckpoint: z.ZodOptional<z.ZodDate>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    repository: string;
    timestamp: Date;
    sessionId: string;
    missionId: string;
    ccInstanceId: string;
    currentPhase: SessionPhase;
    completedTasks: string[];
    pendingTasks: string[];
    artifacts: {
        id: string;
        path: string;
        type: ArtifactType;
        createdAt: Date;
        content: string;
        version: number;
        updatedAt: Date;
        checksum?: string | undefined;
    }[];
    logs: {
        id: string;
        message: string;
        timestamp: Date;
        level: "ERROR" | "WARN" | "INFO" | "DEBUG" | "TRACE";
        source: string;
        context?: Record<string, any> | undefined;
    }[];
    errors: {
        id: string;
        message: string;
        type: string;
        timestamp: Date;
        resolved: boolean;
        context?: Record<string, any> | undefined;
        stack?: string | undefined;
        resolution?: string | undefined;
    }[];
    iterations: number;
    lastCheckpoint?: Date | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    repository: string;
    timestamp: Date;
    sessionId: string;
    missionId: string;
    ccInstanceId: string;
    currentPhase: SessionPhase;
    completedTasks: string[];
    pendingTasks: string[];
    artifacts: {
        id: string;
        path: string;
        type: ArtifactType;
        createdAt: Date;
        content: string;
        version: number;
        updatedAt: Date;
        checksum?: string | undefined;
    }[];
    logs: {
        id: string;
        message: string;
        timestamp: Date;
        level: "ERROR" | "WARN" | "INFO" | "DEBUG" | "TRACE";
        source: string;
        context?: Record<string, any> | undefined;
    }[];
    errors: {
        id: string;
        message: string;
        type: string;
        timestamp: Date;
        context?: Record<string, any> | undefined;
        stack?: string | undefined;
        resolved?: boolean | undefined;
        resolution?: string | undefined;
    }[];
    iterations?: number | undefined;
    lastCheckpoint?: Date | undefined;
    metadata?: Record<string, any> | undefined;
}>;
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
//# sourceMappingURL=session.d.ts.map