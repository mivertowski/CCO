import { Mission } from '../models/mission';
import winston from 'winston';
export interface MissionFile {
    mission: {
        title: string;
        repository: string;
        description: string;
        definition_of_done: Array<{
            id?: string;
            criteria?: string;
            description?: string;
            measurable?: boolean;
            priority: string;
            type?: string;
            verification_method?: string;
            acceptance_criteria?: string[];
        }>;
        constraints?: string[];
        context?: string;
    };
}
export declare class MissionParser {
    private logger;
    constructor(logger: winston.Logger);
    parseMissionFile(filePath: string): Promise<Mission>;
    parseMissionString(content: string, format: 'yaml' | 'json'): Mission;
    private createMissionFromData;
    private parsePriority;
    private normalizeRepositoryPath;
    validateMission(mission: Mission): {
        valid: boolean;
        errors?: string[];
    };
    exportMission(mission: Mission, format: 'yaml' | 'json'): string;
}
//# sourceMappingURL=mission-parser.d.ts.map