"use strict";
/**
 * Progress reporting and visualization utilities
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressReporter = void 0;
exports.createProgressReporter = createProgressReporter;
const logger_1 = require("./logger");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const cli_progress_1 = __importDefault(require("cli-progress"));
class ProgressReporter {
    logger;
    spinner;
    progressBar;
    state;
    isInteractive;
    constructor(logger, interactive = true) {
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
    startPhase(phase, message) {
        this.state.phase = phase;
        if (this.isInteractive) {
            if (this.spinner) {
                this.spinner.succeed();
            }
            this.spinner = (0, ora_1.default)({
                text: message || `Starting ${phase}...`,
                prefixText: chalk_1.default.cyan(`[${phase}]`)
            }).start();
        }
        else {
            this.logger.orchestration(`Phase started: ${phase}`, {
                phase,
                message
            });
        }
    }
    /**
     * Update current phase progress
     */
    updatePhase(message, metadata) {
        if (this.spinner) {
            this.spinner.text = message;
        }
        this.logger.debug(message, {
            context: logger_1.LogContext.ORCHESTRATION,
            phase: this.state.phase,
            ...metadata
        });
    }
    /**
     * Complete current phase
     */
    completePhase(success = true, message) {
        if (this.spinner) {
            if (success) {
                this.spinner.succeed(message || `${this.state.phase} completed`);
            }
            else {
                this.spinner.fail(message || `${this.state.phase} failed`);
            }
            this.spinner = undefined;
        }
        else {
            this.logger.orchestration(message || `Phase ${success ? 'completed' : 'failed'}: ${this.state.phase}`, { phase: this.state.phase, success });
        }
    }
    /**
     * Initialize progress bar for DoD tracking
     */
    initializeDoDProgress(mission) {
        const totalTasks = mission.definitionOfDone.length;
        const completedTasks = mission.definitionOfDone.filter(d => d.completed).length;
        this.state.totalTasks = totalTasks;
        this.state.completedTasks = completedTasks;
        if (this.isInteractive && totalTasks > 0) {
            this.progressBar = new cli_progress_1.default.SingleBar({
                format: `DoD Progress |${chalk_1.default.cyan('{bar}')}| {percentage}% | {value}/{total} Tasks | ETA: {eta_formatted}`,
                barCompleteChar: '\u2588',
                barIncompleteChar: '\u2591',
                hideCursor: true
            }, cli_progress_1.default.Presets.shades_classic);
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
    updateDoDProgress(completedCriteria) {
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
    completeDoDProgress() {
        if (this.progressBar) {
            this.progressBar.stop();
            this.progressBar = undefined;
        }
    }
    /**
     * Report iteration progress
     */
    reportIteration(iteration, maxIterations, session) {
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
            console.log(chalk_1.default.gray('─'.repeat(50)));
            console.log(chalk_1.default.bold(`Iteration ${iteration}/${maxIterations}`));
            console.log(`Phase: ${chalk_1.default.cyan(session.currentPhase)}`);
            console.log(`Completed Tasks: ${chalk_1.default.green(session.completedTasks.length)}`);
            console.log(`Token Usage: ${chalk_1.default.yellow(this.state.tokenUsage.total)} (Cost: $${this.state.tokenUsage.cost.toFixed(4)})`);
            console.log(`Time: ${this.formatDuration(elapsed)} elapsed, ~${this.formatDuration(estimatedRemaining)} remaining`);
            console.log(chalk_1.default.gray('─'.repeat(50)));
        }
        this.logger.orchestration('Iteration progress', progress);
    }
    /**
     * Report token usage
     */
    reportTokenUsage(tokens, cost, context) {
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
    reportError(error, context, recoverable = false) {
        if (this.spinner) {
            this.spinner.fail(`Error in ${context}`);
            this.spinner = undefined;
        }
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        const errorDetails = {
            context: logger_1.LogContext.ERROR,
            phase: this.state.phase,
            iteration: this.state.iteration,
            metadata: {
                errorContext: context,
                recoverable,
                error: error?.stack || errorMessage
            }
        };
        if (this.isInteractive) {
            console.error(chalk_1.default.red(`\n❌ Error in ${context}:`));
            console.error(chalk_1.default.red(errorMessage));
            if (recoverable) {
                console.log(chalk_1.default.yellow('⚠️  This error is recoverable, continuing...'));
            }
        }
        this.logger.error(`Error in ${context}: ${errorMessage}`, error, errorDetails);
    }
    /**
     * Generate final report
     */
    generateFinalReport(success, session, mission) {
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
            console.log('\n' + chalk_1.default.bold.cyan('═'.repeat(60)));
            console.log(chalk_1.default.bold.white('                  ORCHESTRATION COMPLETE'));
            console.log(chalk_1.default.cyan('═'.repeat(60)));
            if (success) {
                console.log(chalk_1.default.green('✅ Mission completed successfully!'));
            }
            else {
                console.log(chalk_1.default.red('❌ Mission failed or incomplete'));
            }
            console.log('\n' + chalk_1.default.bold('📊 Summary:'));
            console.log(`  Duration: ${chalk_1.default.yellow(report.duration)}`);
            console.log(`  Iterations: ${chalk_1.default.yellow(report.iterations)}`);
            console.log(`  Tasks Completed: ${chalk_1.default.green(report.completedTasks)}/${report.totalTasks} (${completionRate}%)`);
            console.log(`  Total Tokens: ${chalk_1.default.yellow(report.tokenUsage.total)}`);
            console.log(`  Total Cost: ${chalk_1.default.yellow('$' + report.tokenUsage.cost.toFixed(4))}`);
            if (report.phases.length > 0) {
                console.log('\n' + chalk_1.default.bold('📈 Phase History:'));
                report.phases.forEach((phase) => {
                    console.log(`  - ${phase}`);
                });
            }
            console.log(chalk_1.default.cyan('═'.repeat(60)) + '\n');
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
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        else {
            return `${seconds}s`;
        }
    }
    /**
     * Create a simple text-based progress bar for non-interactive mode
     */
    logProgress(current, total, label = 'Progress') {
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
exports.ProgressReporter = ProgressReporter;
/**
 * Create a progress reporter for a session
 */
function createProgressReporter(logger, interactive = true) {
    return new ProgressReporter(logger, interactive);
}
//# sourceMappingURL=progress-reporter.js.map