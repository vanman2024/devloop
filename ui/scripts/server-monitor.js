#!/usr/bin/env node
/**
 * Server Monitor
 * 
 * Monitors the UI server for failures and automatically restarts it when needed.
 * Also provides real-time log streaming and basic health metrics.
 * 
 * Usage:
 *   node server-monitor.js start   # Start monitoring
 *   node server-monitor.js status  # Check server status
 *   node server-monitor.js logs    # Stream logs
 */

import { spawn, exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const rootDir = path.resolve(projectRoot, '../../../');

// Simple chalk-like color functionality
const chalk = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

// Configuration
const config = {
  serverPort: 8080,
  checkInterval: 10000, // 10 seconds
  restartDelay: 2000,   // 2 seconds
  maxRestarts: 5,       // Maximum restart attempts
  healthEndpoint: '/health',
  logFile: path.join(projectRoot, 'logs', 'ui-server.log'),
  pidFile: path.join(projectRoot, 'server.pid'),
  monitorPidFile: path.join(projectRoot, 'server-monitor.pid'),
  startScript: path.join(rootDir, 'start-ui.sh')
};

// Ensure logs directory exists
const logsDir = path.dirname(config.logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom logger that writes to console and file
class Logger {
  constructor(logFile) {
    this.logFile = logFile;
    
    // Create or append to log file
    fs.writeFileSync(this.logFile, '', { flag: 'a' });
  }
  
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    // Write to console with appropriate color
    let colorFn;
    switch (level) {
      case 'ERROR': colorFn = chalk.red; break;
      case 'WARN': colorFn = chalk.yellow; break;
      case 'SUCCESS': colorFn = chalk.green; break;
      case 'INFO': default: colorFn = chalk.blue; break;
    }
    
    console.log(colorFn(logMessage));
    
    // Write to log file
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }
  
  info(message) {
    this.log(message, 'INFO');
  }
  
  warn(message) {
    this.log(message, 'WARN');
  }
  
  error(message) {
    this.log(message, 'ERROR');
  }
  
  success(message) {
    this.log(message, 'SUCCESS');
  }
}

// Create logger
const logger = new Logger(config.logFile);

// Server health check
function checkServerHealth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: config.serverPort,
      path: config.healthEndpoint,
      method: 'GET',
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ healthy: true, data });
        } else {
          resolve({ 
            healthy: false, 
            reason: `Server responded with status code ${res.statusCode}`,
            data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({ 
        healthy: false, 
        reason: `Error connecting to server: ${error.message}`,
        error
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ 
        healthy: false, 
        reason: 'Server health check timed out'
      });
    });
    
    req.end();
  });
}

// Alternative port check (fallback for when /health endpoint isn't available)
function checkServerPort() {
  return new Promise((resolve) => {
    const testSocket = new http.Agent();
    const req = http.request({
      hostname: 'localhost',
      port: config.serverPort,
      path: '/',
      method: 'HEAD',
      timeout: 5000,
      agent: testSocket
    });
    
    req.on('response', () => {
      req.destroy();
      resolve({ healthy: true });
    });
    
    req.on('error', () => {
      resolve({ healthy: false, reason: 'Could not connect to server port' });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ healthy: false, reason: 'Connection timed out' });
    });
    
    req.end();
  });
}

// Get server PID from file
function getServerPid() {
  try {
    if (fs.existsSync(config.pidFile)) {
      const pid = fs.readFileSync(config.pidFile, 'utf8').trim();
      return parseInt(pid, 10);
    }
  } catch (error) {
    logger.error(`Error reading PID file: ${error.message}`);
  }
  
  return null;
}

// Check if process is running
function isProcessRunning(pid) {
  try {
    if (!pid) return false;
    
    // Try to send signal 0 to process - doesn't do anything but checks if process exists
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means process exists but we don't have permission to send signals to it
    return error.code === 'EPERM';
  }
}

// Start the server
function startServer(options = []) {
  logger.info('Starting UI server...');
  
  try {
    // Prepare command and arguments
    const startCommand = config.startScript;
    const args = options.length ? options : ['--no-browser'];
    
    // Start the server process
    const serverProcess = spawn(startCommand, args, {
      detached: true,
      stdio: 'ignore',
      cwd: rootDir
    });
    
    // Detach the process
    serverProcess.unref();
    
    logger.success(`UI server started with PID: ${serverProcess.pid}`);
    return true;
  } catch (error) {
    logger.error(`Failed to start UI server: ${error.message}`);
    return false;
  }
}

// Stop the server
function stopServer() {
  const pid = getServerPid();
  
  if (pid && isProcessRunning(pid)) {
    logger.info(`Stopping UI server (PID: ${pid})...`);
    
    try {
      process.kill(pid, 'SIGTERM');
      
      // Wait a moment to make sure it's stopped
      setTimeout(() => {
        if (isProcessRunning(pid)) {
          logger.warn(`Server didn't stop with SIGTERM, trying SIGKILL...`);
          process.kill(pid, 'SIGKILL');
        }
      }, 5000);
      
      logger.success('UI server stopped');
      return true;
    } catch (error) {
      logger.error(`Failed to stop UI server: ${error.message}`);
      return false;
    }
  } else {
    logger.warn('No running UI server found');
    return false;
  }
}

// Restart the server
async function restartServer(options = []) {
  logger.info('Restarting UI server...');
  
  // Stop the server
  stopServer();
  
  // Wait a moment before starting again
  await new Promise(resolve => setTimeout(resolve, config.restartDelay));
  
  // Start the server
  return startServer(options);
}

// Start monitoring
async function startMonitoring() {
  // Save monitor PID
  fs.writeFileSync(config.monitorPidFile, process.pid.toString());
  
  logger.info('Server monitor started');
  logger.info(`Checking server health every ${config.checkInterval / 1000} seconds`);
  
  let restartCount = 0;
  let consecutiveFailures = 0;
  
  // Initial check
  const initialCheck = await checkServerHealth();
  
  if (!initialCheck.healthy) {
    const portCheck = await checkServerPort();
    
    if (!portCheck.healthy) {
      logger.warn('Server is not running, attempting to start it...');
      startServer();
    } else {
      logger.info('Server is running but health check failed. Will continue monitoring.');
    }
  } else {
    logger.success('Server is healthy');
  }
  
  // Start monitoring loop
  const interval = setInterval(async () => {
    // Check server health
    const healthCheck = await checkServerHealth();
    
    // If the health check fails, try a simpler port check as backup
    if (!healthCheck.healthy) {
      const portCheck = await checkServerPort();
      
      if (!portCheck.healthy) {
        logger.error(`Server health check failed: ${healthCheck.reason || 'Unknown error'}`);
        logger.error('Port check also failed. Server appears to be down.');
        
        consecutiveFailures++;
        
        // Restart the server if within allowed restarts
        if (restartCount < config.maxRestarts) {
          logger.warn(`Attempting to restart server (${restartCount + 1}/${config.maxRestarts})...`);
          await restartServer();
          restartCount++;
        } else {
          logger.error(`Maximum restart attempts (${config.maxRestarts}) reached. Manual intervention required.`);
          clearInterval(interval);
        }
      } else {
        // Server is running but health check failed
        logger.warn(`Server health check failed but server is responding on port ${config.serverPort}`);
        logger.warn(`Reason: ${healthCheck.reason || 'Unknown error'}`);
        
        // If we've had too many consecutive health check failures, restart anyway
        if (consecutiveFailures >= 3) {
          logger.warn(`${consecutiveFailures} consecutive health check failures. Restarting server...`);
          await restartServer();
          consecutiveFailures = 0;
        }
      }
    } else {
      // Reset counters on successful health check
      consecutiveFailures = 0;
      
      // Log less frequently when healthy to avoid filling the logs
      if (Math.random() < 0.2) {  // Log roughly 20% of successful checks
        logger.success('Server health check passed');
      }
    }
  }, config.checkInterval);
  
  // Handle process termination
  process.on('SIGINT', () => {
    clearInterval(interval);
    logger.info('Server monitor stopped');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    clearInterval(interval);
    logger.info('Server monitor stopped');
    process.exit(0);
  });
}

// Check server status
async function checkStatus() {
  console.log(chalk.blue('Checking UI server status...'));
  
  const pid = getServerPid();
  const running = pid && isProcessRunning(pid);
  
  if (running) {
    console.log(chalk.green(`UI server is running (PID: ${pid})`));
    
    // Check health
    const healthCheck = await checkServerHealth();
    
    if (healthCheck.healthy) {
      console.log(chalk.green('Health check: Passed'));
    } else {
      console.log(chalk.yellow(`Health check: Failed - ${healthCheck.reason || 'Unknown error'}`));
      
      // Check if port is responding
      const portCheck = await checkServerPort();
      if (portCheck.healthy) {
        console.log(chalk.yellow(`However, server is responding on port ${config.serverPort}`));
      } else {
        console.log(chalk.red(`Server is not responding on port ${config.serverPort}`));
      }
    }
  } else {
    console.log(chalk.red('UI server is not running'));
  }
  
  // Check if monitor is running
  try {
    if (fs.existsSync(config.monitorPidFile)) {
      const monitorPid = parseInt(fs.readFileSync(config.monitorPidFile, 'utf8').trim(), 10);
      
      if (isProcessRunning(monitorPid)) {
        console.log(chalk.green(`Server monitor is running (PID: ${monitorPid})`));
      } else {
        console.log(chalk.yellow('Server monitor is not running (stale PID file)'));
      }
    } else {
      console.log(chalk.yellow('Server monitor is not running'));
    }
  } catch (error) {
    console.log(chalk.red(`Error checking monitor status: ${error.message}`));
  }
}

// Stream server logs
function streamLogs() {
  const serverLog = path.join(projectRoot, 'server.log');
  
  console.log(chalk.blue(`Streaming logs from ${serverLog}...`));
  console.log(chalk.gray('Press Ctrl+C to stop'));
  
  // Check if log file exists
  if (!fs.existsSync(serverLog)) {
    console.log(chalk.yellow(`Log file ${serverLog} does not exist yet`));
    
    // Create empty log file
    fs.writeFileSync(serverLog, '');
  }
  
  // Log header
  console.log(chalk.gray('--- Log streaming started ---'));
  
  // Show last 10 lines of log file
  try {
    const tail = execSync(`tail -n 10 "${serverLog}"`, { encoding: 'utf8' });
    
    if (tail.trim()) {
      console.log(chalk.gray('--- Last 10 lines ---'));
      console.log(tail);
      console.log(chalk.gray('--- New log entries will appear below ---'));
    }
  } catch (error) {
    console.log(chalk.red(`Error reading log file: ${error.message}`));
  }
  
  // Stream log file
  const tailProcess = spawn('tail', ['-f', serverLog]);
  
  tailProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  tailProcess.stderr.on('data', (data) => {
    process.stderr.write(chalk.red(data));
  });
  
  // Handle exit
  process.on('SIGINT', () => {
    tailProcess.kill();
    console.log(chalk.gray('\n--- Log streaming stopped ---'));
    process.exit(0);
  });
}

// Parse command line args and run
function run() {
  const command = process.argv[2] || 'help';
  
  switch (command) {
    case 'start':
      startMonitoring();
      break;
      
    case 'status':
      checkStatus();
      break;
      
    case 'logs':
      streamLogs();
      break;
      
    case 'restart':
      restartServer();
      break;
      
    case 'stop':
      stopServer();
      break;
      
    case 'help':
    default:
      console.log(chalk.cyan(`
Server Monitor - Monitors and manages the UI server

Usage:
  node server-monitor.js <command>

Commands:
  start     Start monitoring the server
  status    Check server status
  logs      Stream server logs
  restart   Restart the server
  stop      Stop the server
  help      Show this help
`));
      break;
  }
}

// Run
run();