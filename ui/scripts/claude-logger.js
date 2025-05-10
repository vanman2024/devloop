/**
 * claude-logger.js
 * 
 * A script that integrates with Claude interactions to log them to the database.
 * This can be used to maintain context between Claude sessions.
 * 
 * Usage:
 *   For automatic integration, place this file in a location where it can be loaded
 *   by the Claude interface or API client.
 */

import { logClaudeInteraction, getCurrentSessionId } from '../src/utils/SessionLogger.js';

/**
 * Class that wraps Claude interactions and logs them
 */
export class ClaudeLogger {
  constructor() {
    this.sessionId = null;
    this.initialized = false;
    this.pendingLogs = [];
    
    // Initialize async
    this.init();
  }
  
  /**
   * Initialize the logger
   */
  async init() {
    try {
      this.sessionId = await getCurrentSessionId();
      this.initialized = true;
      
      // Process any pending logs
      this.processPendingLogs();
      
      console.log(`Claude Logger initialized with session ID: ${this.sessionId}`);
    } catch (error) {
      console.error('Error initializing Claude logger:', error);
    }
  }
  
  /**
   * Process any logs that were queued before initialization
   */
  async processPendingLogs() {
    if (this.pendingLogs.length > 0) {
      console.log(`Processing ${this.pendingLogs.length} pending logs`);
      
      for (const log of this.pendingLogs) {
        await this.logInteraction(log.input, log.output, log.metadata);
      }
      
      this.pendingLogs = [];
    }
  }
  
  /**
   * Log a Claude interaction to the database
   * 
   * @param {string} input - The user's input to Claude
   * @param {string} output - Claude's response
   * @param {Object} metadata - Additional metadata about the interaction
   */
  async logInteraction(input, output, metadata = {}) {
    // If not initialized, queue the log
    if (!this.initialized) {
      this.pendingLogs.push({ input, output, metadata });
      return;
    }
    
    try {
      // Add session ID to metadata
      const enhancedMetadata = {
        ...metadata,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      };
      
      // Log to database
      await logClaudeInteraction(input, output, enhancedMetadata);
      
      console.log('Claude interaction logged to database');
    } catch (error) {
      console.error('Error logging Claude interaction:', error);
    }
  }
  
  /**
   * Plugin function that can be used to intercept Claude API calls
   * This is an example and would need to be adapted to the specific API client
   * 
   * @param {Object} client - The Claude API client
   * @returns {Object} - The modified client with logging
   */
  createPlugin(client) {
    const logger = this;
    
    // Create a wrapped version of the client's sendMessage function
    const originalSendMessage = client.sendMessage;
    
    client.sendMessage = async function(input, options = {}) {
      // Call the original function
      const response = await originalSendMessage.call(this, input, options);
      
      // Log the interaction
      await logger.logInteraction(
        input, 
        response.content,
        {
          model: options.model || 'unknown',
          sessionId: options.sessionId,
          ...options.metadata
        }
      );
      
      return response;
    };
    
    return client;
  }
}

// Create and export a singleton instance
export const claudeLogger = new ClaudeLogger();

export default claudeLogger;