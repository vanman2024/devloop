/**
 * SessionLogger.js
 * 
 * Utility for capturing and storing session logs and outputs in the database.
 * This integrates with DatabaseHelper to provide persistent session history.
 */

import { saveContext, getContext, getCategoryContext, STORES } from './DatabaseHelper.js';

// Session categories
export const SESSION_CATEGORIES = {
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
 * Log data from a session
 * 
 * @param {string} category - The category of the log (use SESSION_CATEGORIES)
 * @param {string} key - Unique identifier for this specific log entry
 * @param {any} data - The data to store (will be stringified if not a string)
 * @param {object} options - Additional options
 * @param {boolean} options.appendTimestamp - Whether to append a timestamp to the key
 * @param {boolean} options.includeSessionId - Whether to include current session ID in the data
 * @returns {Promise<string>} The key used to store the data
 */
export const logSessionData = async (category, key, data, options = {}) => {
  const { appendTimestamp = true, includeSessionId = true } = options;
  
  // Format the key with timestamp if requested
  const timestamp = getTimestamp();
  const logKey = appendTimestamp ? `${key}_${timestamp.replace(/[:.]/g, '_')}` : key;
  
  // Format the data
  const logData = {
    timestamp,
    data: typeof data === 'string' ? data : JSON.stringify(data),
  };
  
  // Add session ID if requested
  if (includeSessionId) {
    const sessionId = await getCurrentSessionId();
    logData.sessionId = sessionId;
  }
  
  // Store in database
  await saveContext(category, logKey, logData);
  
  // Return the key used
  return logKey;
};

/**
 * Get the current session ID or create a new one
 * @returns {Promise<string>} Session ID
 */
export const getCurrentSessionId = async () => {
  const SESSION_ID_KEY = 'current_session_id';
  const SESSIONS_CATEGORY = 'sessions';
  
  // Try to get existing session ID
  let sessionId = await getContext(SESSIONS_CATEGORY, SESSION_ID_KEY);
  
  // If no session ID, create a new one
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await saveContext(SESSIONS_CATEGORY, SESSION_ID_KEY, sessionId);
    
    // Also store session start time
    await saveContext(SESSIONS_CATEGORY, `${sessionId}_start`, getTimestamp());
  }
  
  return sessionId;
};

/**
 * Start a new session
 * @returns {Promise<string>} New session ID
 */
export const startNewSession = async () => {
  const SESSIONS_CATEGORY = 'sessions';
  
  // Get old session ID
  const oldSessionId = await getCurrentSessionId();
  
  // If there was an old session, mark it as ended
  if (oldSessionId) {
    await saveContext(SESSIONS_CATEGORY, `${oldSessionId}_end`, getTimestamp());
  }
  
  // Create new session ID
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  await saveContext(SESSIONS_CATEGORY, 'current_session_id', sessionId);
  
  // Store session start time
  await saveContext(SESSIONS_CATEGORY, `${sessionId}_start`, getTimestamp());
  
  return sessionId;
};

/**
 * Log command output from terminal or CLI
 * @param {string} command - The command that was executed
 * @param {string} output - The output from the command
 * @param {boolean} isError - Whether the output is an error
 * @returns {Promise<string>} The key used to store the data
 */
export const logCommandOutput = async (command, output, isError = false) => {
  const cleanCommand = command.trim().replace(/\s+/g, '_').substring(0, 40);
  const key = `cmd_${cleanCommand}`;
  
  const data = {
    command,
    output,
    isError,
    exitCode: isError ? 1 : 0
  };
  
  return logSessionData(
    isError ? SESSION_CATEGORIES.ERRORS : SESSION_CATEGORIES.COMMAND_OUTPUT, 
    key, 
    data
  );
};

/**
 * Log build output from compilation processes
 * @param {string} buildType - The type of build (e.g., 'webpack', 'vite', 'npm')
 * @param {string} output - The build output
 * @param {boolean} success - Whether the build succeeded
 * @returns {Promise<string>} The key used to store the data
 */
export const logBuildOutput = async (buildType, output, success = true) => {
  const key = `build_${buildType}`;
  
  const data = {
    buildType,
    output,
    success
  };
  
  return logSessionData(SESSION_CATEGORIES.BUILD_OUTPUT, key, data);
};

/**
 * Log Claude interaction for persistence
 * @param {string} input - The input to Claude
 * @param {string} output - Claude's response
 * @param {Object} metadata - Additional metadata about the interaction
 * @returns {Promise<string>} The key used to store the data
 */
export const logClaudeInteraction = async (input, output, metadata = {}) => {
  const key = `claude_interaction`;
  
  const data = {
    input,
    output,
    ...metadata
  };
  
  return logSessionData(SESSION_CATEGORIES.CLAUDE_INTERACTIONS, key, data);
};

/**
 * Get all logs for a specific category
 * @param {string} category - The category to retrieve logs for
 * @returns {Promise<Object>} Object containing all logs for this category
 */
export const getSessionLogs = async (category) => {
  return getCategoryContext(category);
};

/**
 * Get logs for the current session
 * @param {string} category - Optional category to filter by
 * @returns {Promise<Object>} Logs for the current session
 */
export const getCurrentSessionLogs = async (category = null) => {
  const sessionId = await getCurrentSessionId();
  
  if (!sessionId) {
    return {};
  }
  
  const logs = {};
  
  if (category) {
    // Get logs for specific category
    const categoryLogs = await getCategoryContext(category);
    
    // Filter for current session
    Object.entries(categoryLogs).forEach(([key, value]) => {
      if (value.sessionId === sessionId) {
        logs[key] = value;
      }
    });
  } else {
    // Get logs for all categories
    for (const cat of Object.values(SESSION_CATEGORIES)) {
      const categoryLogs = await getCategoryContext(cat);
      
      // Filter for current session
      Object.entries(categoryLogs).forEach(([key, value]) => {
        if (value.sessionId === sessionId) {
          logs[`${cat}_${key}`] = value;
        }
      });
    }
  }
  
  return logs;
};

export default {
  logSessionData,
  getCurrentSessionId,
  startNewSession,
  logCommandOutput,
  logBuildOutput,
  logClaudeInteraction,
  getSessionLogs,
  getCurrentSessionLogs,
  SESSION_CATEGORIES
};