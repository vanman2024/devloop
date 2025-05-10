import React, { useState, useEffect } from 'react';
import { useChangeTracker } from './ChangeTracker.jsx';

/**
 * SafeguardPanel - A React component that integrates with the standalone UI Safeguard system
 * This component provides UI snapshot and rollback capabilities directly in the application
 * and integrates with the Visual Changelog system
 */
const SafeguardPanel = () => {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [highlightedEffect, setHighlightedEffect] = useState(false);

  // Get the change tracker to record snapshots in the application history
  const { trackChange } = useChangeTracker();

  // Get the safeguard API URL from environment variables or use the default
  const SAFEGUARD_API = import.meta.env.VITE_SAFEGUARD_API || 'http://localhost:8090';
  
  // Apply highlight effect when first loaded
  useEffect(() => {
    setHighlightedEffect(true);
    const timer = setTimeout(() => {
      setHighlightedEffect(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Load snapshots on component mount
  useEffect(() => {
    if (expanded) {
      loadSnapshots();
    }
  }, [expanded]);

  // Load snapshots from the UI Safeguard API
  const loadSnapshots = async () => {
    try {
      setLoading(true);
      const data = await safeLoadData(`${SAFEGUARD_API}/list`);
      
      if (data.success && data.snapshots) {
        setSnapshots(data.snapshots);
        setError(null);
      } else {
        setError(data.error || 'Unknown error loading snapshots');
      }
    } catch (err) {
      console.error('Error loading snapshots:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Take a new snapshot
  const takeSnapshot = async () => {
    try {
      const description = prompt('Enter a description for this snapshot:');
      if (!description) return;

      setLoading(true);
      const data = await safeLoadData(`${SAFEGUARD_API}/snapshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ description })
      });
      
      if (data.success) {
        alert(`Snapshot created: ${data.snapshotId}`);
        loadSnapshots();
      } else {
        throw new Error(data.error || 'Unknown error creating snapshot');
      }
    } catch (err) {
      console.error('Error taking snapshot:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Restore a snapshot
  const restoreSnapshot = async (snapshotId) => {
    if (!confirm(`Are you sure you want to restore snapshot ${snapshotId}? The page will reload after restoration.`)) {
      return;
    }
    
    try {
      setLoading(true);
      const data = await safeLoadData(`${SAFEGUARD_API}/restore/${snapshotId}`, {
        method: 'POST'
      });
      
      if (data.success) {
        alert(`Snapshot ${snapshotId} restored successfully!\nBackup created: ${data.backupId}`);
        // Reload the page to show the restored components
        window.location.reload();
      } else {
        throw new Error(data.error || 'Unknown error restoring snapshot');
      }
    } catch (err) {
      console.error('Error restoring snapshot:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Verify components
  const verifyComponents = async () => {
    try {
      setLoading(true);
      const data = await safeLoadData(`${SAFEGUARD_API}/verify`);
      setVerificationResult(data);
    } catch (err) {
      console.error('Error verifying components:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Panel styles
  const styles = {
    panel: {
      position: 'fixed',
      bottom: expanded ? '20px' : '-5px',
      right: '20px',
      width: expanded ? '360px' : '200px',
      backgroundColor: '#1e293b',
      color: '#e2e8f0',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: 9999,
      transition: 'all 0.3s ease',
      overflow: 'hidden',
      maxHeight: expanded ? '500px' : '40px',
    },
    header: {
      padding: '10px 15px',
      backgroundColor: '#0f172a',
      color: 'white',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
    },
    content: {
      padding: expanded ? '15px' : '0',
      maxHeight: expanded ? '400px' : '0',
      overflowY: 'auto',
      transition: 'all 0.3s ease',
    },
    snapshotList: {
      marginTop: '10px',
      borderTop: '1px solid #334155',
      maxHeight: '200px',
      overflowY: 'auto',
    },
    snapshotItem: {
      padding: '10px',
      borderBottom: '1px solid #334155',
    },
    button: {
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      marginRight: '5px',
      fontSize: '12px',
    },
    takeButton: {
      backgroundColor: '#10b981',
    },
    restoreButton: {
      backgroundColor: '#f97316',
    },
    verifyButton: {
      backgroundColor: '#8b5cf6',
    },
    heading: {
      fontSize: '14px',
      fontWeight: 'bold',
      marginBottom: '5px',
    },
    error: {
      color: '#ef4444',
      marginTop: '10px',
      padding: '10px',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: '4px',
    },
    badge: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: 'bold',
    },
    badgeSuccess: {
      backgroundColor: '#10b981',
      color: 'white',
    },
    badgeError: {
      backgroundColor: '#ef4444',
      color: 'white',
    }
  };

  // Only try to use the safeguard API if it's available
  // This prevents issues with HMR when the API is not running
  const safeLoadData = async (url, options = {}) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.warn('[SafeguardPanel] API error:', err.message);
      return { success: false, error: 'API not available' };
    }
  };

  return (
    <div style={styles.panel}>
      <div 
        style={styles.header} 
        onClick={() => setExpanded(!expanded)}
      >
        <div>UI Safeguard</div>
        <div>{expanded ? '▼' : '▲'}</div>
      </div>

      <div style={styles.content}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            style={{ ...styles.button, ...styles.takeButton }} 
            onClick={takeSnapshot}
            disabled={loading}
          >
            Take Snapshot
          </button>
          <button 
            style={{ ...styles.button, ...styles.verifyButton }} 
            onClick={verifyComponents}
            disabled={loading}
          >
            Verify Components
          </button>
        </div>

        {error && (
          <div style={styles.error}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {verificationResult && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'rgba(30, 41, 59, 0.4)', borderRadius: '4px' }}>
            <div style={styles.heading}>Verification Result:</div>
            {verificationResult.success ? (
              <div style={{...styles.badge, ...styles.badgeSuccess}}>
                All {verificationResult.totalComponents} components passed
              </div>
            ) : verificationResult.error ? (
              <div style={{...styles.badge, ...styles.badgeError}}>
                {verificationResult.error}
              </div>
            ) : (
              <div style={{...styles.badge, ...styles.badgeError}}>
                {verificationResult.issueCount} of {verificationResult.totalComponents} components have issues
              </div>
            )}
          </div>
        )}

        <div style={styles.heading}>Snapshots:</div>
        {loading ? (
          <div>Loading...</div>
        ) : snapshots.length === 0 ? (
          <div>No snapshots available</div>
        ) : (
          <div style={styles.snapshotList}>
            {snapshots.map(snapshot => (
              <div key={snapshot.id} style={styles.snapshotItem}>
                <div style={{ fontWeight: 'bold' }}>{snapshot.id}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {formatDate(snapshot.timestamp)}
                </div>
                <div style={{ fontSize: '13px', marginTop: '4px', marginBottom: '8px' }}>
                  {snapshot.description || 'No description'}
                </div>
                <button 
                  style={{ ...styles.button, ...styles.restoreButton, fontSize: '11px' }} 
                  onClick={() => restoreSnapshot(snapshot.id)}
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '10px', color: '#94a3b8' }}>
          Standalone UI Safeguard System v1.0
        </div>
      </div>
    </div>
  );
};

export default SafeguardPanel;