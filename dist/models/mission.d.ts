import { z } from 'zod';
export declare enum DoDPriority {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low"
}
export declare const DoDCriteriaSchema: z.ZodObject<{
    id: z.ZodString;
    description: z.ZodString;
    measurable: z.ZodBoolean;
    priority: z.ZodNativeEnum<typeof DoDPriority>;
    completed: z.ZodDefault<z.ZodBoolean>;
    completedAt: z.ZodOptional<z.ZodDate>;
    evidence: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    measurable: boolean;
    priority: DoDPriority;
    completed: boolean;
    completedAt?: Date | undefined;
    evidence?: string | undefined;
}, {
    id: string;
    description: string;
    measurable: boolean;
    priority: DoDPriority;
    completed?: boolean | undefined;
    completedAt?: Date | undefined;
    evidence?: string | undefined;
}>;
export type DoDCriteria = z.infer<typeof DoDCriteriaSchema>;
export declare const MissionSchema: z.ZodObject<{
    id: z.ZodString;
    repository: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    definitionOfDone: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        measurable: z.ZodBoolean;
        priority: z.ZodNativeEnum<typeof DoDPriority>;
        completed: z.ZodDefault<z.ZodBoolean>;
        completedAt: z.ZodOptional<z.ZodDate>;
        evidence: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        measurable: boolean;
        priority: DoDPriority;
        completed: boolean;
        completedAt?: Date | undefined;
        evidence?: string | undefined;
    }, {
        id: string;
        description: string;
        measurable: boolean;
        priority: DoDPriority;
        completed?: boolean | undefined;
        completedAt?: Date | undefined;
        evidence?: string | undefined;
    }>, "many">;
    context: z.ZodOptional<z.ZodString>;
    constraints: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    createdAt: z.ZodDate;
    startedAt: z.ZodOptional<z.ZodDate>;
    completedAt: z.ZodOptional<z.ZodDate>;
    currentPhase: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    repository: string;
    title: string;
    definitionOfDone: {
        id: string;
        description: string;
        measurable: boolean;
        priority: DoDPriority;
        completed: boolean;
        completedAt?: Date | undefined;
        evidence?: string | undefined;
    }[];
    createdAt: Date;
    completedAt?: Date | undefined;
    context?: string | undefined;
    constraints?: string[] | undefined;
    startedAt?: Date | undefined;
    currentPhase?: string | undefined;
    metadata?: any;
}, {
    id: string;
    description: string;
    repository: string;
    title: string;
    definitionOfDone: {
        id: string;
        description: string;
        measurable: boolean;
        priority: DoDPriority;
        completed?: boolean | undefined;
        completedAt?: Date | undefined;
        evidence?: string | undefined;
    }[];
    createdAt: Date;
    completedAt?: Date | undefined;
    context?: string | undefined;
    constraints?: string[] | undefined;
    startedAt?: Date | undefined;
    currentPhase?: string | undefined;
    metadata?: any;
}>;
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
//# sourceMappingURL=mission.d.ts.map