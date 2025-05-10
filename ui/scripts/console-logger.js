/**
 * console-logger.js
 * 
 * A script that can be used to capture console output and automatically
 * send it to the database using SessionLogger.
 * 
 * Usage:
 *   node console-logger.js "npm run build" "build"
 *   node console-logger.js "./start-ui.sh" "ui-start"
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Create a simple localStorage fallback for browser API in Node.js environment
global.localStorage = {
  _data: {},
  getItem(key) {
    return this._data[key];
  },
  setItem(key, value) {
    this._data[key] = value;
  },
  removeItem(key) {
    delete this._data[key];
  }
};

// Dynamically determine if we can use ES modules or need CommonJS
let logCommandOutput, logBuildOutput;

// Define a simple logging fallback in case the DB logger fails
const fallbackLog = (command, output, type) => {
  const timestamp = new Date().toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '');
  
  const logDir = path.resolve(__dirname, '../logs');
  
  // Make sure the logs directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.resolve(logDir, `${type}_${timestamp}.log`);
  
  const logData = `
=================================================
COMMAND: ${command}
TIMESTAMP: ${new Date().toISOString()}
TYPE: ${type}
=================================================

${output}
`;

  fs.writeFileSync(logFile, logData);
  console.log(`Fallback log written to: ${logFile}`);
}

// Helper to resolve paths relative to this script
const resolvePath = (relativePath) => path.resolve(__dirname, relativePath);

// Use our CommonJS version of the SessionLogger
const { logCommandOutput, logBuildOutput } = require('./SessionLogger.cjs');

// Parse command line arguments
const command = process.argv[2];
const logType = process.argv[3] || 'command'; // 'command', 'build', etc.

if (!command) {
  console.error('Error: No command specified');
  console.error('Usage: node console-logger.js "COMMAND" [TYPE]');
  process.exit(1);
}

// For Windows compatibility, handle PowerShell or CMD commands
const isWindows = process.platform === 'win32';
let shellCommand = command;
let shellArgs = [];
let shell = isWindows ? 'cmd.exe' : '/bin/bash';
let shellOption = isWindows ? '/c' : '-c';

shellArgs = [shellOption, shellCommand];

console.log(`Running command: ${command}`);
console.log(`Log type: ${logType}`);

// Run the command
const childProcess = spawn(shell, shellArgs, { 
  cwd: process.cwd(),
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe']
});

// Store output
let stdoutData = '';
let stderrData = '';

// Capture stdout
childProcess.stdout.on('data', (data) => {
  const output = data.toString();
  stdoutData += output;
  
  // Pass through to console
  process.stdout.write(output);
});

// Capture stderr
childProcess.stderr.on('data', (data) => {
  const output = data.toString();
  stderrData += output;
  
  // Pass through to console
  process.stderr.write(output);
});

// Handle command completion
childProcess.on('close', async (code) => {
  const success = code === 0;
  const output = stdoutData + (stderrData ? `\n\nERRORS:\n${stderrData}` : '');
  
  console.log(`Command exited with code ${code}`);
  
  try {
    if (logType === 'build') {
      await logBuildOutput('command', output, success);
      console.log('Build output logged successfully');
    } else {
      await logCommandOutput(command, output, !success);
      console.log('Command output logged successfully');
    }
  } catch (error) {
    console.error('Error logging output:', error);
    // Use fallback logging if database logging fails
    if (logType === 'build') {
      fallbackLog('command', output, success ? 'build-success' : 'build-error');
    } else {
      fallbackLog(command, output, !success ? 'command-error' : 'command');
    }
  }
  
  // Exit with the same code as the child process
  process.exit(code);
});

// Handle errors
childProcess.on('error', (error) => {
  console.error(`Error executing command: ${error.message}`);
  fallbackLog(command, error.message, 'execution-error');
  process.exit(1);
});