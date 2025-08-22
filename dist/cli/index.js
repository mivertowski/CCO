#!/usr/bin/env node
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Suppress NODE_TLS_REJECT_UNAUTHORIZED warning if it exists
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    process.removeAllListeners('warning');
    process.on('warning', (warning) => {
        if (!warning.message.includes('NODE_TLS_REJECT_UNAUTHORIZED')) {
            console.warn(warning);
        }
    });
}
const commander_1 = require("commander");
const dotenv = __importStar(require("dotenv"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const logger_1 = require("../monitoring/logger");
const mission_parser_1 = require("../core/mission-parser");
const orchestrator_1 = require("../core/orchestrator");
const session_manager_1 = require("../core/session-manager");
const openrouter_client_1 = require("../llm/openrouter-client");
const claude_code_client_1 = require("../llm/claude-code-client");
const claude_code_sdk_client_1 = require("../llm/claude-code-sdk-client");
const config_loader_1 = require("../config/config-loader");
const errors_1 = require("../utils/errors");
const inquirer_1 = __importDefault(require("inquirer"));
// Load environment variables
dotenv.config();
const program = new commander_1.Command();
const baseLogger = (0, logger_1.createLogger)();
const logger = (0, logger_1.createEnhancedLogger)('.cco/logs');
program
    .name('cco')
    .description('Claude Code Orchestrator - Automated orchestration for Claude Code')
    .version('0.1.0');
program
    .command('init')
    .description('Initialize CCO in the current directory')
    .option('-m, --mission <path>', 'Path to mission file')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Initializing CCO...').start();
    try {
        // Create .cco directory
        await fs.mkdir('.cco', { recursive: true });
        await fs.mkdir('.cco/sessions', { recursive: true });
        await fs.mkdir('.cco/logs', { recursive: true });
        // Create default config if not exists
        const configPath = path.join('.cco', 'config.yaml');
        const configExists = await fs.access(configPath).then(() => true).catch(() => false);
        if (!configExists) {
            const defaultConfig = `
orchestrator:
  mode: "single_instance"
  max_iterations: 1000
  checkpoint_interval: 5
  
repository:
  path: "${process.cwd()}"
  auto_commit: true
  commit_frequency: "per_session"
  
openrouter:
  api_key: \${OPENROUTER_API_KEY}
  model: "meta-llama/llama-3.2-3b-instruct:free"  # Start with free model
  temperature: 0.5
  
claude_code:
  api_key: \${ANTHROPIC_API_KEY}  # Optional if using subscription
  use_subscription: false  # Set to true if using Claude Code subscription
  workspace: "${process.cwd()}"
  max_file_size: 100000
  
persistence:
  type: "file"
  path: ".cco/sessions"
  
monitoring:
  log_level: "info"
  log_path: ".cco/logs"
  enable_telemetry: false
  enable_perf_logs: false
`;
            await fs.writeFile(configPath, defaultConfig.trim());
        }
        spinner.succeed(chalk_1.default.green('CCO initialized successfully'));
        if (options.mission) {
            console.log(chalk_1.default.blue(`Mission file: ${options.mission}`));
        }
        else {
            console.log(chalk_1.default.yellow('No mission file specified. Use --mission flag or create mission.yaml'));
        }
    }
    catch (error) {
        const ccoError = errors_1.ErrorHandler.handle(error);
        logger.error('Initialization failed', ccoError);
        spinner.fail(chalk_1.default.red('Failed to initialize CCO'));
        console.error(errors_1.ErrorHandler.format(ccoError));
        process.exit(1);
    }
});
program
    .command('start')
    .description('Start orchestration with a mission')
    .option('-m, --mission <path>', 'Path to mission file', 'mission.yaml')
    .option('-c, --config <path>', 'Path to config file', '.cco/config.yaml')
    .option('--use-sdk', 'Use Claude Code SDK for automation (recommended)')
    .option('--resume', 'Resume from last session')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Starting orchestration...').start();
    try {
        // Check for required environment variables
        if (!process.env.OPENROUTER_API_KEY) {
            throw new Error('OPENROUTER_API_KEY environment variable is required');
        }
        // Load configuration
        spinner.text = 'Loading configuration...';
        const config = await (0, config_loader_1.loadConfig)(options.config);
        // Only require Anthropic API key if not using subscription
        if (!config.claude_code?.use_subscription && !process.env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY environment variable is required (or set use_subscription: true in config)');
        }
        // Parse mission
        spinner.text = 'Parsing mission file...';
        const missionParser = new mission_parser_1.MissionParser(baseLogger);
        const mission = await missionParser.parseMissionFile(options.mission);
        // Validate mission
        const validation = missionParser.validateMission(mission);
        if (!validation.valid) {
            throw new Error(`Invalid mission: ${validation.errors?.join(', ')}`);
        }
        spinner.succeed(chalk_1.default.green('Mission loaded successfully'));
        console.log(chalk_1.default.blue(`Mission: ${mission.title}`));
        console.log(chalk_1.default.gray(`Repository: ${mission.repository}`));
        console.log(chalk_1.default.gray(`DoD Criteria: ${mission.definitionOfDone.length}`));
        // Initialize components
        const sessionManager = new session_manager_1.SessionManager(config.persistence.path, baseLogger);
        // Create enhanced logger for orchestration
        const orchLogger = logger.child({
            missionId: mission.id,
            missionTitle: mission.title
        });
        const openRouterClient = new openrouter_client_1.OpenRouterClient({
            apiKey: process.env.OPENROUTER_API_KEY,
            model: config.openrouter.model,
            temperature: config.openrouter.temperature,
            maxTokens: 4096,
            baseURL: 'https://openrouter.ai/api/v1',
            retryAttempts: 3,
            retryDelay: 1000
        }, baseLogger);
        // Choose between SDK and legacy client
        let claudeCodeClient;
        if (options.useSdk || config.claude_code?.use_sdk) {
            // Use the new SDK client (recommended)
            claudeCodeClient = new claude_code_sdk_client_1.ClaudeCodeSDKClient({
                apiKey: process.env.ANTHROPIC_API_KEY,
                projectPath: mission.repository,
                maxTurns: Math.min(config.orchestrator.max_iterations, 10), // SDK has turn limits
                model: 'claude-3-5-sonnet-20241022', // Latest model
                temperature: 0.3,
                systemPrompt: `Working on mission: ${mission.title}`,
                planMode: false, // Execute mode
                jsonMode: false
            }, baseLogger);
        }
        else {
            // Legacy client (for backward compatibility)
            claudeCodeClient = new claude_code_client_1.ClaudeCodeClient({
                apiKey: process.env.ANTHROPIC_API_KEY,
                useSubscription: config.claude_code?.use_subscription || false,
                projectPath: mission.repository,
                maxIterations: config.orchestrator.max_iterations,
                model: 'claude-opus-4-1-20250805',
                temperature: 0.3,
                timeoutMs: 300000,
                contextWindow: 200000
            }, baseLogger);
        }
        // Create orchestrator
        const orchestrator = new orchestrator_1.Orchestrator({
            mission,
            openRouterClient,
            claudeCodeClient,
            sessionManager,
            logger: orchLogger,
            checkpointInterval: config.orchestrator.checkpoint_interval,
            maxIterations: config.orchestrator.max_iterations,
            interactive: process.stdout.isTTY,
            enableTelemetry: config.monitoring?.enable_telemetry
        });
        // Start orchestration
        console.log(chalk_1.default.cyan('\n🚀 Starting orchestration...\n'));
        const result = await orchestrator.orchestrate();
        if (result.success) {
            console.log(chalk_1.default.green('\n✅ Mission completed successfully!'));
            console.log(chalk_1.default.gray(`Total iterations: ${result.metrics.totalIterations}`));
            console.log(chalk_1.default.gray(`Completion: ${result.metrics.completionPercentage}%`));
            console.log(chalk_1.default.gray(`Artifacts created: ${result.artifacts.length}`));
        }
        else {
            console.log(chalk_1.default.yellow('\n⚠️ Mission partially completed'));
            console.log(chalk_1.default.gray(`Progress: ${result.metrics.completionPercentage}%`));
            console.log(chalk_1.default.gray(`Completed criteria: ${result.metrics.dodCriteriaCompleted}/${result.metrics.dodCriteriaTotal}`));
        }
    }
    catch (error) {
        const ccoError = errors_1.ErrorHandler.handle(error);
        logger.error('Orchestration failed', ccoError);
        spinner.fail(chalk_1.default.red('Orchestration failed'));
        console.error(errors_1.ErrorHandler.format(ccoError));
        process.exit(1);
    }
});
program
    .command('status')
    .description('Check status of current orchestration')
    .option('-s, --session <id>', 'Session ID to check')
    .action(async (options) => {
    try {
        const sessionManager = new session_manager_1.SessionManager('.cco/sessions', baseLogger);
        if (options.session) {
            const session = await sessionManager.loadSession(options.session);
            if (session) {
                console.log(chalk_1.default.blue(`Session: ${session.sessionId}`));
                console.log(chalk_1.default.gray(`Mission: ${session.missionId}`));
                console.log(chalk_1.default.gray(`Phase: ${session.currentPhase}`));
                console.log(chalk_1.default.gray(`Iterations: ${session.iterations}`));
                console.log(chalk_1.default.gray(`Completed tasks: ${session.completedTasks.length}`));
            }
            else {
                console.log(chalk_1.default.red(`Session ${options.session} not found`));
            }
        }
        else {
            const sessions = await sessionManager.listSessions();
            if (sessions.length === 0) {
                console.log(chalk_1.default.yellow('No active sessions found'));
            }
            else {
                console.log(chalk_1.default.blue('Active sessions:'));
                for (const session of sessions) {
                    console.log(chalk_1.default.gray(`  - ${session.sessionId} (${session.currentPhase})`));
                }
            }
        }
    }
    catch (error) {
        const ccoError = errors_1.ErrorHandler.handle(error);
        logger.error('Status check failed', ccoError);
        console.error(chalk_1.default.red('Failed to get status'));
        console.error(errors_1.ErrorHandler.format(ccoError));
        process.exit(1);
    }
});
program
    .command('resume')
    .description('Resume a paused orchestration')
    .option('-s, --session <id>', 'Session ID to resume')
    .action(async (options) => {
    try {
        const sessionManager = new session_manager_1.SessionManager('.cco/sessions', baseLogger);
        let sessionId = options.session;
        if (!sessionId) {
            const sessions = await sessionManager.listSessions();
            if (sessions.length === 0) {
                console.log(chalk_1.default.yellow('No sessions to resume'));
                return;
            }
            const choices = sessions.map(s => ({
                name: `${s.sessionId.substring(0, 8)} - ${s.currentPhase} (${s.iterations} iterations)`,
                value: s.sessionId
            }));
            const answer = await inquirer_1.default.prompt([
                {
                    type: 'list',
                    name: 'session',
                    message: 'Select session to resume:',
                    choices
                }
            ]);
            sessionId = answer.session;
        }
        const session = await sessionManager.recover(sessionId);
        console.log(chalk_1.default.green(`Resuming session ${sessionId}`));
        console.log(chalk_1.default.gray(`Current phase: ${session.currentPhase}`));
        console.log(chalk_1.default.gray(`Iterations: ${session.iterations}`));
        // TODO: Implement resume logic
        console.log(chalk_1.default.yellow('Resume functionality coming soon...'));
    }
    catch (error) {
        console.error(chalk_1.default.red('Failed to resume session'));
        console.error(error);
        process.exit(1);
    }
});
program
    .command('dashboard')
    .description('Open the monitoring dashboard')
    .option('-p, --port <port>', 'Dashboard port', '8080')
    .action(async (options) => {
    console.log(chalk_1.default.blue(`Opening dashboard on port ${options.port}...`));
    console.log(chalk_1.default.yellow('Dashboard functionality coming soon...'));
    // TODO: Implement dashboard
});
program
    .command('github')
    .description('Execute mission from GitHub issue')
    .option('-i, --issue <number>', 'GitHub issue number', parseInt)
    .option('-r, --repository <repo>', 'Repository (owner/repo format)')
    .option('-t, --token <token>', 'GitHub token (or use GITHUB_TOKEN env)')
    .option('--create-pr', 'Create pull request after completion', false)
    .option('--semantic-commits', 'Use semantic commit messages', false)
    .option('--base-branch <branch>', 'Base branch for PR', 'main')
    .option('--interactive', 'Interactive issue selection mode', false)
    .option('--auto', 'Automated mode - process issues by priority', false)
    .option('--poll-interval <minutes>', 'Polling interval for auto mode (minutes)', parseInt, 30)
    .option('--labels <labels>', 'Filter issues by labels (comma-separated)')
    .option('--max-issues <count>', 'Maximum issues to process in auto mode', parseInt, 5)
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Initializing GitHub integration...').start();
    try {
        // Import GitHub integration components
        const { GitHubOrchestrator } = await Promise.resolve().then(() => __importStar(require('../integrations/github/github-orchestrator')));
        const { GitHubClient } = await Promise.resolve().then(() => __importStar(require('../integrations/github/github-client')));
        // Parse repository from option or config
        let owner, repo;
        if (options.repository) {
            const parts = options.repository.split('/');
            if (parts.length !== 2) {
                throw new Error('Repository must be in owner/repo format');
            }
            [owner, repo] = parts;
        }
        else {
            // Try to get from git remote
            const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
            const { promisify } = await Promise.resolve().then(() => __importStar(require('util')));
            const execAsync = promisify(exec);
            try {
                const { stdout } = await execAsync('git remote get-url origin');
                const cleanUrl = stdout.trim();
                // Handle both HTTPS and SSH URLs
                const match = cleanUrl.match(/github\.com[:/]([^/]+)\/([^/\s]+?)(?:\.git)?$/);
                if (match) {
                    owner = match[1];
                    repo = match[2].replace(/\.git$/, ''); // Remove .git if present
                }
                else {
                    throw new Error('Could not parse GitHub repository from remote');
                }
            }
            catch {
                throw new Error('Repository not specified and could not detect from git remote');
            }
        }
        // Get GitHub token
        const token = options.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
        if (!token) {
            spinner.warn('No GitHub token found, will attempt to use GitHub CLI');
        }
        // Handle different modes
        let issuesToProcess = [];
        if (options.interactive) {
            // Interactive mode - let user select issues
            spinner.text = 'Fetching open issues...';
            const githubClient = new GitHubClient({ owner, repo, token }, baseLogger);
            const labelFilter = options.labels ? options.labels.split(',').map((l) => l.trim()) : undefined;
            const issues = await githubClient.listIssues({
                state: 'open',
                labels: labelFilter,
                sort: 'created',
                direction: 'desc'
            });
            if (issues.length === 0) {
                spinner.fail('No open issues found');
                return;
            }
            spinner.stop();
            // Sort issues by priority (based on labels)
            const prioritizedIssues = issues.sort((a, b) => {
                const getPriority = (issue) => {
                    const labels = issue.labels.map((l) => l.name.toLowerCase());
                    if (labels.includes('priority:critical') || labels.includes('p0'))
                        return 0;
                    if (labels.includes('priority:high') || labels.includes('p1'))
                        return 1;
                    if (labels.includes('priority:medium') || labels.includes('p2'))
                        return 2;
                    if (labels.includes('priority:low') || labels.includes('p3'))
                        return 3;
                    return 4;
                };
                return getPriority(a) - getPriority(b);
            });
            // Display issues with formatting
            console.log(chalk_1.default.blue('\n📋 Open Issues:\n'));
            const choices = prioritizedIssues.map(issue => {
                const labels = issue.labels.map((l) => l.name).join(', ');
                const priority = labels.includes('critical') || labels.includes('p0') ? '🔴' :
                    labels.includes('high') || labels.includes('p1') ? '🟠' :
                        labels.includes('medium') || labels.includes('p2') ? '🟡' :
                            labels.includes('low') || labels.includes('p3') ? '🟢' : '⚪';
                return {
                    name: `${priority} #${issue.number}: ${issue.title}${labels ? chalk_1.default.gray(` [${labels}]`) : ''}`,
                    value: issue.number,
                    short: `#${issue.number}`
                };
            });
            const answers = await inquirer_1.default.prompt([
                {
                    type: 'checkbox',
                    name: 'selectedIssues',
                    message: 'Select issues to process (space to select, enter to confirm):',
                    choices,
                    validate: (input) => input.length > 0 || 'Please select at least one issue'
                }
            ]);
            issuesToProcess = answers.selectedIssues;
        }
        else if (options.auto) {
            // Automated mode - process issues by priority continuously
            console.log(chalk_1.default.cyan('\n🤖 Starting automated issue processing...\n'));
            console.log(chalk_1.default.gray(`Polling interval: ${options.pollInterval} minutes`));
            console.log(chalk_1.default.gray(`Max issues per run: ${options.maxIssues}`));
            if (options.labels) {
                console.log(chalk_1.default.gray(`Label filter: ${options.labels}`));
            }
            const processIssuesBatch = async () => {
                spinner.start('Checking for new issues...');
                const githubClient = new GitHubClient({ owner, repo, token }, baseLogger);
                const labelFilter = options.labels ? options.labels.split(',').map((l) => l.trim()) : undefined;
                const issues = await githubClient.listIssues({
                    state: 'open',
                    labels: labelFilter,
                    sort: 'created',
                    direction: 'desc',
                    limit: options.maxIssues
                });
                if (issues.length === 0) {
                    spinner.info('No open issues found');
                    return [];
                }
                // Sort by priority
                const prioritizedIssues = issues.sort((a, b) => {
                    const getPriority = (issue) => {
                        const labels = issue.labels.map((l) => l.name.toLowerCase());
                        if (labels.includes('priority:critical') || labels.includes('p0'))
                            return 0;
                        if (labels.includes('priority:high') || labels.includes('p1'))
                            return 1;
                        if (labels.includes('priority:medium') || labels.includes('p2'))
                            return 2;
                        if (labels.includes('priority:low') || labels.includes('p3'))
                            return 3;
                        return 4;
                    };
                    return getPriority(a) - getPriority(b);
                });
                spinner.succeed(`Found ${prioritizedIssues.length} issues to process`);
                return prioritizedIssues.slice(0, options.maxIssues).map(i => i.number);
            };
            // Initial batch
            issuesToProcess = await processIssuesBatch();
            // Set up polling for continuous processing
            if (options.pollInterval > 0) {
                setInterval(async () => {
                    console.log(chalk_1.default.cyan(`\n⏰ Checking for new issues (next check in ${options.pollInterval} minutes)...\n`));
                    const newIssues = await processIssuesBatch();
                    if (newIssues.length > 0) {
                        // Process new batch
                        for (const issueNum of newIssues) {
                            await processIssue(issueNum);
                        }
                    }
                }, options.pollInterval * 60 * 1000);
            }
        }
        else if (options.issue) {
            // Single issue mode
            issuesToProcess = [options.issue];
        }
        else {
            throw new Error('Please specify an issue number (-i), use interactive mode (--interactive), or automated mode (--auto)');
        }
        // Function to process a single issue
        const processIssue = async (issueNumber) => {
            try {
                spinner.start(`Processing issue #${issueNumber}...`);
                // Create GitHub orchestrator
                const githubOrchestrator = new GitHubOrchestrator({
                    owner,
                    repo,
                    token,
                    createPR: options.createPr,
                    semanticCommits: options.semanticCommits,
                    baseBranch: options.baseBranch,
                }, baseLogger);
                // Convert issue to mission
                const mission = await githubOrchestrator.createMissionFromIssue(issueNumber);
                spinner.succeed(`Created mission from issue #${issueNumber}: ${mission.title}`);
                console.log(chalk_1.default.gray(`Description: ${mission.description}`));
                console.log(chalk_1.default.gray(`DoD Criteria: ${mission.definitionOfDone.length} items`));
                // Load config
                const config = await (0, config_loader_1.loadConfig)('.cco/config.yaml');
                // Initialize session manager
                const sessionManager = new session_manager_1.SessionManager('.cco/sessions', baseLogger);
                // Initialize LLM clients
                let openRouterClient = null;
                let claudeCodeClient = null;
                // Always initialize both clients for GitHub integration
                if (process.env.OPENROUTER_API_KEY) {
                    console.log(chalk_1.default.gray(`Initializing OpenRouter client with API key (${process.env.OPENROUTER_API_KEY.substring(0, 10)}...)`));
                    openRouterClient = new openrouter_client_1.OpenRouterClient({
                        apiKey: process.env.OPENROUTER_API_KEY,
                        model: config.openrouter?.model || 'claude-3-opus',
                        temperature: config.openrouter?.temperature || 0.7,
                        maxTokens: 100000,
                        baseURL: 'https://openrouter.ai/api/v1',
                        retryAttempts: 3,
                        retryDelay: 1000
                    }, baseLogger);
                }
                else {
                    console.log(chalk_1.default.yellow('No OpenRouter API key found'));
                }
                if (process.env.ANTHROPIC_API_KEY || config.claude_code?.use_subscription) {
                    claudeCodeClient = new claude_code_sdk_client_1.ClaudeCodeSDKClient({
                        apiKey: process.env.ANTHROPIC_API_KEY,
                        model: 'claude-opus-4-1-20250805',
                        temperature: 0.3,
                        projectPath: mission.repository,
                        maxTurns: config.orchestrator.max_iterations,
                        planMode: false,
                        jsonMode: false
                    }, baseLogger);
                }
                // Check if we have at least one client
                if (!openRouterClient && !claudeCodeClient) {
                    throw new Error('No LLM client available. Please set OPENROUTER_API_KEY or ANTHROPIC_API_KEY in your .env file');
                }
                // Create orchestrator
                const orchestrator = new orchestrator_1.Orchestrator({
                    mission,
                    openRouterClient: openRouterClient,
                    claudeCodeClient: claudeCodeClient,
                    sessionManager,
                    logger: logger,
                    checkpointInterval: config.orchestrator.checkpoint_interval,
                    maxIterations: config.orchestrator.max_iterations,
                    interactive: process.stdout.isTTY,
                    enableTelemetry: config.monitoring?.enable_telemetry
                });
                // Start orchestration
                console.log(chalk_1.default.cyan(`\n🚀 Starting orchestration for issue #${issueNumber}...\n`));
                const result = await orchestrator.orchestrate();
                if (result.success) {
                    console.log(chalk_1.default.green(`\n✅ Issue #${issueNumber} completed successfully!`));
                    // Create PR if requested
                    if (options.createPr) {
                        spinner.start('Creating pull request...');
                        const prUrl = await githubOrchestrator.createPRFromMission(mission, result);
                        spinner.succeed(`Pull request created: ${prUrl}`);
                    }
                }
                else {
                    console.log(chalk_1.default.yellow(`\n⚠️ Issue #${issueNumber} partially completed`));
                    console.log(chalk_1.default.gray(`Progress: ${result.metrics.completionPercentage}%`));
                }
                return result.success;
            }
            catch (error) {
                spinner.fail(`Failed to process issue #${issueNumber}`);
                console.error(chalk_1.default.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
                return false;
            }
        };
        // Process all selected issues
        let successCount = 0;
        for (const issueNum of issuesToProcess) {
            const success = await processIssue(issueNum);
            if (success)
                successCount++;
        }
        if (issuesToProcess.length > 1) {
            console.log(chalk_1.default.blue(`\n📊 Summary: ${successCount}/${issuesToProcess.length} issues completed successfully`));
        }
    }
    catch (error) {
        spinner.fail('GitHub orchestration failed');
        const ccoError = errors_1.ErrorHandler.handle(error);
        logger.error('GitHub orchestration failed', ccoError);
        console.error(errors_1.ErrorHandler.format(ccoError));
        process.exit(1);
    }
});
program.parse(process.argv);
//# sourceMappingURL=index.js.map