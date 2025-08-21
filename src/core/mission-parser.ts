import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Mission, MissionSchema, DoDCriteria, DoDPriority } from '@models/mission';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

export interface MissionFile {
  mission: {
    title: string;
    repository: string;
    description: string;
    definition_of_done: Array<{
      criteria: string;
      measurable?: boolean;
      priority: string;
    }>;
    constraints?: string[];
    context?: string;
  };
}

export class MissionParser {
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  async parseMissionFile(filePath: string): Promise<Mission> {
    try {
      this.logger.info('Parsing mission file', { filePath });
      
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const extension = path.extname(filePath).toLowerCase();
      
      let missionData: MissionFile;
      
      if (extension === '.yaml' || extension === '.yml') {
        missionData = yaml.load(fileContent) as MissionFile;
      } else if (extension === '.json') {
        missionData = JSON.parse(fileContent);
      } else {
        throw new Error(`Unsupported file extension: ${extension}`);
      }
      
      return this.createMissionFromData(missionData);
    } catch (error) {
      this.logger.error('Failed to parse mission file', { filePath, error });
      throw error;
    }
  }

  parseMissionString(content: string, format: 'yaml' | 'json'): Mission {
    try {
      let missionData: MissionFile;
      
      if (format === 'yaml') {
        missionData = yaml.load(content) as MissionFile;
      } else {
        missionData = JSON.parse(content);
      }
      
      return this.createMissionFromData(missionData);
    } catch (error) {
      this.logger.error('Failed to parse mission string', { format, error });
      throw error;
    }
  }

  private createMissionFromData(data: MissionFile): Mission {
    const missionId = uuidv4();
    const now = new Date();
    
    const dodCriteria: DoDCriteria[] = data.mission.definition_of_done.map((item, index) => ({
      id: `${missionId}-dod-${index}`,
      description: item.criteria,
      measurable: item.measurable !== false,
      priority: this.parsePriority(item.priority),
      completed: false
    }));
    
    const mission: Mission = {
      id: missionId,
      repository: this.normalizeRepositoryPath(data.mission.repository),
      title: data.mission.title,
      description: data.mission.description,
      definitionOfDone: dodCriteria,
      context: data.mission.context,
      constraints: data.mission.constraints,
      createdAt: now
    };
    
    const validationResult = MissionSchema.safeParse(mission);
    
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

  private parsePriority(priority: string): DoDPriority {
    const normalizedPriority = priority.toLowerCase();
    
    switch (normalizedPriority) {
      case 'critical':
        return DoDPriority.CRITICAL;
      case 'high':
        return DoDPriority.HIGH;
      case 'medium':
        return DoDPriority.MEDIUM;
      case 'low':
        return DoDPriority.LOW;
      default:
        this.logger.warn(`Unknown priority "${priority}", defaulting to MEDIUM`);
        return DoDPriority.MEDIUM;
    }
  }

  private normalizeRepositoryPath(repoPath: string): string {
    if (repoPath.startsWith('./') || repoPath.startsWith('../')) {
      return path.resolve(process.cwd(), repoPath);
    }
    
    if (!path.isAbsolute(repoPath)) {
      return path.join(process.cwd(), repoPath);
    }
    
    return repoPath;
  }

  validateMission(mission: Mission): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    
    if (!mission.title || mission.title.trim().length === 0) {
      errors.push('Mission title is required');
    }
    
    if (!mission.repository || mission.repository.trim().length === 0) {
      errors.push('Repository path is required');
    }
    
    if (!mission.definitionOfDone || mission.definitionOfDone.length === 0) {
      errors.push('At least one Definition of Done criterion is required');
    }
    
    const criticalCount = mission.definitionOfDone.filter(
      dod => dod.priority === DoDPriority.CRITICAL
    ).length;
    
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

  exportMission(mission: Mission, format: 'yaml' | 'json'): string {
    const exportData: MissionFile = {
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
    } else {
      return JSON.stringify(exportData, null, 2);
    }
  }
}