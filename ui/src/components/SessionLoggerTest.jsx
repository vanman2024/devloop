/**
 * SessionLoggerTest.jsx
 * 
 * A component for testing and demonstrating the SessionLogger functionality.
 * Shows how to log different types of session data and display retrieved logs.
 */

import React, { useState, useEffect } from 'react';
import { 
  logSessionData,
  logCommandOutput,
  logBuildOutput,
  logClaudeInteraction,
  getCurrentSessionLogs,
  getSessionLogs,
  SESSION_CATEGORIES,
  getCurrentSessionId,
  startNewSession
} from '../utils/SessionLogger';

const SessionLoggerTest = () => {
  const [sessionId, setSessionId] = useState('');
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [testCommand, setTestCommand] = useState('npm run test');
  const [commandOutput, setCommandOutput] = useState('Test command output would appear here');

  // Load session info on mount
  useEffect(() => {
    async function loadSessionInfo() {
      const id = await getCurrentSessionId();
      setSessionId(id);
    }
    
    loadSessionInfo();
  }, []);

  // Handle logging a test command
  const handleLogCommand = async () => {
    setLoading(true);
    try {
      await logCommandOutput(testCommand, commandOutput);
      await refreshLogs();
    } catch (error) {
      console.error('Error logging command:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle logging build output
  const handleLogBuild = async () => {
    setLoading(true);
    try {
      await logBuildOutput('vite', 'Build completed successfully in 2.34s');
      await refreshLogs();
    } catch (error) {
      console.error('Error logging build:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle logging a Claude interaction
  const handleLogClaudeInteraction = async () => {
    setLoading(true);
    try {
      await logClaudeInteraction(
        'How do I use the SessionLogger?',
        'You can use the SessionLogger to record various types of session data to the database.',
        { model: 'claude-3', timestamp: new Date().toISOString() }
      );
      await refreshLogs();
    } catch (error) {
      console.error('Error logging Claude interaction:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle starting a new session
  const handleStartNewSession = async () => {
    setLoading(true);
    try {
      const newSessionId = await startNewSession();
      setSessionId(newSessionId);
      await refreshLogs();
    } catch (error) {
      console.error('Error starting new session:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh logs based on selected category
  const refreshLogs = async () => {
    setLoading(true);
    try {
      let fetchedLogs;
      
      if (selectedCategory) {
        fetchedLogs = await getSessionLogs(selectedCategory);
      } else {
        fetchedLogs = await getCurrentSessionLogs();
      }
      
      setLogs(fetchedLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format log entry for display
  const formatLogEntry = (key, value) => {
    try {
      if (typeof value.data === 'string' && value.data.startsWith('{')) {
        // Try to parse as JSON if it starts with {
        const data = JSON.parse(value.data);
        return (
          <div key={key} className="log-entry">
            <div className="log-header">
              <strong>{key}</strong> - {value.timestamp}
            </div>
            <pre className="log-content">{JSON.stringify(data, null, 2)}</pre>
          </div>
        );
      } else {
        // Display as is
        return (
          <div key={key} className="log-entry">
            <div className="log-header">
              <strong>{key}</strong> - {value.timestamp}
            </div>
            <pre className="log-content">{value.data}</pre>
          </div>
        );
      }
    } catch (e) {
      // Fallback display
      return (
        <div key={key} className="log-entry">
          <div className="log-header">
            <strong>{key}</strong> - {value.timestamp}
          </div>
          <pre className="log-content">{value.data}</pre>
        </div>
      );
    }
  };

  return (
    <div className="session-logger-test">
      <h2>Session Logger Test</h2>
      
      <div className="session-info">
        <h3>Current Session</h3>
        <p><strong>Session ID:</strong> {sessionId || 'Loading...'}</p>
        <button 
          onClick={handleStartNewSession}
          disabled={loading}
        >
          Start New Session
        </button>
      </div>
      
      <div className="testing-actions">
        <h3>Test Logging</h3>
        
        <div className="test-command">
          <h4>Log Command Output</h4>
          <div>
            <label htmlFor="test-command">Command:</label>
            <input 
              id="test-command"
              type="text" 
              value={testCommand} 
              onChange={e => setTestCommand(e.target.value)}
              placeholder="Enter a command"
            />
          </div>
          <div>
            <label htmlFor="command-output">Output:</label>
            <textarea
              id="command-output"
              value={commandOutput}
              onChange={e => setCommandOutput(e.target.value)}
              placeholder="Enter command output"
              rows={3}
            />
          </div>
          <button 
            onClick={handleLogCommand}
            disabled={loading}
          >
            Log Command
          </button>
        </div>
        
        <div className="test-actions">
          <h4>Other Test Actions</h4>
          <button 
            onClick={handleLogBuild}
            disabled={loading}
          >
            Log Build Output
          </button>
          <button 
            onClick={handleLogClaudeInteraction}
            disabled={loading}
          >
            Log Claude Interaction
          </button>
        </div>
      </div>
      
      <div className="logs-display">
        <h3>Session Logs</h3>
        
        <div className="filter-controls">
          <label htmlFor="category-filter">Filter by Category:</label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="">Current Session (All Categories)</option>
            {Object.entries(SESSION_CATEGORIES).map(([key, value]) => (
              <option key={key} value={value}>{key}</option>
            ))}
          </select>
          <button 
            onClick={refreshLogs}
            disabled={loading}
          >
            Refresh Logs
          </button>
        </div>
        
        <div className="logs-container">
          {loading ? (
            <p>Loading logs...</p>
          ) : Object.keys(logs).length === 0 ? (
            <p>No logs found. Try logging some data first.</p>
          ) : (
            <div className="logs-list">
              {Object.entries(logs).map(([key, value]) => formatLogEntry(key, value))}
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .session-logger-test {
          padding: 1rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .testing-actions {
          margin-top: 1.5rem;
          border: 1px solid #ddd;
          padding: 1rem;
          border-radius: 4px;
          background: #f9f9f9;
        }
        
        .test-command, .test-actions {
          margin-bottom: 1rem;
        }
        
        .logs-display {
          margin-top: 2rem;
        }
        
        .filter-controls {
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .logs-container {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 1rem;
          background: #f5f5f5;
          max-height: 500px;
          overflow-y: auto;
        }
        
        .log-entry {
          margin-bottom: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          overflow: hidden;
        }
        
        .log-header {
          padding: 0.5rem;
          background: #eee;
          border-bottom: 1px solid #ddd;
        }
        
        .log-content {
          padding: 0.5rem;
          margin: 0;
          max-height: 200px;
          overflow-y: auto;
          white-space: pre-wrap;
          font-size: 0.9rem;
        }
        
        button {
          padding: 0.5rem 1rem;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 0.5rem;
          margin-top: 0.5rem;
        }
        
        button:hover {
          background: #0055bb;
        }
        
        button:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }
        
        input, textarea, select {
          width: 100%;
          padding: 0.5rem;
          margin-top: 0.25rem;
          margin-bottom: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default SessionLoggerTest;