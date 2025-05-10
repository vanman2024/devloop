#!/usr/bin/env node
/**
 * UI Safeguard CLI
 * 
 * Command-line interface for the UI Safeguard Agent, providing easy access
 * to snapshot, restore, and verification functions with a user-friendly interface.
 * 
 * Usage:
 *   node ui-safeguard-cli.js snapshot [component]
 *   node ui-safeguard-cli.js restore [snapshot-id]
 *   node ui-safeguard-cli.js verify [snapshot-id]
 *   node ui-safeguard-cli.js status
 *   node ui-safeguard-cli.js list
 *   node ui-safeguard-cli.js test [component]
 *   node ui-safeguard-cli.js monitor [--interval 30]
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Simple chalk-like color functionality since chalk is having module issues
const chalk = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  grey: (text) => `\x1b[90m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - path resolution with fallbacks for WSL case sensitivity
let AGENT_PATH = path.resolve(__dirname, '../../../../agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py');
let STORAGE_MANAGER_PATH = path.resolve(__dirname, '../../../../agents/system-health-agent/child-agents/ui-safeguard-agent/storage_manager.py');
const UI_TEST_RUNNER_PATH = path.resolve(__dirname, './ui-test-runner.js');

// Try alternative paths with lowercase if the default paths don't exist
if (!fs.existsSync(AGENT_PATH)) {
  const altPath = '/mnt/c/Users/angel/devloop/agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py';
  if (fs.existsSync(altPath)) {
    console.log(`Using alternative path for agent: ${altPath}`);
    AGENT_PATH = altPath;
  }
}

if (!fs.existsSync(STORAGE_MANAGER_PATH)) {
  const altPath = '/mnt/c/Users/angel/devloop/agents/system-health-agent/child-agents/ui-safeguard-agent/storage_manager.py';
  if (fs.existsSync(altPath)) {
    console.log(`Using alternative path for storage manager: ${altPath}`);
    STORAGE_MANAGER_PATH = altPath;
  }
}

// ASCII Art for CLI
const ASCII_ART = `
  _   _ ___   ____        __                              _ 
 | | | |_ _| / ___|  __ _/ _| ___  __ _ _   _  __ _ _ __ | |
 | | | || |  \\___ \\ / _\` | |_ / _ \\/ _\` | | | |/ _\` | '_ \\| |
 | |_| || |   ___) | (_| |  _|  __/ (_| | |_| | (_| | | | |_|
  \\___/|___| |____/ \\__,_|_|  \\___|\\__, |\\__,_|\\__,_|_| |_(_)
                                   |___/                     
`;

// Check if agent exists
if (!fs.existsSync(AGENT_PATH)) {
  console.error(chalk.red(`Error: UI Safeguard Agent not found at ${AGENT_PATH}`));
  process.exit(1);
}

// Run agent with specified command
function runAgent(command, args = [], verbose = true) {
  try {
    if (verbose) {
      console.log(chalk.blue(`Running: python3 ${AGENT_PATH} ${command} ${args.join(' ')}`));
    }
    
    const result = execSync(`python3 ${AGENT_PATH} ${command} ${args.join(' ')}`, {
      encoding: 'utf8',
      stdio: verbose ? 'inherit' : 'pipe'
    });
    
    return { success: true, output: result };
  } catch (error) {
    if (verbose) {
      console.error(chalk.red(`Error running agent: ${error.message}`));
    }
    return { success: false, error };
  }
}

// Run storage manager
function runStorageManager(command, args = [], verbose = true) {
  try {
    if (verbose) {
      console.log(chalk.blue(`Running: python3 ${STORAGE_MANAGER_PATH} ${command} ${args.join(' ')}`));
    }
    
    const result = execSync(`python3 ${STORAGE_MANAGER_PATH} ${command} ${args.join(' ')}`, {
      encoding: 'utf8',
      stdio: verbose ? 'inherit' : 'pipe'
    });
    
    return { success: true, output: result };
  } catch (error) {
    if (verbose) {
      console.error(chalk.red(`Error running storage manager: ${error.message}`));
    }
    return { success: false, error };
  }
}

// Run UI test runner
function runUITests(component = 'all', verbose = true) {
  try {
    if (verbose) {
      console.log(chalk.blue(`Running UI component tests for: ${component}`));
    }
    
    const result = execSync(`node ${UI_TEST_RUNNER_PATH} ${component}`, {
      encoding: 'utf8',
      stdio: verbose ? 'inherit' : 'pipe'
    });
    
    return { success: true, output: result };
  } catch (error) {
    if (verbose) {
      console.error(chalk.red(`Error running UI tests: ${error.message}`));
    }
    return { success: false, error };
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

// Display help if no command is provided
if (!command) {
  console.log(chalk.cyan(ASCII_ART));
  console.log(chalk.yellow('UI Safeguard CLI - Comprehensive UI snapshot and rollback utility\n'));
  console.log('Usage:');
  console.log('  node ui-safeguard-cli.js <command> [options]\n');
  console.log('Commands:');
  console.log('  snapshot [component]       Take a snapshot of component(s)');
  console.log('  restore <snapshot-id>      Restore from a snapshot');
  console.log('  verify [snapshot-id]       Verify against a snapshot');
  console.log('  status                     Check component status');
  console.log('  list                       List available snapshots');
  console.log('  storage                    Show storage statistics');
  console.log('  test [component]           Test UI component rendering');
  console.log('  monitor [--interval min]   Run monitoring in background');
  console.log('  interactive                Start interactive mode\n');
  console.log('Examples:');
  console.log('  node ui-safeguard-cli.js snapshot system-health');
  console.log('  node ui-safeguard-cli.js restore snapshot_20250501_123045');
  console.log('  node ui-safeguard-cli.js test all\n');
  
  process.exit(0);
}

// Handle commands
switch (command) {
  case 'snapshot':
    const component = args[1] || 'all';
    console.log(chalk.cyan(`Taking snapshot of ${component}...`));
    
    // Get optional description from --description or -d flag
    let description = null;
    const descIndex = args.findIndex(arg => arg === '--description' || arg === '-d');
    if (descIndex !== -1 && args.length > descIndex + 1) {
      description = args[descIndex + 1];
    }
    
    // Run with appropriate arguments
    const snapshotArgs = [component];
    if (description) {
      snapshotArgs.push('--description', `"${description}"`);
    }
    
    runAgent('snapshot', snapshotArgs);
    break;
    
  case 'restore':
    if (!args[1]) {
      console.error(chalk.red('Error: Snapshot ID required for restore'));
      console.log('Usage: node ui-safeguard-cli.js restore <snapshot-id>');
      console.log('Run "node ui-safeguard-cli.js list" to see available snapshots');
      process.exit(1);
    }
    
    console.log(chalk.cyan(`Restoring from snapshot ${args[1]}...`));
    runAgent('restore', [args[1]]);
    break;
    
  case 'verify':
    const snapshotId = args[1]; // Optional
    const verifyArgs = snapshotId ? [snapshotId] : [];
    
    console.log(chalk.cyan(`Verifying against ${snapshotId || 'latest'} snapshot...`));
    runAgent('verify', verifyArgs);
    break;
    
  case 'status':
    console.log(chalk.cyan('Checking component status...'));
    runAgent('status');
    break;
    
  case 'list':
    console.log(chalk.cyan('Listing available snapshots...'));
    runAgent('list');
    break;
    
  case 'storage':
    console.log(chalk.cyan('Getting storage statistics...'));
    runStorageManager('stats');
    break;
    
  case 'test':
    const testComponent = args[1] || 'all';
    console.log(chalk.cyan(`Testing UI component: ${testComponent}`));
    runUITests(testComponent);
    break;
    
  case 'monitor':
    // Parse interval from --interval or -i flag
    let interval = 60; // Default 60 minutes
    const intervalIndex = args.findIndex(arg => arg === '--interval' || arg === '-i');
    if (intervalIndex !== -1 && args.length > intervalIndex + 1) {
      interval = parseInt(args[intervalIndex + 1], 10);
      if (isNaN(interval) || interval <= 0) {
        console.error(chalk.red('Invalid interval. Using default 60 minutes.'));
        interval = 60;
      }
    }
    
    console.log(chalk.cyan(`Starting monitoring with ${interval} minute interval...`));
    runAgent('monitor', ['--interval', interval.toString()]);
    break;
    
  case 'interactive':
    startInteractiveMode();
    break;
    
  default:
    console.error(chalk.red(`Unknown command: ${command}`));
    console.log('Run without arguments for usage information');
    process.exit(1);
}

function startInteractiveMode() {
  console.log(chalk.cyan(ASCII_ART));
  console.log(chalk.yellow('UI Safeguard Interactive Mode'));
  console.log(chalk.grey('Type "help" for commands, "exit" to quit\n'));
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('ui-safeguard> ')
  });
  
  rl.prompt();
  
  rl.on('line', (line) => {
    const args = line.trim().split(/\s+/);
    const command = args[0].toLowerCase();
    
    switch (command) {
      case 'help':
        console.log(chalk.yellow('\nAvailable commands:'));
        console.log('  snapshot [component]       Take a snapshot of component(s)');
        console.log('  restore <snapshot-id>      Restore from a snapshot');
        console.log('  verify [snapshot-id]       Verify against a snapshot');
        console.log('  status                     Check component status');
        console.log('  list                       List available snapshots');
        console.log('  storage                    Show storage statistics');
        console.log('  test [component]           Test UI component rendering');
        console.log('  monitor [interval]         Run monitoring (Ctrl+C to stop)');
        console.log('  help                       Show this help');
        console.log('  exit                       Exit interactive mode\n');
        break;
        
      case 'snapshot':
        const component = args[1] || 'all';
        
        // Get optional description
        let description = null;
        const descIndex = args.findIndex(arg => arg === '--description' || arg === '-d');
        if (descIndex !== -1 && args.length > descIndex + 1) {
          description = args.slice(descIndex + 1).join(' ');
        }
        
        console.log(chalk.cyan(`Taking snapshot of ${component}...`));
        
        // Run with appropriate arguments
        const snapshotArgs = [component];
        if (description) {
          snapshotArgs.push('--description', `"${description}"`);
        }
        
        runAgent('snapshot', snapshotArgs);
        break;
        
      case 'restore':
        if (!args[1]) {
          console.error(chalk.red('Error: Snapshot ID required for restore'));
          console.log('Usage: restore <snapshot-id>');
          console.log('Run "list" to see available snapshots');
          break;
        }
        
        console.log(chalk.cyan(`Restoring from snapshot ${args[1]}...`));
        runAgent('restore', [args[1]]);
        break;
        
      case 'verify':
        const snapshotId = args[1]; // Optional
        const verifyArgs = snapshotId ? [snapshotId] : [];
        
        console.log(chalk.cyan(`Verifying against ${snapshotId || 'latest'} snapshot...`));
        runAgent('verify', verifyArgs);
        break;
        
      case 'status':
        console.log(chalk.cyan('Checking component status...'));
        runAgent('status');
        break;
        
      case 'list':
        console.log(chalk.cyan('Listing available snapshots...'));
        runAgent('list');
        break;
        
      case 'storage':
        console.log(chalk.cyan('Getting storage statistics...'));
        runStorageManager('stats');
        break;
        
      case 'test':
        const testComponent = args[1] || 'all';
        console.log(chalk.cyan(`Testing UI component: ${testComponent}`));
        runUITests(testComponent);
        break;
        
      case 'monitor':
        let interval = parseInt(args[1], 10) || 60;
        
        console.log(chalk.cyan(`Starting monitoring with ${interval} minute interval...`));
        console.log(chalk.grey('Press Ctrl+C to stop monitoring'));
        
        // Start monitoring (will block the interactive mode until Ctrl+C)
        runAgent('monitor', ['--interval', interval.toString()]);
        break;
        
      case 'exit':
      case 'quit':
        console.log(chalk.cyan('Exiting UI Safeguard Interactive Mode'));
        rl.close();
        process.exit(0);
        break;
        
      case '':
        // Empty line, just re-prompt
        break;
        
      default:
        console.log(chalk.red(`Unknown command: ${command}`));
        console.log('Type "help" for available commands');
        break;
    }
    
    rl.prompt();
  }).on('close', () => {
    console.log(chalk.cyan('\nExiting UI Safeguard Interactive Mode'));
    process.exit(0);
  });
}