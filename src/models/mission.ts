import { z } from 'zod';

export enum DoDPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export const DoDCriteriaSchema = z.object({
  id: z.string(),
  description: z.string(),
  measurable: z.boolean(),
  priority: z.nativeEnum(DoDPriority),
  completed: z.boolean().default(false),
  completedAt: z.date().optional(),
  evidence: z.string().optional()
});

export type DoDCriteria = z.infer<typeof DoDCriteriaSchema>;

export const MissionSchema = z.object({
  id: z.string(),
  repository: z.string(),
  title: z.string(),
  description: z.string(),
  definitionOfDone: z.array(DoDCriteriaSchema),
  context: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional()
});

export type Mission = z.infer<typeof MissionSchema>;

export interface MissionProgress {
  missionId: string;
  totalCriteria: number;
  completedCriteria: number;
  criticalCriteria: number;
  criticalCompleted: number;
  completionPercentage: number;
  estimatedTimeRemaining?: number;
  currentPhase: string;
}

export interface MissionValidator {
  validate(mission: Mission): ValidationResult;
  validateDoD(criteria: DoDCriteria[]): ValidationResult;
  checkCompletion(mission: Mission): boolean;
  calculateProgress(mission: Mission): MissionProgress;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}