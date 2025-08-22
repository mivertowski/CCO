/**
 * Progress reporting and visualization utilities
 */

import { EnhancedLogger, LogContext, LogMetadata } from './logger';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import cliProgress from 'cli-progress';
import { Mission, DoDCriteria } from '../models/mission';
import { SessionState } from '../models/session';

export interface ProgressState {
  phase: string;
  iteration: number;
  totalIterations: number;
  completedTasks: number;
  totalTasks: number;
  currentTask?: string;
  tokenUsage: {
    total: number;
    cost: number;
  };
  startTime: Date;
  estimatedCompletion?: Date;
}

export class ProgressReporter {
  private logger: EnhancedLogger;
  private spinner?: Ora;
  private progressBar?: cliProgress.SingleBar;
  private state: ProgressState;
  private isInteractive: boolean;
  
  constructor(logger: EnhancedLogger, interactive: boolean = true) {
    this.logger = logger;
    this.isInteractive = interactive && process.stdout.isTTY;
    this.state = {
      phase: 'Initialization',
      iteration: 0,
      totalIterations: 0,
      completedTasks: 0,
      totalTasks: 0,
      tokenUsage: { total: 0, cost: 0 },
      startTime: new Date()
    };
  }
  
  /**
   * Start a new phase with spinner
   */
  startPhase(phase: string, message?: string): void {
    this.state.phase = phase;
    
    if (this.isInteractive) {
      if (this.spinner) {
        this.spinner.succeed();
      }
      this.spinner = ora({
        text: message || `Starting ${phase}...`,
        prefixText: chalk.cyan(`[${phase}]`)
      }).start();
    } else {
      this.logger.orchestration(`Phase started: ${phase}`, { 
        phase,
        message 
      });
    }
  }
  
  /**
   * Update current phase progress
   */
  updatePhase(message: string, metadata?: LogMetadata): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
    
    this.logger.debug(message, {
      context: LogContext.ORCHESTRATION,
      phase: this.state.phase,
      ...metadata
    });
  }
  
  /**
   * Complete current phase
   */
  completePhase(success: boolean = true, message?: string): void {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(message || `${this.state.phase} completed`);
      } else {
        this.spinner.fail(message || `${this.state.phase} failed`);
      }
      this.spinner = undefined;
    } else {
      this.logger.orchestration(
        message || `Phase ${success ? 'completed' : 'failed'}: ${this.state.phase}`,
        { phase: this.state.phase, success }
      );
    }
  }
  
  /**
   * Initialize progress bar for DoD tracking
   */
  initializeDoDProgress(mission: Mission): void {
    const totalTasks = mission.definitionOfDone.length;
    const completedTasks = mission.definitionOfDone.filter(d => d.completed).length;
    
    this.state.totalTasks = totalTasks;
    this.state.completedTasks = completedTasks;
    
    if (this.isInteractive && totalTasks > 0) {
      this.progressBar = new cliProgress.SingleBar({
        format: `DoD Progress |${chalk.cyan('{bar}')}| {percentage}% | {value}/{total} Tasks | ETA: {eta_formatted}`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
      }, cliProgress.Presets.shades_classic);
      
      this.progressBar.start(totalTasks, completedTasks);
    }
    
    this.logger.orchestration('DoD Progress initialized', {
      totalTasks,
      completedTasks,
      percentage: Math.round((completedTasks / totalTasks) * 100)
    });
  }
  
  /**
   * Update DoD progress
   */
  updateDoDProgress(completedCriteria: DoDCriteria[]): void {
    this.state.completedTasks = completedCriteria.length;
    
    if (this.progressBar) {
      this.progressBar.update(this.state.completedTasks);
    }
    
    const percentage = Math.round((this.state.completedTasks / this.state.totalTasks) * 100);
    
    this.logger.orchestration('DoD Progress updated', {
      completedTasks: this.state.completedTasks,
      totalTasks: this.state.totalTasks,
      percentage,
      completedCriteria: completedCriteria.map(c => c.description)
    });
  }
  
  /**
   * Complete progress bar
   */
  completeDoDProgress(): void {
    if (this.progressBar) {
      this.progressBar.stop();
      this.progressBar = undefined;
    }
  }
  
  /**
   * Report iteration progress
   */
  reportIteration(iteration: number, maxIterations: number, session: SessionState): void {
    this.state.iteration = iteration;
    this.state.totalIterations = maxIterations;
    
    const elapsed = Date.now() - this.state.startTime.getTime();
    const avgTimePerIteration = elapsed / iteration;
    const remainingIterations = maxIterations - iteration;
    const estimatedRemaining = avgTimePerIteration * remainingIterations;
    
    this.state.estimatedCompletion = new Date(Date.now() + estimatedRemaining);
    
    const progress = {
      iteration,
      maxIterations,
      phase: session.currentPhase,
      completedTasks: session.completedTasks?.length || 0,
      tokenUsage: this.state.tokenUsage,
      elapsed: Math.round(elapsed / 1000),
      estimatedRemaining: Math.round(estimatedRemaining / 1000)
    };
    
    if (this.isInteractive) {
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.bold(`Iteration ${iteration}/${maxIterations}`));
      console.log(`Phase: ${chalk.cyan(session.currentPhase)}`);
      console.log(`Completed Tasks: ${chalk.green(session.completedTasks.length)}`);
      console.log(`Token Usage: ${chalk.yellow(this.state.tokenUsage.total)} (Cost: $${this.state.tokenUsage.cost.toFixed(4)})`);
      console.log(`Time: ${this.formatDuration(elapsed)} elapsed, ~${this.formatDuration(estimatedRemaining)} remaining`);
      console.log(chalk.gray('─'.repeat(50)));
    }
    
    this.logger.orchestration('Iteration progress', progress);
  }
  
  /**
   * Report token usage
   */
  reportTokenUsage(tokens: number, cost: number, context: string): void {
    this.state.tokenUsage.total += tokens;
    this.state.tokenUsage.cost += cost;
    
    this.logger.tokenUsage(`Token usage for ${context}`, {
      prompt: 0,
      completion: 0,
      total: tokens,
      cost
    }, {
      cumulativeTokens: this.state.tokenUsage.total,
      cumulativeCost: this.state.tokenUsage.cost
    });
  }
  
  /**
   * Report error with context
   */
  reportError(error: any, context: string, recoverable: boolean = false): void {
    if (this.spinner) {
      this.spinner.fail(`Error in ${context}`);
      this.spinner = undefined;
    }
    
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorDetails: LogMetadata = {
      context: LogContext.ERROR,
      phase: this.state.phase,
      iteration: this.state.iteration,
      metadata: {
        errorContext: context,
        recoverable,
        error: error?.stack || errorMessage
      }
    };
    
    if (this.isInteractive) {
      console.error(chalk.red(`\n❌ Error in ${context}:`));
      console.error(chalk.red(errorMessage));
      if (recoverable) {
        console.log(chalk.yellow('⚠️  This error is recoverable, continuing...'));
      }
    }
    
    this.logger.error(`Error in ${context}: ${errorMessage}`, error, errorDetails);
  }
  
  /**
   * Generate final report
   */
  generateFinalReport(success: boolean, session: SessionState, mission: Mission): void {
    this.completeDoDProgress();
    if (this.spinner) {
      this.spinner.stop();
    }
    
    const elapsed = Date.now() - this.state.startTime.getTime();
    const completionRate = Math.round((this.state.completedTasks / this.state.totalTasks) * 100);
    
    const report = {
      success,
      duration: this.formatDuration(elapsed),
      iterations: this.state.iteration,
      completedTasks: session.completedTasks?.length || 0,
      totalTasks: mission.definitionOfDone.length,
      completionRate,
      tokenUsage: this.state.tokenUsage,
      phases: session.phaseHistory || []
    };
    
    if (this.isInteractive) {
      console.log('\n' + chalk.bold.cyan('═'.repeat(60)));
      console.log(chalk.bold.white('                  ORCHESTRATION COMPLETE'));
      console.log(chalk.cyan('═'.repeat(60)));
      
      if (success) {
        console.log(chalk.green('✅ Mission completed successfully!'));
      } else {
        console.log(chalk.red('❌ Mission failed or incomplete'));
      }
      
      console.log('\n' + chalk.bold('📊 Summary:'));
      console.log(`  Duration: ${chalk.yellow(report.duration)}`);
      console.log(`  Iterations: ${chalk.yellow(report.iterations)}`);
      console.log(`  Tasks Completed: ${chalk.green(report.completedTasks)}/${report.totalTasks} (${completionRate}%)`);
      console.log(`  Total Tokens: ${chalk.yellow(report.tokenUsage.total)}`);
      console.log(`  Total Cost: ${chalk.yellow('$' + report.tokenUsage.cost.toFixed(4))}`);
      
      if (report.phases.length > 0) {
        console.log('\n' + chalk.bold('📈 Phase History:'));
        report.phases.forEach((phase: any) => {
          console.log(`  - ${phase}`);
        });
      }
      
      console.log(chalk.cyan('═'.repeat(60)) + '\n');
    }
    
    this.logger.orchestration('Final orchestration report', {
      ...report,
      duration: undefined, // Remove string duration for metadata
      metadata: { durationString: report.duration }
    });
  }
  
  /**
   * Format duration for display
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
  
  /**
   * Create a simple text-based progress bar for non-interactive mode
   */
  logProgress(current: number, total: number, label: string = 'Progress'): void {
    if (!this.isInteractive) {
      const percentage = Math.round((current / total) * 100);
      this.logger.info(`${label}: ${current}/${total} (${percentage}%)`, {
        current,
        total,
        percentage
      });
    }
  }
}

/**
 * Create a progress reporter for a session
 */
export function createProgressReporter(
  logger: EnhancedLogger,
  interactive: boolean = true
): ProgressReporter {
  return new ProgressReporter(logger, interactive);
}