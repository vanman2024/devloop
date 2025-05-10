/**
 * ClaudeSummaryViewer.jsx
 * 
 * Component to display Claude conversation summaries that have been saved
 * to the database. This allows you to access previous context from 
 * different sessions.
 */

import React, { useState, useEffect } from 'react';
import { getAllSummaries, getSummaryById } from '../utils/ClaudeSummaryTracker';

const ClaudeSummaryViewer = () => {
  const [summaries, setSummaries] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load summaries on component mount
  useEffect(() => {
    loadSummaries();
  }, []);
  
  // Function to load all summaries
  const loadSummaries = async () => {
    setLoading(true);
    try {
      const allSummaries = await getAllSummaries();
      setSummaries(allSummaries);
      
      // If there's at least one summary, select the most recent
      if (allSummaries.length > 0) {
        setSelectedSummary(allSummaries[0]);
      }
    } catch (err) {
      console.error('Error loading summaries:', err);
      setError('Failed to load summaries. Check the console for details.');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to view a specific summary
  const viewSummary = async (summaryId) => {
    setLoading(true);
    try {
      const summary = await getSummaryById(summaryId);
      if (summary) {
        setSelectedSummary(summary);
      } else {
        setError(`Summary with ID ${summaryId} not found`);
      }
    } catch (err) {
      console.error(`Error loading summary ${summaryId}:`, err);
      setError(`Failed to load summary ${summaryId}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="claude-summary-viewer loading">
        <div className="loader">Loading summaries...</div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="claude-summary-viewer error">
        <div className="error-message">{error}</div>
        <button onClick={loadSummaries}>Retry</button>
      </div>
    );
  }
  
  // Render no summaries state
  if (summaries.length === 0) {
    return (
      <div className="claude-summary-viewer empty">
        <div className="empty-message">
          No conversation summaries found.
        </div>
        <p>
          Summaries are automatically created when context compression occurs during long conversations with Claude.
        </p>
      </div>
    );
  }
  
  return (
    <div className="claude-summary-viewer">
      <h2>Claude Conversation Summaries</h2>
      
      <div className="summary-container">
        <div className="summary-list">
          <h3>Available Summaries</h3>
          <ul>
            {summaries.map((summary) => (
              <li 
                key={summary.id}
                className={selectedSummary?.id === summary.id ? 'selected' : ''}
                onClick={() => viewSummary(summary.id)}
              >
                <div className="summary-list-item">
                  <div className="summary-timestamp">
                    {formatTimestamp(summary.timestamp)}
                  </div>
                  <div className="summary-preview">
                    {summary.summary.substring(0, 60)}...
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="summary-detail">
          {selectedSummary ? (
            <>
              <div className="summary-header">
                <h3>Conversation Summary</h3>
                <div className="summary-meta">
                  <span className="timestamp">
                    <strong>Timestamp:</strong> {formatTimestamp(selectedSummary.timestamp)}
                  </span>
                  {selectedSummary.conversationId && (
                    <span className="conversation-id">
                      <strong>Conversation:</strong> {selectedSummary.conversationId}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="summary-content">
                {selectedSummary.summary.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </>
          ) : (
            <div className="no-selection">
              Select a summary from the list to view details
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .claude-summary-viewer {
          font-family: system-ui, -apple-system, sans-serif;
          padding: 1rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .summary-container {
          display: flex;
          gap: 1.5rem;
          margin-top: 1rem;
        }
        
        .summary-list {
          flex: 0 0 300px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 1rem;
          background: #f7f7f7;
          height: 600px;
          overflow-y: auto;
        }
        
        .summary-list ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .summary-list li {
          padding: 0.75rem;
          border-bottom: 1px solid #e0e0e0;
          cursor: pointer;
        }
        
        .summary-list li:hover {
          background: #f0f0f0;
        }
        
        .summary-list li.selected {
          background: #e7f5ff;
          border-left: 3px solid #0066cc;
        }
        
        .summary-timestamp {
          font-size: 0.8rem;
          color: #666;
          margin-bottom: 0.3rem;
        }
        
        .summary-preview {
          font-size: 0.9rem;
          color: #333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .summary-detail {
          flex: 1;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 1.5rem;
          height: 600px;
          overflow-y: auto;
        }
        
        .summary-header {
          margin-bottom: 1.5rem;
        }
        
        .summary-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          font-size: 0.9rem;
          color: #555;
          margin-top: 0.5rem;
        }
        
        .summary-content {
          background: #f9f9f9;
          padding: 1.5rem;
          border-radius: 4px;
          border-left: 4px solid #0066cc;
          white-space: pre-wrap;
        }
        
        .no-selection {
          display: flex;
          height: 100%;
          align-items: center;
          justify-content: center;
          color: #666;
          font-style: italic;
        }
        
        .loading, .error, .empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          text-align: center;
        }
        
        .error-message {
          color: #cc0000;
          margin-bottom: 1rem;
        }
        
        button {
          padding: 0.5rem 1rem;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        button:hover {
          background: #0055bb;
        }
      `}</style>
    </div>
  );
};

export default ClaudeSummaryViewer;