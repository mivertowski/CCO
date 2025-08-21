"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionStateSchema = exports.ErrorSchema = exports.LogEntrySchema = exports.ArtifactSchema = exports.ArtifactType = exports.SessionPhase = void 0;
const zod_1 = require("zod");
var SessionPhase;
(function (SessionPhase) {
    SessionPhase["INITIALIZATION"] = "initialization";
    SessionPhase["PLANNING"] = "planning";
    SessionPhase["EXECUTION"] = "execution";
    SessionPhase["VALIDATION"] = "validation";
    SessionPhase["COMPLETION"] = "completion";
    SessionPhase["ERROR_RECOVERY"] = "error_recovery";
})(SessionPhase || (exports.SessionPhase = SessionPhase = {}));
var ArtifactType;
(function (ArtifactType) {
    ArtifactType["CODE"] = "code";
    ArtifactType["DOCUMENTATION"] = "documentation";
    ArtifactType["TEST"] = "test";
    ArtifactType["CONFIG"] = "config";
    ArtifactType["OTHER"] = "other";
})(ArtifactType || (exports.ArtifactType = ArtifactType = {}));
exports.ArtifactSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.nativeEnum(ArtifactType),
    path: zod_1.z.string(),
    content: zod_1.z.string(),
    version: zod_1.z.number(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    checksum: zod_1.z.string().optional()
});
exports.LogEntrySchema = zod_1.z.object({
    id: zod_1.z.string(),
    timestamp: zod_1.z.date(),
    level: zod_1.z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']),
    message: zod_1.z.string(),
    context: zod_1.z.record(zod_1.z.any()).optional(),
    source: zod_1.z.string()
});
exports.ErrorSchema = zod_1.z.object({
    id: zod_1.z.string(),
    timestamp: zod_1.z.date(),
    type: zod_1.z.string(),
    message: zod_1.z.string(),
    stack: zod_1.z.string().optional(),
    context: zod_1.z.record(zod_1.z.any()).optional(),
    resolved: zod_1.z.boolean().default(false),
    resolution: zod_1.z.string().optional()
});
exports.SessionStateSchema = zod_1.z.object({
    sessionId: zod_1.z.string(),
    missionId: zod_1.z.string(),
    repository: zod_1.z.string(),
    ccInstanceId: zod_1.z.string(),
    currentPhase: zod_1.z.nativeEnum(SessionPhase),
    completedTasks: zod_1.z.array(zod_1.z.string()),
    pendingTasks: zod_1.z.array(zod_1.z.string()),
    artifacts: zod_1.z.array(exports.ArtifactSchema),
    logs: zod_1.z.array(exports.LogEntrySchema),
    errors: zod_1.z.array(exports.ErrorSchema),
    iterations: zod_1.z.number().default(0),
    timestamp: zod_1.z.date(),
    lastCheckpoint: zod_1.z.date().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
//# sourceMappingURL=session.js.map