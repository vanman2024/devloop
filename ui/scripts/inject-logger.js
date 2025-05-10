/**
 * inject-logger.js
 * 
 * A script that can inject logging functionality into an already running server.
 * This connects to the server's WebSocket interface and intercepts messages.
 * 
 * Usage:
 *   node inject-logger.js
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { logCommandOutput } = require('./SessionLogger.cjs');

// Configuration
const SERVER_PORT = process.env.SERVER_PORT || 8080; // Default port for the server
const LOG_DIR = path.resolve(__dirname, '../logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Get a unique log ID
const getLogId = () => {
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  return `${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
};

// Function to create a WebSocket connection
const connectToServer = () => {
  console.log(`Attempting to connect to server WebSocket on port ${SERVER_PORT}...`);
  
  const ws = new WebSocket(`ws://localhost:${SERVER_PORT}`);
  
  ws.on('open', () => {
    console.log('Connected to server WebSocket!');
    console.log('Logger is now active and will capture server events');
    
    // Register for events
    const registration = {
      type: 'register',
      components: ['all'],
      events: ['all']
    };
    
    ws.send(JSON.stringify(registration));
  });
  
  ws.on('message', (data) => {
    try {
      // Try to parse as JSON
      const message = JSON.parse(data.toString());
      
      // Log the message
      const logId = getLogId();
      const logType = message.type || 'unknown';
      const logFile = path.join(LOG_DIR, `ws_event_${logType}_${logId}.json`);
      
      // Write to file
      fs.writeFileSync(logFile, JSON.stringify(message, null, 2));
      
      // Also log to console
      console.log(`[${new Date().toISOString()}] WS Event: ${logType}`);
      
      // If it's a console log or output, also log using our command logger
      if (message.type === 'console' || message.type === 'output' || message.type === 'log') {
        logCommandOutput(
          message.command || message.source || 'console', 
          message.content || message.data || message.text || JSON.stringify(message),
          message.error || message.level === 'error'
        );
      }
      
    } catch (error) {
      // Not JSON or other error, just log the raw data
      const logId = getLogId();
      const logFile = path.join(LOG_DIR, `ws_raw_${logId}.txt`);
      fs.writeFileSync(logFile, data.toString());
      console.log(`[${new Date().toISOString()}] WS Raw Data (logged to ${logFile})`);
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
    console.log('Will attempt to reconnect in 5 seconds...');
    setTimeout(connectToServer, 5000);
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    console.log('Will attempt to reconnect in 5 seconds...');
    setTimeout(connectToServer, 5000);
  });
  
  // Also set up logging for stdin/stdout in this process
  process.stdin.on('data', (data) => {
    const input = data.toString().trim();
    if (input.startsWith('/')) {
      // This is a command
      const command = input.substring(1);
      console.log(`Executing command: ${command}`);
      
      // Send to WebSocket
      ws.send(JSON.stringify({
        type: 'command',
        command: command
      }));
      
      // Log the command
      logCommandOutput(`/${command}`, 'Command sent to server', false);
    } else {
      // Regular input, just log it
      logCommandOutput('user_input', input, false);
    }
  });
  
  return ws;
};

// Start intercepting
console.log('Starting WebSocket interceptor...');
console.log(`Logs will be saved to: ${LOG_DIR}`);

// Register for SIGINT to handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down logger...');
  process.exit(0);
});

// Connect to server
const wsConnection = connectToServer();

// Also try to connect to the Claude integration if it exists
try {
  const claudeWsPort = 8081; // Adjust to your Claude WebSocket port
  const claudeWs = new WebSocket(`ws://localhost:${claudeWsPort}`);
  
  claudeWs.on('open', () => {
    console.log('Connected to Claude WebSocket!');
    
    // Register for events
    claudeWs.send(JSON.stringify({
      type: 'register',
      role: 'observer'
    }));
  });
  
  claudeWs.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Log Claude interactions
      if (message.type === 'claude_message' || message.role === 'assistant' || message.role === 'user') {
        const logId = getLogId();
        const logFile = path.join(LOG_DIR, `claude_interaction_${logId}.json`);
        
        // Write to file
        fs.writeFileSync(logFile, JSON.stringify(message, null, 2));
        
        console.log(`[${new Date().toISOString()}] Claude interaction logged`);
      }
    } catch (error) {
      // Not JSON, just log the raw data
      const logId = getLogId();
      const logFile = path.join(LOG_DIR, `claude_raw_${logId}.txt`);
      fs.writeFileSync(logFile, data.toString());
    }
  });
  
  claudeWs.on('error', () => {
    // Silently ignore - Claude WebSocket might not be available
  });
  
} catch (error) {
  // Silently ignore - Claude WebSocket might not be available
}

console.log('Logger running. Press Ctrl+C to stop.');