import { OpenRouterClient } from './openrouter-client';
import { Mission, DoDCriteria, MissionProgress } from '@models/mission';
import { SessionState } from '@models/session';
import { ClaudeCodeResult } from './claude-code-client';
import winston from 'winston';

export interface AnalysisResult {
  currentStatus: string;
  blockers: string[];
  recommendations: string[];
  nextSteps: string[];
  confidence: number;
}

export interface ValidationResult {
  completed: boolean;
  evidence?: string;
  reason?: string;
  confidence: number;
}

export interface ErrorRecovery {
  canRecover: boolean;
  strategy?: string;
  recoveryAction?: string;
  reason?: string;
}

export class ManagerLLM {
  private client: OpenRouterClient;
  private logger: winston.Logger;

  constructor(client: OpenRouterClient, logger: winston.Logger) {
    this.client = client;
    this.logger = logger;
  }

  async analyzeCurrentState(
    mission: Mission,
    session: SessionState,
    progress: MissionProgress
  ): Promise<AnalysisResult> {
    const systemPrompt = this.buildAnalysisSystemPrompt();
    const userMessage = this.buildAnalysisUserMessage(mission, session, progress);

    const response = await this.client.sendMessage(systemPrompt, userMessage);
    
    return this.parseAnalysisResponse(response.content);
  }

  async planNextAction(
    analysis: AnalysisResult,
    criterion: DoDCriteria,
    session: SessionState
  ): Promise<string> {
    const systemPrompt = this.buildPlanningSystemPrompt();
    const userMessage = this.buildPlanningUserMessage(analysis, criterion, session);

    const response = await this.client.sendMessage(systemPrompt, userMessage);
    
    this.logger.info('Generated action plan', {
      criterionId: criterion.id,
      planLength: response.content.length
    });

    return response.content;
  }

  async validateCriterionCompletion(
    criterion: DoDCriteria,
    executionResult: ClaudeCodeResult,
    session: SessionState
  ): Promise<ValidationResult> {
    const systemPrompt = this.buildValidationSystemPrompt();
    const userMessage = this.buildValidationUserMessage(criterion, executionResult, session);

    const response = await this.client.sendMessage(systemPrompt, userMessage);
    
    return this.parseValidationResponse(response.content);
  }

  async generateErrorRecovery(
    error: Error,
    session: SessionState
  ): Promise<ErrorRecovery> {
    const systemPrompt = this.buildErrorRecoverySystemPrompt();
    const userMessage = this.buildErrorRecoveryUserMessage(error, session);

    const response = await this.client.sendMessage(systemPrompt, userMessage);
    
    return this.parseErrorRecoveryResponse(response.content);
  }

  async provideMotivation(
    progress: MissionProgress,
    session: SessionState
  ): Promise<string> {
    const systemPrompt = `You are an encouraging project manager. Provide brief, positive motivation.`;
    
    const userMessage = `
Progress: ${progress.completionPercentage}% complete
Iterations: ${session.iterations}
Completed tasks: ${session.completedTasks.length}
Pending tasks: ${session.pendingTasks.length}

Provide a brief motivational message (1-2 sentences).`;

    const response = await this.client.sendMessage(systemPrompt, userMessage);
    return response.content;
  }

  private buildAnalysisSystemPrompt(): string {
    return `You are an expert project manager analyzing the current state of a software development mission.

Your role is to:
1. Assess the current progress and identify any blockers
2. Provide actionable recommendations
3. Determine the best next steps
4. Evaluate confidence in successful completion

Respond in JSON format with the following structure:
{
  "currentStatus": "Brief status summary",
  "blockers": ["List of current blockers"],
  "recommendations": ["List of recommendations"],
  "nextSteps": ["Ordered list of next actions"],
  "confidence": 0.0-1.0
}`;
  }

  private buildAnalysisUserMessage(
    mission: Mission,
    session: SessionState,
    progress: MissionProgress
  ): string {
    return `
Mission: ${mission.title}
Description: ${mission.description}
Repository: ${mission.repository}

Progress: ${progress.completionPercentage}% complete
Completed criteria: ${progress.completedCriteria}/${progress.totalCriteria}
Critical criteria: ${progress.criticalCompleted}/${progress.criticalCriteria}
Current phase: ${progress.currentPhase}

Session details:
- Iterations: ${session.iterations}
- Current phase: ${session.currentPhase}
- Completed tasks: ${session.completedTasks.length}
- Pending tasks: ${session.pendingTasks.length}
- Errors: ${session.errors.filter(e => !e.resolved).length} unresolved

Recent artifacts:
${session.artifacts.slice(-5).map(a => `- ${a.type}: ${a.path}`).join('\n')}

Analyze the current state and provide recommendations.`;
  }

  private buildPlanningSystemPrompt(): string {
    return `You are an expert software architect planning the implementation of a specific criterion.

Your role is to:
1. Create a clear, actionable plan for Claude Code to execute
2. Break down complex tasks into manageable steps
3. Consider dependencies and prerequisites
4. Focus on achieving the specific criterion

Provide a detailed implementation plan that Claude Code can follow.
Be specific about:
- Files to create or modify
- Code to write
- Tests to implement
- Validation steps`;
  }

  private buildPlanningUserMessage(
    analysis: AnalysisResult,
    criterion: DoDCriteria,
    session: SessionState
  ): string {
    return `
Current Analysis:
${JSON.stringify(analysis, null, 2)}

Criterion to achieve:
- ID: ${criterion.id}
- Description: ${criterion.description}
- Priority: ${criterion.priority}
- Measurable: ${criterion.measurable}

Session context:
- Repository: ${session.repository}
- Completed tasks: ${session.completedTasks.join(', ') || 'None'}
- Existing artifacts: ${session.artifacts.length}

Create a detailed action plan for Claude Code to implement this criterion.`;
  }

  private buildValidationSystemPrompt(): string {
    return `You are a quality assurance expert validating whether a criterion has been successfully completed.

Evaluate the execution results against the criterion requirements.
Be strict but fair in your assessment.

Respond in JSON format:
{
  "completed": true/false,
  "evidence": "Evidence of completion" (if completed),
  "reason": "Why not complete" (if not completed),
  "confidence": 0.0-1.0
}`;
  }

  private buildValidationUserMessage(
    criterion: DoDCriteria,
    executionResult: ClaudeCodeResult,
    _session: SessionState
  ): string {
    return `
Criterion to validate:
- Description: ${criterion.description}
- Priority: ${criterion.priority}
- Measurable: ${criterion.measurable}

Execution result:
- Success: ${executionResult.success}
- Session ended: ${executionResult.sessionEnded}
- Artifacts created: ${executionResult.artifacts.length}
- Error: ${executionResult.error || 'None'}

Output preview:
${executionResult.output.substring(0, 1000)}

Artifacts:
${executionResult.artifacts.map(a => `- ${a.type}: ${a.path}`).join('\n')}

Determine if this criterion has been successfully completed.`;
  }

  private buildErrorRecoverySystemPrompt(): string {
    return `You are an expert troubleshooter helping recover from errors during mission execution.

Analyze the error and determine:
1. Whether recovery is possible
2. The best recovery strategy
3. Specific recovery actions

Respond in JSON format:
{
  "canRecover": true/false,
  "strategy": "Recovery strategy name" (if recoverable),
  "recoveryAction": "Specific action to take" (if recoverable),
  "reason": "Why recovery is/isn't possible"
}`;
  }

  private buildErrorRecoveryUserMessage(
    error: Error,
    session: SessionState
  ): string {
    return `
Error encountered:
- Type: ${error.name}
- Message: ${error.message}
- Stack: ${error.stack?.substring(0, 500)}

Session state:
- Current phase: ${session.currentPhase}
- Iterations: ${session.iterations}
- Recent errors: ${session.errors.slice(-3).map(e => e.message).join(', ')}

Analyze this error and provide a recovery strategy.`;
  }

  private parseAnalysisResponse(content: string): AnalysisResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.logger.warn('Failed to parse analysis response as JSON', { error });
    }

    // Fallback to default structure
    return {
      currentStatus: 'Analysis in progress',
      blockers: [],
      recommendations: [content],
      nextSteps: ['Continue with implementation'],
      confidence: 0.7
    };
  }

  private parseValidationResponse(content: string): ValidationResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.logger.warn('Failed to parse validation response as JSON', { error });
    }

    // Fallback based on content keywords
    const completed = content.toLowerCase().includes('complete') || 
                     content.toLowerCase().includes('success');
    
    return {
      completed,
      evidence: completed ? content : undefined,
      reason: completed ? undefined : content,
      confidence: 0.5
    };
  }

  private parseErrorRecoveryResponse(content: string): ErrorRecovery {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.logger.warn('Failed to parse error recovery response as JSON', { error });
    }

    // Fallback
    return {
      canRecover: true,
      strategy: 'Retry with modifications',
      recoveryAction: content,
      reason: 'Attempting automatic recovery'
    };
  }
}