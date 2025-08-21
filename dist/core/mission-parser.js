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
exports.MissionParser = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const mission_1 = require("../models/mission");
const uuid_1 = require("uuid");
class MissionParser {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    async parseMissionFile(filePath) {
        try {
            this.logger.info('Parsing mission file', { filePath });
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const extension = path.extname(filePath).toLowerCase();
            let missionData;
            if (extension === '.yaml' || extension === '.yml') {
                missionData = yaml.load(fileContent);
            }
            else if (extension === '.json') {
                missionData = JSON.parse(fileContent);
            }
            else {
                throw new Error(`Unsupported file extension: ${extension}`);
            }
            return this.createMissionFromData(missionData);
        }
        catch (error) {
            this.logger.error('Failed to parse mission file', { filePath, error });
            throw error;
        }
    }
    parseMissionString(content, format) {
        try {
            let missionData;
            if (format === 'yaml') {
                missionData = yaml.load(content);
            }
            else {
                missionData = JSON.parse(content);
            }
            return this.createMissionFromData(missionData);
        }
        catch (error) {
            this.logger.error('Failed to parse mission string', { format, error });
            throw error;
        }
    }
    createMissionFromData(data) {
        const missionId = (0, uuid_1.v4)();
        const now = new Date();
        const dodCriteria = data.mission.definition_of_done.map((item, index) => ({
            id: item.id || `${missionId}-dod-${index}`,
            description: item.description || item.criteria || '',
            measurable: item.measurable !== false,
            priority: this.parsePriority(item.priority),
            completed: false
        }));
        const mission = {
            id: missionId,
            repository: this.normalizeRepositoryPath(data.mission.repository),
            title: data.mission.title,
            description: data.mission.description,
            definitionOfDone: dodCriteria,
            context: data.mission.context,
            constraints: data.mission.constraints,
            createdAt: now
        };
        const validationResult = mission_1.MissionSchema.safeParse(mission);
        if (!validationResult.success) {
            this.logger.error('Mission validation failed', {
                errors: validationResult.error.errors
            });
            throw new Error(`Invalid mission data: ${validationResult.error.message}`);
        }
        this.logger.info('Successfully created mission', {
            missionId: mission.id,
            title: mission.title,
            dodCount: dodCriteria.length
        });
        return validationResult.data;
    }
    parsePriority(priority) {
        const normalizedPriority = priority.toLowerCase();
        switch (normalizedPriority) {
            case 'critical':
                return mission_1.DoDPriority.CRITICAL;
            case 'high':
                return mission_1.DoDPriority.HIGH;
            case 'medium':
                return mission_1.DoDPriority.MEDIUM;
            case 'low':
                return mission_1.DoDPriority.LOW;
            default:
                this.logger.warn(`Unknown priority "${priority}", defaulting to MEDIUM`);
                return mission_1.DoDPriority.MEDIUM;
        }
    }
    normalizeRepositoryPath(repoPath) {
        if (repoPath.startsWith('./') || repoPath.startsWith('../')) {
            return path.resolve(process.cwd(), repoPath);
        }
        if (!path.isAbsolute(repoPath)) {
            return path.join(process.cwd(), repoPath);
        }
        return repoPath;
    }
    validateMission(mission) {
        const errors = [];
        if (!mission.title || mission.title.trim().length === 0) {
            errors.push('Mission title is required');
        }
        if (!mission.repository || mission.repository.trim().length === 0) {
            errors.push('Repository path is required');
        }
        if (!mission.definitionOfDone || mission.definitionOfDone.length === 0) {
            errors.push('At least one Definition of Done criterion is required');
        }
        const criticalCount = mission.definitionOfDone.filter(dod => dod.priority === mission_1.DoDPriority.CRITICAL).length;
        if (criticalCount === 0) {
            this.logger.warn('No critical DoD criteria found', { missionId: mission.id });
        }
        for (const dod of mission.definitionOfDone) {
            if (!dod.description || dod.description.trim().length === 0) {
                errors.push(`DoD criterion ${dod.id} has no description`);
            }
            if (!dod.measurable) {
                this.logger.warn('Non-measurable DoD criterion found', {
                    dodId: dod.id,
                    description: dod.description
                });
            }
        }
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }
    exportMission(mission, format) {
        const exportData = {
            mission: {
                title: mission.title,
                repository: mission.repository,
                description: mission.description,
                definition_of_done: mission.definitionOfDone.map(dod => ({
                    criteria: dod.description,
                    measurable: dod.measurable,
                    priority: dod.priority
                })),
                constraints: mission.constraints,
                context: mission.context
            }
        };
        if (format === 'yaml') {
            return yaml.dump(exportData, { indent: 2 });
        }
        else {
            return JSON.stringify(exportData, null, 2);
        }
    }
}
exports.MissionParser = MissionParser;
//# sourceMappingURL=mission-parser.js.map