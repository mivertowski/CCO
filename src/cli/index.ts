#!/usr/bin/env node

// Suppress NODE_TLS_REJECT_UNAUTHORIZED warning if it exists
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  process.removeAllListeners('warning');
  process.on('warning', (warning) => {
    if (!warning.message.includes('NODE_TLS_REJECT_UNAUTHORIZED')) {
      console.warn(warning);
    }
  });
}

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createLogger, createEnhancedLogger } from '../monitoring/logger';
import { MissionParser } from '../core/mission-parser';
import { Orchestrator } from '../core/orchestrator';
import { SessionManager } from '../core/session-manager';
import { OpenRouterClient } from '../llm/openrouter-client';
import { ClaudeCodeClient } from '../llm/claude-code-client';
import { ClaudeCodeSDKClient } from '../llm/claude-code-sdk-client';
import { IClaudeCodeClient } from '../llm/claude-code-interface';
import { loadConfig } from '../config/config-loader';
import { ErrorHandler } from '../utils/errors';
import inquirer from 'inquirer';

// Load environment variables
dotenv.config();

const program = new Command();
const baseLogger = createLogger();
const logger = createEnhancedLogger('.cco/logs');

program
  .name('cco')
  .description('Claude Code Orchestrator - Automated orchestration for Claude Code')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize CCO in the current directory')
  .option('-m, --mission <path>', 'Path to mission file')
  .action(async (options) => {
    const spinner = ora('Initializing CCO...').start();
    
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
      
      spinner.succeed(chalk.green('CCO initialized successfully'));
      
      if (options.mission) {
        console.log(chalk.blue(`Mission file: ${options.mission}`));
      } else {
        console.log(chalk.yellow('No mission file specified. Use --mission flag or create mission.yaml'));
      }
      
    } catch (error) {
      const ccoError = ErrorHandler.handle(error);
      logger.error('Initialization failed', ccoError);
      spinner.fail(chalk.red('Failed to initialize CCO'));
      console.error(ErrorHandler.format(ccoError));
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
    const spinner = ora('Starting orchestration...').start();
    
    try {
      // Check for required environment variables
      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY environment variable is required');
      }
      
      // Load configuration
      spinner.text = 'Loading configuration...';
      const config = await loadConfig(options.config);
      
      // Only require Anthropic API key if not using subscription
      if (!config.claude_code?.use_subscription && !process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required (or set use_subscription: true in config)');
      }
      
      // Parse mission
      spinner.text = 'Parsing mission file...';
      const missionParser = new MissionParser(baseLogger);
      const mission = await missionParser.parseMissionFile(options.mission);
      
      // Validate mission
      const validation = missionParser.validateMission(mission);
      if (!validation.valid) {
        throw new Error(`Invalid mission: ${validation.errors?.join(', ')}`);
      }
      
      spinner.succeed(chalk.green('Mission loaded successfully'));
      console.log(chalk.blue(`Mission: ${mission.title}`));
      console.log(chalk.gray(`Repository: ${mission.repository}`));
      console.log(chalk.gray(`DoD Criteria: ${mission.definitionOfDone.length}`));
      
      // Initialize components
      const sessionManager = new SessionManager(
        config.persistence.path,
        baseLogger
      );
      
      // Create enhanced logger for orchestration
      const orchLogger = logger.child({
        missionId: mission.id,
        missionTitle: mission.title
      });
      
      const openRouterClient = new OpenRouterClient(
        {
          apiKey: process.env.OPENROUTER_API_KEY,
          model: config.openrouter.model,
          temperature: config.openrouter.temperature,
          maxTokens: 4096,
          baseURL: 'https://openrouter.ai/api/v1',
          retryAttempts: 3,
          retryDelay: 1000
        },
        baseLogger
      );
      
      // Choose between SDK and legacy client
      let claudeCodeClient: IClaudeCodeClient;
      
      if (options.useSdk || config.claude_code?.use_sdk) {
        // Use the new SDK client (recommended)
        claudeCodeClient = new ClaudeCodeSDKClient(
          {
            apiKey: process.env.ANTHROPIC_API_KEY,
            projectPath: mission.repository,
            maxTurns: Math.min(config.orchestrator.max_iterations, 10), // SDK has turn limits
            model: 'claude-3-5-sonnet-20241022', // Latest model
            temperature: 0.3,
            systemPrompt: `Working on mission: ${mission.title}`,
            planMode: false, // Execute mode
            jsonMode: false
          },
          baseLogger
        );
      } else {
        // Legacy client (for backward compatibility)
        claudeCodeClient = new ClaudeCodeClient(
          {
            apiKey: process.env.ANTHROPIC_API_KEY,
            useSubscription: config.claude_code?.use_subscription || false,
            projectPath: mission.repository,
            maxIterations: config.orchestrator.max_iterations,
            model: 'claude-opus-4-1-20250805',
            temperature: 0.3,
            timeoutMs: 300000,
            contextWindow: 200000
          },
          baseLogger
        );
      }
      
      // Create orchestrator
      const orchestrator = new Orchestrator({
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
      console.log(chalk.cyan('\n🚀 Starting orchestration...\n'));
      
      const result = await orchestrator.orchestrate();
      
      if (result.success) {
        console.log(chalk.green('\n✅ Mission completed successfully!'));
        console.log(chalk.gray(`Total iterations: ${result.metrics.totalIterations}`));
        console.log(chalk.gray(`Completion: ${result.metrics.completionPercentage}%`));
        console.log(chalk.gray(`Artifacts created: ${result.artifacts.length}`));
      } else {
        console.log(chalk.yellow('\n⚠️ Mission partially completed'));
        console.log(chalk.gray(`Progress: ${result.metrics.completionPercentage}%`));
        console.log(chalk.gray(`Completed criteria: ${result.metrics.dodCriteriaCompleted}/${result.metrics.dodCriteriaTotal}`));
      }
      
    } catch (error) {
      const ccoError = ErrorHandler.handle(error);
      logger.error('Orchestration failed', ccoError);
      spinner.fail(chalk.red('Orchestration failed'));
      console.error(ErrorHandler.format(ccoError));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check status of current orchestration')
  .option('-s, --session <id>', 'Session ID to check')
  .action(async (options) => {
    try {
      const sessionManager = new SessionManager('.cco/sessions', baseLogger);
      
      if (options.session) {
        const session = await sessionManager.loadSession(options.session);
        if (session) {
          console.log(chalk.blue(`Session: ${session.sessionId}`));
          console.log(chalk.gray(`Mission: ${session.missionId}`));
          console.log(chalk.gray(`Phase: ${session.currentPhase}`));
          console.log(chalk.gray(`Iterations: ${session.iterations}`));
          console.log(chalk.gray(`Completed tasks: ${session.completedTasks.length}`));
        } else {
          console.log(chalk.red(`Session ${options.session} not found`));
        }
      } else {
        const sessions = await sessionManager.listSessions();
        if (sessions.length === 0) {
          console.log(chalk.yellow('No active sessions found'));
        } else {
          console.log(chalk.blue('Active sessions:'));
          for (const session of sessions) {
            console.log(chalk.gray(`  - ${session.sessionId} (${session.currentPhase})`));
          }
        }
      }
    } catch (error) {
      const ccoError = ErrorHandler.handle(error);
      logger.error('Status check failed', ccoError);
      console.error(chalk.red('Failed to get status'));
      console.error(ErrorHandler.format(ccoError));
      process.exit(1);
    }
  });

program
  .command('resume')
  .description('Resume a paused orchestration')
  .option('-s, --session <id>', 'Session ID to resume')
  .action(async (options) => {
    try {
      const sessionManager = new SessionManager('.cco/sessions', baseLogger);
      
      let sessionId = options.session;
      
      if (!sessionId) {
        const sessions = await sessionManager.listSessions();
        if (sessions.length === 0) {
          console.log(chalk.yellow('No sessions to resume'));
          return;
        }
        
        const choices = sessions.map(s => ({
          name: `${s.sessionId.substring(0, 8)} - ${s.currentPhase} (${s.iterations} iterations)`,
          value: s.sessionId
        }));
        
        const answer = await inquirer.prompt([
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
      console.log(chalk.green(`Resuming session ${sessionId}`));
      console.log(chalk.gray(`Current phase: ${session.currentPhase}`));
      console.log(chalk.gray(`Iterations: ${session.iterations}`));
      
      // TODO: Implement resume logic
      console.log(chalk.yellow('Resume functionality coming soon...'));
      
    } catch (error) {
      console.error(chalk.red('Failed to resume session'));
      console.error(error);
      process.exit(1);
    }
  });

program
  .command('dashboard')
  .description('Open the monitoring dashboard')
  .option('-p, --port <port>', 'Dashboard port', '8080')
  .action(async (options) => {
    console.log(chalk.blue(`Opening dashboard on port ${options.port}...`));
    console.log(chalk.yellow('Dashboard functionality coming soon...'));
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
    const spinner = ora('Initializing GitHub integration...').start();
    
    try {
      // Import GitHub integration components
      const { GitHubOrchestrator } = await import('../integrations/github/github-orchestrator');
      const { GitHubClient } = await import('../integrations/github/github-client');
      
      // Parse repository from option or config
      let owner: string, repo: string;
      if (options.repository) {
        const parts = options.repository.split('/');
        if (parts.length !== 2) {
          throw new Error('Repository must be in owner/repo format');
        }
        [owner, repo] = parts;
      } else {
        // Try to get from git remote
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        try {
          const { stdout } = await execAsync('git remote get-url origin');
          const cleanUrl = stdout.trim();
          // Handle both HTTPS and SSH URLs
          const match = cleanUrl.match(/github\.com[:/]([^/]+)\/([^/\s]+?)(?:\.git)?$/);
          if (match) {
            owner = match[1];
            repo = match[2].replace(/\.git$/, ''); // Remove .git if present
          } else {
            throw new Error('Could not parse GitHub repository from remote');
          }
        } catch {
          throw new Error('Repository not specified and could not detect from git remote');
        }
      }
      
      // Get GitHub token
      const token = options.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
      if (!token) {
        spinner.warn('No GitHub token found, will attempt to use GitHub CLI');
      }
      
      // Handle different modes
      let issuesToProcess: number[] = [];
      
      if (options.interactive) {
        // Interactive mode - let user select issues
        spinner.text = 'Fetching open issues...';
        
        const githubClient = new GitHubClient(
          { owner, repo, token },
          baseLogger
        );
        
        const labelFilter = options.labels ? options.labels.split(',').map((l: string) => l.trim()) : undefined;
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
          const getPriority = (issue: any) => {
            const labels = issue.labels.map((l: any) => l.name.toLowerCase());
            if (labels.includes('priority:critical') || labels.includes('p0')) return 0;
            if (labels.includes('priority:high') || labels.includes('p1')) return 1;
            if (labels.includes('priority:medium') || labels.includes('p2')) return 2;
            if (labels.includes('priority:low') || labels.includes('p3')) return 3;
            return 4;
          };
          return getPriority(a) - getPriority(b);
        });
        
        // Display issues with formatting
        console.log(chalk.blue('\n📋 Open Issues:\n'));
        const choices = prioritizedIssues.map(issue => {
          const labels = issue.labels.map((l: any) => l.name).join(', ');
          const priority = labels.includes('critical') || labels.includes('p0') ? '🔴' :
                          labels.includes('high') || labels.includes('p1') ? '🟠' :
                          labels.includes('medium') || labels.includes('p2') ? '🟡' :
                          labels.includes('low') || labels.includes('p3') ? '🟢' : '⚪';
          
          return {
            name: `${priority} #${issue.number}: ${issue.title}${labels ? chalk.gray(` [${labels}]`) : ''}`,
            value: issue.number,
            short: `#${issue.number}`
          };
        });
        
        const answers = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'selectedIssues',
            message: 'Select issues to process (space to select, enter to confirm):',
            choices,
            validate: (input) => input.length > 0 || 'Please select at least one issue'
          }
        ]);
        
        issuesToProcess = answers.selectedIssues;
        
      } else if (options.auto) {
        // Automated mode - process issues by priority continuously
        console.log(chalk.cyan('\n🤖 Starting automated issue processing...\n'));
        console.log(chalk.gray(`Polling interval: ${options.pollInterval} minutes`));
        console.log(chalk.gray(`Max issues per run: ${options.maxIssues}`));
        if (options.labels) {
          console.log(chalk.gray(`Label filter: ${options.labels}`));
        }
        
        const processIssuesBatch = async () => {
          spinner.start('Checking for new issues...');
          
          const githubClient = new GitHubClient(
            { owner, repo, token },
            baseLogger
          );
          
          const labelFilter = options.labels ? options.labels.split(',').map((l: string) => l.trim()) : undefined;
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
            const getPriority = (issue: any) => {
              const labels = issue.labels.map((l: any) => l.name.toLowerCase());
              if (labels.includes('priority:critical') || labels.includes('p0')) return 0;
              if (labels.includes('priority:high') || labels.includes('p1')) return 1;
              if (labels.includes('priority:medium') || labels.includes('p2')) return 2;
              if (labels.includes('priority:low') || labels.includes('p3')) return 3;
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
            console.log(chalk.cyan(`\n⏰ Checking for new issues (next check in ${options.pollInterval} minutes)...\n`));
            const newIssues = await processIssuesBatch();
            if (newIssues.length > 0) {
              // Process new batch
              for (const issueNum of newIssues) {
                await processIssue(issueNum);
              }
            }
          }, options.pollInterval * 60 * 1000);
        }
        
      } else if (options.issue) {
        // Single issue mode
        issuesToProcess = [options.issue];
      } else {
        throw new Error('Please specify an issue number (-i), use interactive mode (--interactive), or automated mode (--auto)');
      }
      
      // Function to process a single issue
      const processIssue = async (issueNumber: number) => {
        try {
          spinner.start(`Processing issue #${issueNumber}...`);
          
          // Create GitHub orchestrator
          const githubOrchestrator = new GitHubOrchestrator(
            {
              owner,
              repo,
              token,
              createPR: options.createPr,
              semanticCommits: options.semanticCommits,
              baseBranch: options.baseBranch,
            },
            baseLogger
          );
          
          // Convert issue to mission
          const mission = await githubOrchestrator.createMissionFromIssue(issueNumber);
          
          spinner.succeed(`Created mission from issue #${issueNumber}: ${mission.title}`);
          console.log(chalk.gray(`Description: ${mission.description}`));
          console.log(chalk.gray(`DoD Criteria: ${mission.definitionOfDone.length} items`));
          
          // Load config
          const config = await loadConfig('.cco/config.yaml');
          
          // Initialize session manager
          const sessionManager = new SessionManager('.cco/sessions', baseLogger);
          
          // Initialize LLM clients
          let openRouterClient = null;
          let claudeCodeClient = null;
          
          // Always initialize both clients for GitHub integration
          if (process.env.OPENROUTER_API_KEY) {
            console.log(chalk.gray(`Initializing OpenRouter client with API key (${process.env.OPENROUTER_API_KEY.substring(0, 10)}...)`));
            openRouterClient = new OpenRouterClient(
              {
                apiKey: process.env.OPENROUTER_API_KEY,
                model: config.openrouter?.model || 'claude-3-opus',
                temperature: config.openrouter?.temperature || 0.7,
                maxTokens: 100000,
                baseURL: 'https://openrouter.ai/api/v1',
                retryAttempts: 3,
                retryDelay: 1000
              },
              baseLogger
            );
          } else {
            console.log(chalk.yellow('No OpenRouter API key found'));
          }
          
          if (process.env.ANTHROPIC_API_KEY || config.claude_code?.use_subscription) {
            claudeCodeClient = new ClaudeCodeSDKClient(
              {
                apiKey: process.env.ANTHROPIC_API_KEY,
                model: 'claude-opus-4-1-20250805',
                temperature: 0.3,
                projectPath: mission.repository,
                maxTurns: config.orchestrator.max_iterations,
                planMode: false,
                jsonMode: false
              },
              baseLogger
            );
          }
          
          // Check if we have at least one client
          if (!openRouterClient && !claudeCodeClient) {
            throw new Error('No LLM client available. Please set OPENROUTER_API_KEY or ANTHROPIC_API_KEY in your .env file');
          }
          
          // Create orchestrator
          const orchestrator = new Orchestrator({
            mission,
            openRouterClient: openRouterClient!,
            claudeCodeClient: claudeCodeClient as IClaudeCodeClient,
            sessionManager,
            logger: logger,
            checkpointInterval: config.orchestrator.checkpoint_interval,
            maxIterations: config.orchestrator.max_iterations,
            interactive: process.stdout.isTTY,
            enableTelemetry: config.monitoring?.enable_telemetry
          });
          
          // Start orchestration
          console.log(chalk.cyan(`\n🚀 Starting orchestration for issue #${issueNumber}...\n`));
          
          const result = await orchestrator.orchestrate();
          
          if (result.success) {
            console.log(chalk.green(`\n✅ Issue #${issueNumber} completed successfully!`));
            
            // Create PR if requested
            if (options.createPr) {
              spinner.start('Creating pull request...');
              const prUrl = await githubOrchestrator.createPRFromMission(mission, result);
              spinner.succeed(`Pull request created: ${prUrl}`);
            }
          } else {
            console.log(chalk.yellow(`\n⚠️ Issue #${issueNumber} partially completed`));
            console.log(chalk.gray(`Progress: ${result.metrics.completionPercentage}%`));
          }
          
          return result.success;
        } catch (error) {
          spinner.fail(`Failed to process issue #${issueNumber}`);
          console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
          return false;
        }
      };
      
      // Process all selected issues
      let successCount = 0;
      for (const issueNum of issuesToProcess) {
        const success = await processIssue(issueNum);
        if (success) successCount++;
      }
      
      if (issuesToProcess.length > 1) {
        console.log(chalk.blue(`\n📊 Summary: ${successCount}/${issuesToProcess.length} issues completed successfully`));
      }
      
    } catch (error) {
      spinner.fail('GitHub orchestration failed');
      const ccoError = ErrorHandler.handle(error);
      logger.error('GitHub orchestration failed', ccoError);
      console.error(ErrorHandler.format(ccoError));
      process.exit(1);
    }
  });

program.parse(process.argv);