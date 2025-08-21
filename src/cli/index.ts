#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createLogger } from '../monitoring/logger';
import { MissionParser } from '../core/mission-parser';
import { Orchestrator } from '../core/orchestrator';
import { SessionManager } from '../core/session-manager';
import { OpenRouterClient } from '../llm/openrouter-client';
import { ClaudeCodeClient } from '../llm/claude-code-client';
import { loadConfig } from '../config/config-loader';
import inquirer from 'inquirer';

// Load environment variables
dotenv.config();

const program = new Command();
const logger = createLogger();

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
  log_level: "INFO"
  log_path: ".cco/logs"
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
      spinner.fail(chalk.red('Failed to initialize CCO'));
      console.error(error);
      process.exit(1);
    }
  });

program
  .command('start')
  .description('Start orchestration with a mission')
  .option('-m, --mission <path>', 'Path to mission file', 'mission.yaml')
  .option('-c, --config <path>', 'Path to config file', '.cco/config.yaml')
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
      const missionParser = new MissionParser(logger);
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
        logger
      );
      
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
        logger
      );
      
      const claudeCodeClient = new ClaudeCodeClient(
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
        logger
      );
      
      // Create orchestrator
      const orchestrator = new Orchestrator({
        mission,
        openRouterClient,
        claudeCodeClient,
        sessionManager,
        logger,
        checkpointInterval: config.orchestrator.checkpoint_interval,
        maxIterations: config.orchestrator.max_iterations
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
      spinner.fail(chalk.red('Orchestration failed'));
      console.error(error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check status of current orchestration')
  .option('-s, --session <id>', 'Session ID to check')
  .action(async (options) => {
    try {
      const sessionManager = new SessionManager('.cco/sessions', logger);
      
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
      console.error(chalk.red('Failed to get status'));
      console.error(error);
      process.exit(1);
    }
  });

program
  .command('resume')
  .description('Resume a paused orchestration')
  .option('-s, --session <id>', 'Session ID to resume')
  .action(async (options) => {
    try {
      const sessionManager = new SessionManager('.cco/sessions', logger);
      
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

program.parse(process.argv);