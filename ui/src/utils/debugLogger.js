/**
 * Debug Logger Utility
 * This module provides a consistent way to log debug information
 * across the entire UI application with different log levels and features.
 */

// Configure log levels and settings
export const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

// Default configuration - can be changed at runtime
let config = {
  logLevel: LogLevel.DEBUG, // Default log level
  outputToConsole: true,    // Always log to console
  outputToDOM: true,        // Also show in DOM element
  outputToFile: false,      // Currently not implemented in browser
  maxLogEntries: 1000,      // Max number of entries to keep in memory
  showTimestamp: true,      // Include timestamp with each log
  showSource: true,         // Include source component/file with each log
  allowRichFormatting: true // Allow objects to be expanded in console
};

// In-memory log storage
const logEntries = [];

// DOM element ID for logs display
const LOG_CONTAINER_ID = 'devloop-debug-logs';

/**
 * Main logging function
 * @param {number} level - Log level from LogLevel enum
 * @param {string} source - Source component/file
 * @param {string} message - Log message 
 * @param {object|undefined} data - Optional data to log
 * @param {Error|undefined} error - Optional error object
 */
function logMessage(level, source, message, data, error) {
  if (level > config.logLevel) return;

  const timestamp = config.showTimestamp ? new Date().toISOString() : '';
  const sourceInfo = config.showSource ? `[${source}]` : '';
  
  // Basic log info
  const logEntry = {
    level,
    timestamp,
    source,
    message,
    data: data || null,
    error: error || null,
    levelName: Object.keys(LogLevel).find(key => LogLevel[key] === level)
  };

  // Add to in-memory storage
  logEntries.push(logEntry);
  
  // Limit size of log storage
  if (logEntries.length > config.maxLogEntries) {
    logEntries.shift();
  }

  // Log to console
  if (config.outputToConsole) {
    const prefix = `${timestamp} ${sourceInfo} `;
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(prefix, message, error || '', data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, message, data || '');
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, message, data || '');
        break;
      case LogLevel.TRACE:
        console.log(`${prefix} [TRACE]`, message, data || '');
        break;
    }
  }

  // Output to DOM if enabled and container exists
  if (config.outputToDOM) {
    updateDOMLogDisplay();
  }

  return logEntry;
}

/**
 * Updates the DOM display of logs if the container exists
 */
function updateDOMLogDisplay() {
  const container = document.getElementById(LOG_CONTAINER_ID);
  if (!container) return;

  // Get the most recent logs (limiting to last 100 for performance)
  const recentLogs = logEntries.slice(-100);
  
  // Create log content
  const logHTML = recentLogs.map(entry => {
    let className = 'log-entry';
    switch (entry.level) {
      case LogLevel.ERROR: className += ' log-error'; break;
      case LogLevel.WARN: className += ' log-warn'; break;
      case LogLevel.INFO: className += ' log-info'; break;
      case LogLevel.DEBUG: className += ' log-debug'; break;
      case LogLevel.TRACE: className += ' log-trace'; break;
    }

    const dataDisplay = entry.data ? 
      `<pre>${JSON.stringify(entry.data, null, 2)}</pre>` : '';
    
    const errorDisplay = entry.error ? 
      `<div class="log-error-details">${entry.error.message}<br>${entry.error.stack}</div>` : '';

    return `
      <div class="${className}">
        <span class="log-time">${entry.timestamp}</span>
        <span class="log-level">[${entry.levelName}]</span>
        <span class="log-source">[${entry.source}]</span>
        <span class="log-message">${entry.message}</span>
        ${dataDisplay}
        ${errorDisplay}
      </div>
    `;
  }).join('');

  container.innerHTML = logHTML;
  
  // Auto-scroll to bottom
  container.scrollTop = container.scrollHeight;
}

/**
 * Creates a logger instance for a specific source
 * @param {string} source - Source component/file name
 * @returns {object} Logger object with various logging methods
 */
function createLogger(source) {
  return {
    error: (message, error, data) => logMessage(LogLevel.ERROR, source, message, data, error),
    warn: (message, data) => logMessage(LogLevel.WARN, source, message, data),
    info: (message, data) => logMessage(LogLevel.INFO, source, message, data),
    debug: (message, data) => logMessage(LogLevel.DEBUG, source, message, data),
    trace: (message, data) => logMessage(LogLevel.TRACE, source, message, data),
    
    // Router specific logging helper
    logRouteChange: (from, to) => {
      logMessage(LogLevel.INFO, source, `Route changed: ${from} → ${to}`);
    }
  };
}

/**
 * Initialize logger system including error handlers
 */
function initializeLogger() {
  // Set up global error handler to catch all unhandled errors
  window.addEventListener('error', (event) => {
    logMessage(
      LogLevel.ERROR, 
      'window', 
      `Unhandled error: ${event.message}`, 
      { filename: event.filename, lineno: event.lineno, colno: event.colno },
      event.error
    );
  });

  // Set up unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    logMessage(
      LogLevel.ERROR, 
      'promise', 
      'Unhandled Promise rejection', 
      { reason: event.reason },
      event.reason instanceof Error ? event.reason : new Error(String(event.reason))
    );
  });

  // Create floating log container if not exists and if enabled
  if (config.outputToDOM && !document.getElementById(LOG_CONTAINER_ID)) {
    const style = document.createElement('style');
    style.textContent = `
      #${LOG_CONTAINER_ID} {
        position: fixed;
        bottom: 0;
        right: 0;
        width: 50%;
        height: 200px;
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        font-family: monospace;
        font-size: 12px;
        padding: 10px;
        overflow: auto;
        z-index: 9999;
        border-top: 1px solid #444;
        border-left: 1px solid #444;
      }
      #${LOG_CONTAINER_ID} .log-entry {
        border-bottom: 1px solid #333;
        padding: 3px 0;
      }
      #${LOG_CONTAINER_ID} .log-error { color: #ff5555; }
      #${LOG_CONTAINER_ID} .log-warn { color: #ffaa00; }
      #${LOG_CONTAINER_ID} .log-info { color: #55aaff; }
      #${LOG_CONTAINER_ID} .log-debug { color: #aaaaaa; }
      #${LOG_CONTAINER_ID} .log-trace { color: #777777; }
      #${LOG_CONTAINER_ID} .log-time { opacity: 0.7; margin-right: 5px; }
      #${LOG_CONTAINER_ID} .log-level { font-weight: bold; margin-right: 5px; }
      #${LOG_CONTAINER_ID} .log-source { margin-right: 5px; }
      #${LOG_CONTAINER_ID} .log-error-details { 
        margin-top: 5px;
        padding-left: 20px;
        font-size: 11px;
        white-space: pre-wrap;
        color: #ff7777;
      }
      #${LOG_CONTAINER_ID} pre {
        margin: 5px 0;
        padding: 5px;
        background: rgba(0,0,0,0.3);
        max-height: 100px;
        overflow: auto;
        white-space: pre-wrap;
      }
      #debug-log-toggle {
        position: fixed;
        bottom: 0;
        right: 0;
        background: #444;
        color: white;
        border: none;
        padding: 3px 8px;
        cursor: pointer;
        z-index: 10000;
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);
    
    // Create toggle button for log display
    const toggleButton = document.createElement('button');
    toggleButton.id = 'debug-log-toggle';
    toggleButton.textContent = '🐞 Logs';
    toggleButton.onclick = toggleLogDisplay;
    
    // Create the log container (initially hidden)
    const container = document.createElement('div');
    container.id = LOG_CONTAINER_ID;
    container.style.display = 'none';
    
    document.body.appendChild(toggleButton);
    document.body.appendChild(container);
    
    // Log initialization success
    logMessage(LogLevel.INFO, 'debugLogger', 'Debug logger initialized');
  }
}

/**
 * Toggle visibility of the log display
 */
function toggleLogDisplay() {
  const container = document.getElementById(LOG_CONTAINER_ID);
  if (container) {
    const currentDisplay = container.style.display;
    container.style.display = currentDisplay === 'none' ? 'block' : 'none';
  }
}

/**
 * Change configuration at runtime
 * @param {Object} newConfig - New configuration object to merge
 */
function configure(newConfig) {
  config = { ...config, ...newConfig };
  logMessage(LogLevel.INFO, 'debugLogger', 'Logger configuration updated', config);
  return config;
}

/**
 * Get all logged entries
 * @returns {Array} Array of log entries
 */
function getAllLogs() {
  return [...logEntries];
}

/**
 * Clear all logged entries
 */
function clearLogs() {
  logEntries.length = 0;
  logMessage(LogLevel.INFO, 'debugLogger', 'Logs cleared');
  updateDOMLogDisplay();
}

// Export the main functions
export {
  createLogger,
  initializeLogger,
  configure,
  getAllLogs,
  clearLogs,
  toggleLogDisplay,
  LogLevel
};

// Default export - creates a logger for the caller
export default function getLogger(source = 'unknown') {
  return createLogger(source);
}