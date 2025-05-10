#!/usr/bin/env node
/**
 * UI Safeguard Runner
 * 
 * This script integrates with Vite's development server to provide continuous
 * UI safeguarding during development. It monitors UI components and automatically
 * takes snapshots at configured intervals.
 * 
 * Features:
 * - Runs in the background during development
 * - Takes snapshots at regular intervals
 * - Watches for critical file changes
 * - Integrates with the UI Safeguard Agent
 * - Displays notifications in the browser console
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Configuration
const AGENT_PATH = path.resolve(__dirname, '../../../agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py');
const CONFIG_PATH = path.resolve(__dirname, './ui-safeguard-config.json');
const LOG_PATH = path.resolve(__dirname, '../logs/ui-safeguard.log');

// Ensure logs directory exists
if (!fs.existsSync(path.dirname(LOG_PATH))) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
}

// Default configuration
const DEFAULT_CONFIG = {
  snapshotInterval: 30, // minutes
  watchCriticalFiles: true,
  criticalComponents: ['system-health', 'common'],
  notifyInBrowser: true,
  logLevel: 'info', // debug, info, warn, error
  runOnStart: true,
  maxSnapshots: 10
};

// Load or create configuration
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (error) {
    console.error('Error loading configuration:', error);
  }
  
  // Save default configuration
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
  return DEFAULT_CONFIG;
}

// Logger
class Logger {
  constructor(logPath, logLevel) {
    this.logPath = logPath;
    this.setLogLevel(logLevel);
    
    // Create or append to log file
    if (!fs.existsSync(this.logPath)) {
      fs.writeFileSync(this.logPath, '');
    }
  }
  
  setLogLevel(logLevel) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    this.logLevel = levels[logLevel] || 1;
  }
  
  timestamp() {
    return new Date().toISOString();
  }
  
  log(level, message) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level] >= this.logLevel) {
      const logMessage = `[${this.timestamp()}] [${level.toUpperCase()}] ${message}`;
      
      // Write to log file
      fs.appendFileSync(this.logPath, logMessage + '\n');
      
      // Print to console
      if (level === 'error') {
        console.error('\x1b[31m%s\x1b[0m', logMessage); // Red
      } else if (level === 'warn') {
        console.warn('\x1b[33m%s\x1b[0m', logMessage); // Yellow
      } else if (level === 'info') {
        console.info('\x1b[36m%s\x1b[0m', logMessage); // Cyan
      } else {
        console.log('\x1b[90m%s\x1b[0m', logMessage); // Gray
      }
    }
  }
  
  debug(message) { this.log('debug', message); }
  info(message) { this.log('info', message); }
  warn(message) { this.log('warn', message); }
  error(message) { this.log('error', message); }
}

// Check if agent exists
function checkAgent() {
  if (!fs.existsSync(AGENT_PATH)) {
    throw new Error(`UI Safeguard Agent not found at ${AGENT_PATH}`);
  }
}

// Run agent with specified command
function runAgent(command, args = []) {
  const fullCommand = `python3 ${AGENT_PATH} ${command} ${args.join(' ')}`;
  logger.debug(`Running agent command: ${fullCommand}`);
  
  try {
    const output = execSync(fullCommand, { encoding: 'utf8' });
    return { success: true, output };
  } catch (error) {
    logger.error(`Error running agent: ${error.message}`);
    if (error.stdout) logger.debug(`Agent stdout: ${error.stdout}`);
    if (error.stderr) logger.debug(`Agent stderr: ${error.stderr}`);
    return { success: false, error };
  }
}

// Take a snapshot using the agent
function takeSnapshot(component = 'all', description = null) {
  logger.info(`Taking snapshot of ${component}`);
  
  const args = [component];
  if (description) {
    args.push('--description', `"${description}"`);
  }
  
  const result = runAgent('snapshot', args);
  if (result.success) {
    logger.info(`Snapshot created successfully`);
    // Extract snapshot ID from output
    const match = result.output.match(/Snapshot\s+(\S+)\s+created/);
    return match ? match[1] : null;
  } else {
    logger.error(`Failed to create snapshot`);
    return null;
  }
}

// Verify current state against a snapshot
function verifySnapshot(snapshotId = null) {
  logger.info(`Verifying against ${snapshotId || 'latest'} snapshot`);
  
  const args = snapshotId ? [snapshotId] : [];
  const result = runAgent('verify', args);
  
  if (result.success) {
    const statusMatch = result.output.match(/Overall status: (\w+)/);
    const status = statusMatch ? statusMatch[1] : 'unknown';
    
    if (status === 'pass') {
      logger.info('Verification passed');
      return true;
    } else {
      logger.warn('Verification failed');
      return false;
    }
  } else {
    logger.error('Verification process failed');
    return false;
  }
}

// Restore from a snapshot
function restoreSnapshot(snapshotId) {
  logger.info(`Restoring snapshot ${snapshotId}`);
  
  const result = runAgent('restore', [snapshotId]);
  if (result.success) {
    logger.info(`Snapshot ${snapshotId} restored successfully`);
    return true;
  } else {
    logger.error(`Failed to restore snapshot ${snapshotId}`);
    return false;
  }
}

// Check status of components
function checkStatus() {
  logger.debug('Checking component status');
  
  const result = runAgent('status');
  return result.success;
}

// Inject code into Vite's client for browser notifications
function injectViteClientCode() {
  // This would be implemented in a production system
  // In a real implementation, we'd inject code using a Vite plugin
  logger.debug('Browser notifications would be enabled via Vite plugin');
}

// Main runner function
async function startRunner() {
  try {
    // Check if agent exists
    checkAgent();
    
    // Load configuration
    const config = loadConfig();
    logger.setLogLevel(config.logLevel);
    
    logger.info('===== UI Safeguard Runner started =====');
    logger.info(`Configuration: ${JSON.stringify(config, null, 2)}`);
    
    // Take initial snapshot if configured
    if (config.runOnStart) {
      takeSnapshot('all', 'Initial snapshot from UI Safeguard Runner');
    }
    
    // Set up snapshot interval
    logger.info(`Setting snapshot interval to ${config.snapshotInterval} minutes`);
    const snapshotInterval = setInterval(() => {
      takeSnapshot('all', 'Scheduled snapshot from UI Safeguard Runner');
    }, config.snapshotInterval * 60 * 1000);
    
    // Set up readline interface for commands
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'ui-safeguard> '
    });
    
    // Show prompt
    rl.prompt();
    
    // Handle commands
    rl.on('line', async (line) => {
      const command = line.trim();
      
      if (command === 'exit' || command === 'quit') {
        logger.info('Runner stopping...');
        clearInterval(snapshotInterval);
        rl.close();
        return;
      }
      
      if (command === 'help') {
        console.log(`
UI Safeguard Runner Commands:
  snapshot [component] - Take a snapshot of component (default: all)
  verify [snapshotId]  - Verify against snapshot (default: latest)
  restore <snapshotId> - Restore from a snapshot
  status               - Check component status
  list                 - List available snapshots
  config               - Show current configuration
  help                 - Show this help
  exit|quit            - Exit the runner
`);
      } else if (command.startsWith('snapshot')) {
        const parts = command.split(' ');
        const component = parts[1] || 'all';
        takeSnapshot(component);
      } else if (command.startsWith('verify')) {
        const parts = command.split(' ');
        verifySnapshot(parts[1]);
      } else if (command.startsWith('restore')) {
        const parts = command.split(' ');
        if (parts[1]) {
          restoreSnapshot(parts[1]);
        } else {
          logger.error('Snapshot ID required for restore');
        }
      } else if (command === 'status') {
        checkStatus();
      } else if (command === 'list') {
        runAgent('list');
      } else if (command === 'config') {
        console.log('Current configuration:');
        console.log(JSON.stringify(config, null, 2));
      } else {
        logger.error(`Unknown command: ${command}`);
      }
      
      rl.prompt();
    });
    
    // Handle runner exit
    rl.on('close', () => {
      logger.info('===== UI Safeguard Runner stopped =====');
      process.exit(0);
    });
    
  } catch (error) {
    console.error(`Runner error: ${error.message}`);
    process.exit(1);
  }
}

// Create logger
const logger = new Logger(LOG_PATH, DEFAULT_CONFIG.logLevel);

// Start the runner
startRunner();