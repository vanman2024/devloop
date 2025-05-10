/**
 * SessionLogger.cjs
 * 
 * CommonJS version of SessionLogger for use in Node.js scripts.
 * This is a simplified version that uses file system instead of database.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Create logs directory
const LOGS_DIR = path.resolve(__dirname, '../logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Session categories
const SESSION_CATEGORIES = {
  COMMAND_OUTPUT: 'command_output',
  BUILD_OUTPUT: 'build_output',
  UI_ACTIONS: 'ui_actions',
  API_RESPONSES: 'api_responses',
  CLAUDE_INTERACTIONS: 'claude_interactions',
  ERRORS: 'errors',
  PERFORMANCE: 'performance'
};

/**
 * Create a timestamp string in a sortable format
 * @returns {string} Formatted timestamp
 */
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString();
};

/**
 * Get a file-safe timestamp for filenames
 */
const getFileTimestamp = () => {
  return getTimestamp().replace(/:/g, '-').replace(/\..+/, '');
};

/**
 * Get the current session ID from file or create a new one
 */
const getCurrentSessionId = () => {
  const sessionFile = path.join(LOGS_DIR, 'current_session.txt');
  let sessionId;
  
  // Try to read existing session ID
  try {
    if (fs.existsSync(sessionFile)) {
      sessionId = fs.readFileSync(sessionFile, 'utf8').trim();
    }
  } catch (e) {
    // Ignore read errors
  }
  
  // If no session ID, create a new one
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    fs.writeFileSync(sessionFile, sessionId);
    
    // Also write session start info
    const sessionInfoFile = path.join(LOGS_DIR, `${sessionId}_info.json`);
    const sessionInfo = {
      id: sessionId,
      start: getTimestamp(),
      hostname: os.hostname(),
      username: os.userInfo().username,
      platform: os.platform(),
      arch: os.arch()
    };
    
    fs.writeFileSync(sessionInfoFile, JSON.stringify(sessionInfo, null, 2));
  }
  
  return sessionId;
};

/**
 * Log data to a file
 */
const logToFile = (category, key, data) => {
  const sessionId = getCurrentSessionId();
  const timestamp = getFileTimestamp();
  const logFile = path.join(LOGS_DIR, `${category}_${key}_${timestamp}.log`);
  
  // Format log data
  const logData = typeof data === 'string' 
    ? data 
    : JSON.stringify(data, null, 2);
  
  // Create log entry
  const entry = `
=================================================
SESSION: ${sessionId}
TIMESTAMP: ${getTimestamp()}
CATEGORY: ${category}
KEY: ${key}
=================================================

${logData}
`;

  // Write to file
  fs.writeFileSync(logFile, entry);
  
  // Also update the session log index
  const sessionLogIndexFile = path.join(LOGS_DIR, `${sessionId}_logs.txt`);
  fs.appendFileSync(
    sessionLogIndexFile, 
    `${getTimestamp()} | ${category} | ${key} | ${logFile}\n`
  );
  
  return logFile;
};

/**
 * Log command output from terminal or CLI
 */
const logCommandOutput = (command, output, isError = false) => {
  const cleanCommand = command.trim().replace(/\s+/g, '_').substring(0, 40);
  const key = `cmd_${cleanCommand}`;
  
  const data = {
    command,
    output,
    isError,
    exitCode: isError ? 1 : 0
  };
  
  const logFile = logToFile(
    isError ? SESSION_CATEGORIES.ERRORS : SESSION_CATEGORIES.COMMAND_OUTPUT, 
    key, 
    data
  );
  
  console.log(`Command output logged to: ${logFile}`);
  return Promise.resolve(logFile);
};

/**
 * Log build output from compilation processes
 */
const logBuildOutput = (buildType, output, success = true) => {
  const key = `build_${buildType}`;
  
  const data = {
    buildType,
    output,
    success
  };
  
  const logFile = logToFile(SESSION_CATEGORIES.BUILD_OUTPUT, key, data);
  console.log(`Build output logged to: ${logFile}`);
  return Promise.resolve(logFile);
};

module.exports = {
  logCommandOutput,
  logBuildOutput,
  getCurrentSessionId,
  getTimestamp,
  SESSION_CATEGORIES
};