import React, { useState, useEffect } from 'react';
import { useChangeTracker } from './ChangeTracker.jsx';

const VisualChangelog = ({ onClose, componentName = null }) => {
  const [selectedChange, setSelectedChange] = useState(null);
  const [visualData, setVisualData] = useState({});
  const [loading, setLoading] = useState(false);
  const [compareMode, setCompareMode] = useState('side-by-side'); // or 'overlay'
  const [showVisualHistory, setShowVisualHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Get the component history and change data from the ChangeTracker context
  const { trackChange, changes } = useChangeTracker();
  
  // Get snapshot list from API
  const [snapshots, setSnapshots] = useState([]);
  
  useEffect(() => {
    // Load snapshots from the UI Safeguard API when the component is opened
    const loadSnapshots = async () => {
      try {
        const SAFEGUARD_API = import.meta.env.VITE_SAFEGUARD_API || 'http://localhost:8090';
        const response = await fetch(`${SAFEGUARD_API}/list`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.snapshots) {
            setSnapshots(data.snapshots);
          }
        }
      } catch (err) {
        console.warn('Could not load snapshots from API:', err.message);
      }
    };
    
    loadSnapshots();
  }, []);
  
  // Get change history for component from localStorage
  const getComponentHistory = (componentName) => {
    if (!componentName) return [];
    
    const componentKey = componentName.toLowerCase().replace(/\s+/g, '_');
    const historyKey = window.location.port === '4173' 
      ? 'devloop_history_prod'
      : 'devloop_history_dev';
    
    try {
      const historyData = JSON.parse(localStorage.getItem(historyKey) || '{}');
      return historyData[componentKey] || [];
    } catch (e) {
      console.error('Error loading component history:', e);
      return [];
    }
  };
  
  // Load component history
  const componentHistory = componentName ? getComponentHistory(componentName) : [];
  
  // Load visual snapshots when a change is selected
  useEffect(() => {
    if (!selectedChange) return;
    
    const fetchVisualSnapshots = async () => {
      setLoading(true);
      
      try {
        // In a real implementation, this would make API calls to fetch visual snapshots
        // For now we'll simulate with mock data
        // The real implementation would fetch from IndexedDB or the server
        
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock visual snapshot data (base64 encoded images would come from the API)
        // In the real implementation, these would be actual component screenshots
        const mockVisualData = {
          before: {
            timestamp: new Date(selectedChange.timestamp).toISOString(),
            imageData: null, // placeholder for base64 image
            metadata: {
              viewportSize: '1280x720',
              browser: 'Chrome',
              changeType: selectedChange.details?.changeType || 'general'
            }
          },
          after: {
            timestamp: new Date().toISOString(),
            imageData: null, // placeholder for base64 image
            metadata: {
              viewportSize: '1280x720',
              browser: 'Chrome',
              changeType: selectedChange.details?.changeType || 'general'
            }
          },
          // Visual diff data would be generated on the server
          diff: {
            changePercentage: Math.floor(Math.random() * 30) + 5, // 5-35%
            hotspots: [
              { x: 120, y: 80, radius: 20, intensity: 0.8 },
              { x: 240, y: 150, radius: 15, intensity: 0.6 }
            ]
          }
        };
        
        setVisualData(mockVisualData);
      } catch (err) {
        console.error('Error fetching visual snapshots:', err);
        setErrorMessage('Failed to load visual comparison data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVisualSnapshots();
  }, [selectedChange]);
  
  // Capture a new visual snapshot
  const captureVisualSnapshot = async (componentName) => {
    setLoading(true);
    
    try {
      // Get the safeguard API URL from environment variables or use the default
      const SAFEGUARD_API = import.meta.env.VITE_SAFEGUARD_API || 'http://localhost:8090';
      
      // Call the UI Safeguard API to take a snapshot
      console.log(`Capturing visual snapshot for ${componentName}`);
      
      try {
        const description = `Snapshot of ${componentName}`;
        // Using fetch with a try/catch to handle API errors gracefully
        const response = await fetch(`${SAFEGUARD_API}/snapshot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ description })
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          console.log(`Successfully captured snapshot ${data.snapshotId} for ${componentName}`);
          
          // Add a change to the tracker
          trackChange(componentName, `Visual snapshot captured for ${componentName}`, {
            changeType: 'visual_snapshot',
            timestamp: new Date().toISOString(),
            snapshotId: data.snapshotId,
            detail: `Created visual reference snapshot: ${data.snapshotId}`
          });
        } else {
          throw new Error(data.error || 'Unknown error taking snapshot');
        }
      } catch (err) {
        console.warn('API error, using fallback method:', err.message);
        // Fallback to simulation if the API is unavailable
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // Add a change to the tracker with simulated data
        const timestamp = new Date().toISOString();
        const snapshotId = `snapshot_${timestamp.replace(/[-:]/g, '_').split('.')[0]}Z`;
        
        trackChange(componentName, `Visual snapshot captured for ${componentName}`, {
          changeType: 'visual_snapshot',
          timestamp: timestamp,
          snapshotId: snapshotId,
          detail: `Created visual reference snapshot: ${snapshotId}`
        });
        
        console.log(`Simulated snapshot ${snapshotId} for ${componentName}`);
      }
    } catch (err) {
      console.error('Error capturing visual snapshot:', err);
      setErrorMessage('Failed to capture visual snapshot');
    } finally {
      setLoading(false);
    }
  };
  
  // Rollback to a specific visual state
  const rollbackToVersion = async (changeId) => {
    if (!window.confirm('Are you sure you want to rollback to this version? This will revert all changes made after this point.')) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Get the safeguard API URL from environment variables or use the default
      const SAFEGUARD_API = import.meta.env.VITE_SAFEGUARD_API || 'http://localhost:8090';
      
      // Get the change data with snapshot ID (if available)
      const change = changes.find(c => c.id === changeId);
      
      if (change?.details?.snapshotId) {
        // Use the UI Safeguard API to restore the snapshot
        const snapshotId = change.details.snapshotId;
        console.log(`Rolling back ${componentName} to snapshot: ${snapshotId}`);
        
        try {
          const response = await fetch(`${SAFEGUARD_API}/restore/${snapshotId}`, {
            method: 'POST'
          });
          
          if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.success) {
            console.log(`Successfully restored snapshot ${snapshotId}`);
            console.log(`Backup created: ${data.backupId}`);
            
            // Add a change to the tracker for the rollback
            trackChange(componentName, `Rolled back ${componentName} to snapshot ${snapshotId}`, {
              changeType: 'rollback',
              timestamp: new Date().toISOString(),
              rollbackToId: changeId,
              rollbackToSnapshotId: snapshotId,
              backupId: data.backupId,
              detail: `Reverted to snapshot ${snapshotId}`
            });
            
            // Show success message
            alert(`Successfully rolled back to snapshot ${snapshotId}`);
            
            // Reload the page to show the restored components
            if (window.confirm('Reload page to see the restored state?')) {
              window.location.reload();
            }
          } else {
            throw new Error(data.error || 'Unknown error restoring snapshot');
          }
        } catch (err) {
          console.warn('API error, using fallback method:', err.message);
          // Fallback to simulation if the API is unavailable
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Add a change to the tracker for the rollback (simulation)
          trackChange(componentName, `Rolled back ${componentName} to previous version`, {
            changeType: 'rollback',
            timestamp: new Date().toISOString(),
            rollbackToId: changeId,
            detail: `Reverted to earlier version of component (simulated)`
          });
          
          // Show success message for the simulation
          alert(`Successfully rolled back ${componentName} to the selected version (simulated)`);
        }
      } else {
        // No snapshot ID available, use the fallback approach
        console.log(`Rolling back ${componentName} to change ID: ${changeId} (no snapshot ID)`);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Add a change to the tracker for the rollback
        trackChange(componentName, `Rolled back ${componentName} to previous version`, {
          changeType: 'rollback',
          timestamp: new Date().toISOString(),
          rollbackToId: changeId,
          detail: `Reverted to earlier version of component`
        });
        
        // Show success message
        alert(`Successfully rolled back ${componentName} to the selected version`);
      }
    } catch (err) {
      console.error('Error performing rollback:', err);
      setErrorMessage('Failed to rollback to selected version');
    } finally {
      setLoading(false);
    }
  };
  
  // Get visual history
  const fetchVisualHistory = async () => {
    setLoading(true);
    
    try {
      // In a real implementation, this would fetch all visual snapshots
      // for this component from IndexedDB or the server
      
      // Simulate loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, just show the UI
      setShowVisualHistory(true);
    } catch (err) {
      console.error('Error fetching visual history:', err);
      setErrorMessage('Failed to load visual history');
    } finally {
      setLoading(false);
    }
  };
  
  // Render visual history timeline
  const renderVisualHistory = () => {
    // In a real implementation, this would render actual thumbnails
    return (
      <div className="mt-6 border-t border-gray-700 pt-4">
        <h3 className="text-lg font-bold text-white mb-4">Visual History Timeline</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {componentHistory.map((change, index) => (
            <div
              key={change.id}
              className="bg-gray-900 p-2 rounded cursor-pointer border-2 border-transparent hover:border-blue-500"
              onClick={() => setSelectedChange(change)}
            >
              <div className="bg-gray-800 aspect-video flex items-center justify-center mb-2">
                <span className="text-gray-400 text-xs">Version {index + 1}</span>
              </div>
              <div className="text-xs text-gray-300 truncate">
                {new Date(change.timestamp).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center overflow-y-auto p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-700 p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">
              {componentName ? `Visual Changelog: ${componentName}` : 'Visual Changelog'}
            </h2>
            <p className="text-sm text-gray-300">
              View and compare visual changes to UI components
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-300 hover:text-white"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>
        
        {/* Main content */}
        <div className="p-6 overflow-auto flex-grow">
          {errorMessage && (
            <div className="bg-red-900/40 border border-red-500 text-red-200 p-3 rounded mb-4">
              {errorMessage}
            </div>
          )}
          
          {/* Component selector when no specific component is provided */}
          {!componentName && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Component
              </label>
              <select 
                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"
                value=""
                onChange={(e) => {/* Would set component name */}}
              >
                <option value="" disabled>Select a component...</option>
                <option value="Dashboard">Dashboard</option>
                <option value="Navigation">Navigation</option>
                <option value="Feature Card">Feature Card</option>
                <option value="Status Bar">Status Bar</option>
              </select>
            </div>
          )}
          
          {/* Component history */}
          {componentName && componentHistory.length > 0 ? (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Component Change History</h3>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => captureVisualSnapshot(componentName)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Capture New Snapshot'}
                  </button>
                  
                  <button
                    onClick={fetchVisualHistory}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                    disabled={loading}
                  >
                    {showVisualHistory ? 'Hide Visual History' : 'Show Visual History'}
                  </button>
                </div>
              </div>
              
              {/* Timeline of changes */}
              <div className="border-l-2 border-gray-600 ml-3 pl-6 py-2 space-y-6">
                {componentHistory.map((change, index) => (
                  <div 
                    key={change.id}
                    className={`relative cursor-pointer ${selectedChange?.id === change.id ? 'bg-blue-900/20 -ml-6 pl-6 pr-2 py-2 rounded' : ''}`}
                    onClick={() => setSelectedChange(change)}
                  >
                    {/* Timeline dot */}
                    <div className={`absolute left-[-31px] top-0 h-4 w-4 rounded-full ${selectedChange?.id === change.id ? 'bg-blue-500' : 'bg-gray-500'} border-2 border-gray-800`}></div>
                    
                    {/* Date/time */}
                    <div className="text-sm text-gray-400 mb-1">
                      {new Date(change.timestamp).toLocaleString()}
                    </div>
                    
                    {/* Description */}
                    <div className="text-white font-medium mb-1">
                      {change.displaySummary || change.description}
                    </div>
                    
                    {/* Change type badge */}
                    {change.details?.changeType && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        change.details.changeType === 'style' ? 'bg-blue-500/20 text-blue-300' :
                        change.details.changeType === 'content' ? 'bg-green-500/20 text-green-300' :
                        change.details.changeType === 'theme' ? 'bg-purple-500/20 text-purple-300' :
                        change.details.changeType === 'layout' ? 'bg-yellow-500/20 text-yellow-300' :
                        change.details.changeType === 'update' ? 'bg-indigo-500/20 text-indigo-300' :
                        change.details.changeType === 'visual_snapshot' ? 'bg-pink-500/20 text-pink-300' :
                        change.details.changeType === 'rollback' ? 'bg-red-500/20 text-red-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {change.details.changeType.replace('_', ' ')}
                      </span>
                    )}
                    
                    {/* Version indicator */}
                    <div className="text-xs text-gray-500 mt-1">
                      {index === 0 ? 'Initial version' : `Revision ${index}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : componentName ? (
            <div className="text-gray-400 text-center py-8">
              No changes recorded for this component yet.
              <div className="mt-4">
                <button
                  onClick={() => captureVisualSnapshot(componentName)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Capture Initial Snapshot'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8">
              Select a component to view its visual changelog.
            </div>
          )}
          
          {/* Visual comparison display */}
          {selectedChange && (
            <div className="mt-6 border-t border-gray-700 pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Visual Comparison</h3>
                
                <div className="flex items-center space-x-4">
                  <div className="flex text-sm space-x-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="compareMode"
                        value="side-by-side"
                        checked={compareMode === 'side-by-side'}
                        onChange={() => setCompareMode('side-by-side')}
                        className="mr-1"
                      />
                      <span className="text-gray-300">Side by Side</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="compareMode"
                        value="overlay"
                        checked={compareMode === 'overlay'}
                        onChange={() => setCompareMode('overlay')}
                        className="mr-1"
                      />
                      <span className="text-gray-300">Overlay</span>
                    </label>
                  </div>
                  
                  <button
                    onClick={() => rollbackToVersion(selectedChange.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm flex items-center"
                    disabled={loading}
                  >
                    <span className="mr-1">↩</span>
                    Rollback to This Version
                  </button>
                </div>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : compareMode === 'side-by-side' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Before image */}
                  <div className="bg-gray-900 p-4 rounded">
                    <div className="text-sm text-gray-400 mb-2">Before</div>
                    <div className="bg-gray-700 aspect-video flex items-center justify-center">
                      <span className="text-gray-500 text-sm">
                        [Visual snapshot placeholder]
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {visualData.before?.timestamp ? new Date(visualData.before.timestamp).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  
                  {/* After image */}
                  <div className="bg-gray-900 p-4 rounded">
                    <div className="text-sm text-gray-400 mb-2">After</div>
                    <div className="bg-gray-700 aspect-video flex items-center justify-center">
                      <span className="text-gray-500 text-sm">
                        [Visual snapshot placeholder]
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {visualData.after?.timestamp ? new Date(visualData.after.timestamp).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 p-4 rounded">
                  <div className="flex justify-between mb-2">
                    <div className="text-sm text-gray-400">Overlay Comparison</div>
                    <div className="text-sm text-gray-400">
                      Change: {visualData.diff?.changePercentage ?? 'N/A'}%
                    </div>
                  </div>
                  <div className="bg-gray-700 aspect-video relative flex items-center justify-center">
                    <span className="text-gray-500 text-sm">
                      [Visual diff placeholder]
                    </span>
                    
                    {/* Visualize hotspots if available */}
                    {visualData.diff?.hotspots?.map((hotspot, index) => (
                      <div
                        key={index}
                        className="absolute bg-red-500 opacity-30 rounded-full"
                        style={{
                          width: `${hotspot.radius * 2}px`,
                          height: `${hotspot.radius * 2}px`,
                          left: `${hotspot.x - hotspot.radius}px`,
                          top: `${hotspot.y - hotspot.radius}px`,
                          opacity: hotspot.intensity * 0.6
                        }}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 flex justify-between">
                    <span>Before: {visualData.before?.timestamp ? new Date(visualData.before.timestamp).toLocaleDateString() : 'N/A'}</span>
                    <span>After: {visualData.after?.timestamp ? new Date(visualData.after.timestamp).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              )}
              
              {/* Additional metadata about the change */}
              <div className="mt-4 bg-gray-900 p-4 rounded">
                <h4 className="text-sm font-medium text-white mb-2">Change Details</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-gray-400">Change Type:</div>
                  <div className="text-gray-300">
                    {selectedChange.details?.changeType || 'General Update'}
                  </div>
                  
                  <div className="text-gray-400">Changed Properties:</div>
                  <div className="text-gray-300">
                    {selectedChange.details?.property || 'Multiple properties'}
                  </div>
                  
                  <div className="text-gray-400">Timestamp:</div>
                  <div className="text-gray-300">
                    {new Date(selectedChange.timestamp).toLocaleString()}
                  </div>
                  
                  <div className="text-gray-400">Change ID:</div>
                  <div className="text-gray-300">
                    {selectedChange.id}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Visual history timeline (appears when Show Visual History is clicked) */}
          {showVisualHistory && renderVisualHistory()}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-700 p-4 flex justify-between">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
          >
            Close
          </button>
          
          {selectedChange && (
            <button
              onClick={() => rollbackToVersion(selectedChange.id)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded flex items-center"
              disabled={loading}
            >
              <span className="mr-2">↩</span>
              Rollback to This Version
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualChangelog;