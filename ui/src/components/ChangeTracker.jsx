import React, { useState, useEffect, createContext, useContext } from 'react';

// Create a context for the enhanced change tracker
const ChangeTrackerContext = createContext({
  trackChange: () => null,
  trackComponentUpdate: () => null,
  trackStyleChange: () => null,
  trackContentChange: () => null,
  trackColorTheme: () => null,
  trackLayoutChange: () => null,
  changes: [],
  registerComponent: () => null,
});

// Provider component to wrap the application
export const ChangeTrackerProvider = ({ children }) => {
  const [changes, setChanges] = useState([]);
  const [environment, setEnvironment] = useState('development');
  const [showChanges, setShowChanges] = useState(false);

  // Detect environment based on URL port
  useEffect(() => {
    const isProduction = window.location.port === '4173';
    setEnvironment(isProduction ? 'production' : 'development');
  }, []);

  // State for tracking the history of changes by component
  const [changeHistory, setChangeHistory] = useState({});
  
  // Check if there are too many changes and clean up if needed
  useEffect(() => {
    const storageKey = environment === 'production' 
      ? 'devloop_changes_prod' 
      : 'devloop_changes_dev';
    
    const historyKey = environment === 'production'
      ? 'devloop_history_prod'
      : 'devloop_history_dev';
    
    const storedChanges = localStorage.getItem(storageKey) || '[]';
    const storedHistory = localStorage.getItem(historyKey) || '{}';
    
    try {
      const parsedChanges = JSON.parse(storedChanges);
      
      // If there are too many changes (more than 50), reset them
      if (parsedChanges.length > 50) {
        console.warn('Too many tracked changes detected, cleaning up');
        // Instead of completely clearing, keep the last 20 changes
        const trimmedChanges = parsedChanges.slice(-20);
        localStorage.setItem(storageKey, JSON.stringify(trimmedChanges));
        setChanges(trimmedChanges);
        return;
      }
      
      // Load change history
      try {
        const parsedHistory = JSON.parse(storedHistory);
        setChangeHistory(parsedHistory);
      } catch (e) {
        console.error('Error parsing change history', e);
        setChangeHistory({});
        localStorage.setItem(historyKey, '{}');
      }
      
      // Otherwise load changes normally
      setChanges(parsedChanges);
    } catch (e) {
      console.error('Error parsing stored changes', e);
      localStorage.removeItem('devloop_changes_dev');
      localStorage.removeItem('devloop_changes_prod');
      setChanges([]);
    }
  }, [environment]);

  // Record a new change with limits and enhanced details
  const trackChange = (component, description, detailedData = null, featureContext = null) => {
    // Check if we're about to exceed the maximum number of changes
    if (changes.length >= 50) {
      console.warn('Maximum change tracking limit reached, not tracking new changes');
      return Date.now();
    }
    
    // Create the new change with enhanced information
    const newChange = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      component,
      description,
      details: detailedData,
      environment,
      category: detailedData?.changeType || 'general',
      // Better display information for UI
      displaySummary: detailedData?.detail || description,
      // Feature context if provided
      featureId: featureContext?.featureId || null,
      featureName: featureContext?.featureName || null,
      milestone: featureContext?.milestone || null,
      phase: featureContext?.phase || null,
      module: featureContext?.module || null,
      tags: featureContext?.tags || [],
      relatedTo: featureContext?.relatedTo || [],
      type: featureContext?.type || 'frontend'
    };
    
    // Check for duplicate changes (same component and similar description)
    const isDuplicate = changes.some(change => 
      change.component === component && 
      change.description === description &&
      JSON.stringify(change.details) === JSON.stringify(detailedData)
    );
    
    if (isDuplicate) {
      console.log('Duplicate change detected, not tracking:', newChange);
      return Date.now();
    }
    
    // Add the new change
    const updatedChanges = [...changes, newChange];
    setChanges(updatedChanges);
    
    // Update the change history for this component
    const componentKey = component.toLowerCase().replace(/\s+/g, '_');
    const componentHistory = changeHistory[componentKey] || [];
    
    // Add this change to the component's history
    const updatedHistory = {
      ...changeHistory,
      [componentKey]: [
        ...componentHistory,
        {
          id: newChange.id,
          timestamp: newChange.timestamp,
          description: description,
          details: detailedData,
          displaySummary: newChange.displaySummary
        }
      ]
    };
    
    // Update history state
    setChangeHistory(updatedHistory);
    
    // Save changes to localStorage
    const storageKey = environment === 'production' 
      ? 'devloop_changes_prod' 
      : 'devloop_changes_dev';
    
    // Save history to localStorage
    const historyKey = environment === 'production'
      ? 'devloop_history_prod'
      : 'devloop_history_dev';
    
    localStorage.setItem(storageKey, JSON.stringify(updatedChanges));
    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
    
    console.log('Change tracked:', newChange);
    console.log('Component history updated:', componentKey, updatedHistory[componentKey]);
    
    return newChange.id;
  };

  // Generate changelog for production deployment
  const generateChangelog = () => {
    // Filter for only development changes
    const devChanges = changes.filter(change => change.environment === 'development');
    
    if (devChanges.length === 0) {
      return 'No changes to deploy to production.';
    }
    
    // Group changes by component
    const changesByComponent = devChanges.reduce((acc, change) => {
      if (!acc[change.component]) {
        acc[change.component] = [];
      }
      acc[change.component].push(change);
      return acc;
    }, {});
    
    // Format the changelog
    let changelog = '# Changes for Production Deployment\n\n';
    
    Object.keys(changesByComponent).forEach(component => {
      changelog += `## ${component}\n\n`;
      
      changesByComponent[component].forEach(change => {
        const date = new Date(change.timestamp).toLocaleDateString();
        changelog += `- ${change.description} (${date})\n`;
      });
      
      changelog += '\n';
    });
    
    return changelog;
  };

  // Clear tracked changes
  const clearChanges = () => {
    if (window.confirm('Are you sure you want to clear all tracked changes?')) {
      setChanges([]);
      
      const storageKey = environment === 'production' 
        ? 'devloop_changes_prod' 
        : 'devloop_changes_dev';
      
      localStorage.setItem(storageKey, '[]');
    }
  };

  // Copy changelog to clipboard
  const copyChangelog = () => {
    const changelog = generateChangelog();
    navigator.clipboard.writeText(changelog)
      .then(() => window.alert('Changelog copied to clipboard!'))
      .catch(err => console.error('Failed to copy changelog', err));
  };

  // Track a component update with specific change details
  const trackComponentUpdate = (componentName, before, after, changeType = 'update', featureContext = null) => {
    // Create a more structured change description
    const description = `${changeType === 'update' ? 'Updated' : 'Created'} ${componentName} component`;
    
    // Create a detailed change object with before/after state
    const detailedChange = {
      componentName,
      changeType,
      before,
      after,
      detail: `Changed from "${before}" to "${after}"`,
    };
    
    // Track the change with additional metadata
    return trackChange(componentName, description, detailedChange, featureContext);
  };
  
  // Track a style change
  const trackStyleChange = (componentName, property, oldValue, newValue, featureContext = null) => {
    const description = `Style changed: ${property} in ${componentName}`;
    
    const detailedChange = {
      componentName,
      changeType: 'style',
      property,
      oldValue,
      newValue,
      detail: `Changed ${property} from "${oldValue}" to "${newValue}"`,
      timestamp: new Date().toISOString(),
    };
    
    return trackChange(componentName, description, detailedChange, featureContext);
  };
  
  // Track a color theme change
  const trackColorTheme = (componentName, theme, colorPalette, featureContext = null) => {
    const description = `Applied ${theme} theme to ${componentName}`;
    
    const detailedChange = {
      componentName,
      changeType: 'theme',
      theme,
      colorPalette,
      detail: `Applied ${theme} color theme`,
      timestamp: new Date().toISOString(),
    };
    
    return trackChange(componentName, description, detailedChange, featureContext);
  };
  
  // Track a layout change
  const trackLayoutChange = (componentName, oldLayout, newLayout, featureContext = null) => {
    const description = `Layout changed in ${componentName}`;
    
    const detailedChange = {
      componentName,
      changeType: 'layout',
      oldLayout,
      newLayout,
      detail: `Changed layout from ${oldLayout} to ${newLayout}`,
      timestamp: new Date().toISOString(),
    };
    
    return trackChange(componentName, description, detailedChange, featureContext);
  };
  
  // Track a content change
  const trackContentChange = (componentName, oldContent, newContent, featureContext = null) => {
    const description = `Content updated in ${componentName}`;
    
    const detailedChange = {
      componentName,
      changeType: 'content',
      oldContent,
      newContent,
      detail: `Content changed from "${oldContent}" to "${newContent}"`,
    };
    
    return trackChange(componentName, description, detailedChange, featureContext);
  };
  
  // Register a component for automated change tracking
  const registerComponent = (componentName, initialProps = {}) => {
    console.log(`Component registered for tracking: ${componentName}`);
    // This allows for future automatic diff tracking on component updates
    return componentName;
  };
  
  // Create context value with enhanced tracking methods
  const contextValue = {
    trackChange,
    trackComponentUpdate,
    trackStyleChange,
    trackContentChange,
    trackColorTheme,
    trackLayoutChange,
    registerComponent,
    changes,
    environment,
    showChanges,
    setShowChanges, // Expose the state setter for the header button
  };

  // New state for managing approvals
  const [approvedChanges, setApprovedChanges] = useState([]);
  const [rejectedChanges, setRejectedChanges] = useState([]);
  const [editingChange, setEditingChange] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showPushDialog, setShowPushDialog] = useState(false);

  // Handle approving a change
  const approveChange = (changeId) => {
    const change = changes.find(c => c.id === changeId);
    setApprovedChanges([...approvedChanges, changeId]);
    // Remove from rejected if it was there
    setRejectedChanges(rejectedChanges.filter(id => id !== changeId));
  };

  // Handle rejecting a change
  const rejectChange = (changeId) => {
    const change = changes.find(c => c.id === changeId);
    setRejectedChanges([...rejectedChanges, changeId]);
    // Remove from approved if it was there
    setApprovedChanges(approvedChanges.filter(id => id !== changeId));
  };

  // Start editing a change
  const startEditing = (change) => {
    setEditingChange(change.id);
    setEditValue(change.description);
  };

  // Save edited change
  const saveEdit = (changeId) => {
    const updatedChanges = changes.map(change => 
      change.id === changeId ? {...change, description: editValue} : change
    );
    setChanges(updatedChanges);
    
    const storageKey = environment === 'production' 
      ? 'devloop_changes_prod' 
      : 'devloop_changes_dev';
    
    localStorage.setItem(storageKey, JSON.stringify(updatedChanges));
    setEditingChange(null);
  };

  // Push approved changes to production
  const pushChanges = () => {
    // This is where you would implement the actual push logic
    // For now, we'll just show a dialog confirming the push
    setShowPushDialog(true);
  };

  // Simulate pushing to production
  const confirmPush = () => {
    // Only keep approved changes
    const filteredChanges = changes.filter(change => approvedChanges.includes(change.id));
    setChanges(filteredChanges);
    
    const storageKey = environment === 'production' 
      ? 'devloop_changes_prod' 
      : 'devloop_changes_dev';
    
    localStorage.setItem(storageKey, JSON.stringify(filteredChanges));
    setShowPushDialog(false);
    
    // Mark as successfully pushed
    window.alert('Changes successfully pushed to production!');
  };

  // Get change status
  const getChangeStatus = (changeId) => {
    if (approvedChanges.includes(changeId)) return 'approved';
    if (rejectedChanges.includes(changeId)) return 'rejected';
    return 'pending';
  };
  
  // Get change history for a component
  const getComponentHistory = (componentName) => {
    const componentKey = componentName.toLowerCase().replace(/\s+/g, '_');
    return changeHistory[componentKey] || [];
  };
  
  // State for showing history modal
  const [showingHistoryFor, setShowingHistoryFor] = useState(null);

  return (
    <ChangeTrackerContext.Provider value={contextValue}>
      {children}
      
      {showChanges && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="bg-gray-700 p-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {environment === 'development' ? 'Review UI Changes' : 'UI Changelog'}
                </h2>
                <p className="text-sm text-gray-300">
                  {environment === 'development' 
                    ? 'Approve changes before deploying to production' 
                    : 'Deployed UI changes'}
                </p>
              </div>
              <button 
                onClick={() => setShowChanges(false)}
                className="text-gray-300 hover:text-white"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            
            <div className="p-4 overflow-auto flex-grow">
              {changes.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  {environment === 'development' 
                    ? 'No changes have been tracked yet.' 
                    : 'No changes in this release.'}
                </p>
              ) : environment === 'development' ? (
                <div className="space-y-4">
                  {changes.map(change => {
                    const status = getChangeStatus(change.id);
                    return (
                      <div 
                        key={change.id} 
                        className={`p-4 rounded-md border-l-4 ${
                          status === 'approved' ? 'border-green-500 bg-gray-700/70' : 
                          status === 'rejected' ? 'border-red-500 bg-gray-700/70 opacity-70' : 
                          'border-blue-500 bg-gray-700'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center">
                              <div className="text-blue-400 font-medium text-lg">
                                {change.component}
                              </div>
                              {status === 'approved' && (
                                <span className="ml-2 bg-green-500/20 text-green-400 text-xs py-1 px-2 rounded-full">
                                  Approved
                                </span>
                              )}
                              {status === 'rejected' && (
                                <span className="ml-2 bg-red-500/20 text-red-400 text-xs py-1 px-2 rounded-full">
                                  Declined
                                </span>
                              )}
                              
                              {/* Show history badge if this component has multiple changes */}
                              {getComponentHistory(change.component).length > 1 && (
                                <span className="ml-2 bg-blue-500/20 text-blue-400 text-xs py-1 px-2 rounded-full flex items-center cursor-pointer"
                                  onClick={() => setShowingHistoryFor(change.component)}
                                >
                                  <span className="mr-1">📜</span>
                                  History ({getComponentHistory(change.component).length})
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-400">
                              {new Date(change.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => startEditing(change)}
                              className="text-gray-400 hover:text-white"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setShowingHistoryFor(change.component)}
                              className="text-gray-400 hover:text-white"
                              title="View History"
                            >
                              📜
                            </button>
                          </div>
                        </div>
                        
                        {editingChange === change.id ? (
                          <div className="mb-3">
                            <textarea 
                              className="w-full bg-gray-900 text-white p-2 rounded-md border border-gray-600"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              rows={3}
                            />
                            <div className="flex justify-end mt-2 space-x-2">
                              <button 
                                onClick={() => setEditingChange(null)}
                                className="px-3 py-1 bg-gray-600 text-white rounded-md"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={() => saveEdit(change.id)}
                                className="px-3 py-1 bg-blue-600 text-white rounded-md"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-white text-md mb-3">
                            {/* Better display information */}
                            <div>{change.displaySummary || change.description}</div>
                            
                            {/* Show detailed change info if available */}
                            {change.details && (
                              <div className="mt-2 p-2 bg-gray-900 rounded text-sm">
                                {change.details.changeType === 'style' && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">{change.details.property}:</span>
                                    <span className="text-red-400">{change.details.oldValue}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-green-400">{change.details.newValue}</span>
                                  </div>
                                )}
                                
                                {change.details.changeType === 'content' && (
                                  <div>
                                    <div className="text-gray-400 mb-1">Content change:</div>
                                    <div className="text-red-400 line-through">{change.details.oldContent}</div>
                                    <div className="text-green-400">{change.details.newContent}</div>
                                  </div>
                                )}
                                
                                {change.details.changeType === 'theme' && (
                                  <div>
                                    <div className="text-gray-400 mb-1">Theme change:</div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {Object.entries(change.details.colorPalette).map(([key, value]) => (
                                        <div key={key} className="flex items-center">
                                          <div 
                                            className="w-4 h-4 rounded-full mr-1" 
                                            style={{ backgroundColor: value }}
                                          ></div>
                                          <span className="text-xs text-gray-300">{key}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {change.details.changeType === 'layout' && (
                                  <div>
                                    <div className="text-gray-400 mb-1">Layout change:</div>
                                    <div className="flex items-center">
                                      <span className="text-red-400">{change.details.oldLayout}</span>
                                      <span className="mx-2">→</span>
                                      <span className="text-green-400">{change.details.newLayout}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {change.category === 'update' && (
                                  <div>
                                    <div className="text-gray-400">Updated:</div>
                                    <div className="text-red-400 line-through">{change.details.before}</div>
                                    <div className="text-green-400">{change.details.after}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {!editingChange && status !== 'approved' && status !== 'rejected' && (
                          <div className="flex justify-end space-x-2">
                            <button 
                              onClick={() => rejectChange(change.id)}
                              className="px-3 py-1 bg-gray-700 hover:bg-red-700 text-white rounded-md flex items-center"
                            >
                              <span className="mr-1">👎</span> Decline
                            </button>
                            <button 
                              onClick={() => approveChange(change.id)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center"
                            >
                              <span className="mr-1">👍</span> Approve
                            </button>
                          </div>
                        )}
                        
                        {!editingChange && (status === 'approved' || status === 'rejected') && (
                          <div className="flex justify-end">
                            <button 
                              onClick={() => {
                                if (status === 'approved') {
                                  setApprovedChanges(approvedChanges.filter(id => id !== change.id));
                                } else {
                                  setRejectedChanges(rejectedChanges.filter(id => id !== change.id));
                                }
                              }}
                              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm"
                            >
                              Reset Status
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-gray-300 font-mono text-sm">
                  {generateChangelog()}
                </pre>
              )}
            </div>
            
            <div className="bg-gray-700 p-4">
              <h3 className="text-sm text-gray-300 font-medium mb-3">Action Buttons</h3>
              {environment === 'development' ? (
                <>
                  <div className="flex space-x-3">
                    <button 
                      onClick={clearChanges}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center justify-center"
                      title="Remove all tracked changes"
                    >
                      <span className="mr-1">🗑️</span> Clear All Changes
                    </button>
                    <button 
                      onClick={copyChangelog}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center"
                      title="Copy formatted change log to clipboard"
                    >
                      <span className="mr-1">📋</span> Generate Changelog
                    </button>
                    <button 
                      onClick={pushChanges}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center justify-center"
                      disabled={approvedChanges.length === 0}
                      title={approvedChanges.length === 0 ? "Approve changes first" : "Deploy approved changes to production"}
                    >
                      <span className="mr-2">🚀</span>
                      Push to Production
                      <span className="ml-2 bg-white text-green-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        {approvedChanges.length}
                      </span>
                    </button>
                  </div>
                </>
              ) : (
                <button 
                  onClick={copyChangelog}
                  className="ml-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  Copy to Clipboard
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Component Change History Modal */}
      {showingHistoryFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                Change History: {showingHistoryFor}
              </h3>
              <button 
                onClick={() => setShowingHistoryFor(null)}
                className="text-gray-300 hover:text-white"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            
            {/* Timeline of changes */}
            <div className="border-l-2 border-gray-600 ml-3 pl-8 py-2 space-y-6 max-h-96 overflow-y-auto">
              {getComponentHistory(showingHistoryFor).map((historyItem, index) => (
                <div 
                  key={historyItem.id}
                  className="relative"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-[-31px] top-0 h-4 w-4 rounded-full bg-blue-500 border-2 border-gray-800"></div>
                  
                  {/* Date/time */}
                  <div className="text-sm text-gray-400 mb-1">
                    {new Date(historyItem.timestamp).toLocaleString()}
                  </div>
                  
                  {/* Description */}
                  <div className="text-white font-medium">
                    {historyItem.displaySummary || historyItem.description}
                  </div>
                  
                  {/* Details if available */}
                  {historyItem.details && (
                    <div className="mt-2 p-2 bg-gray-900 rounded text-sm">
                      {historyItem.details.changeType === 'style' && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">{historyItem.details.property}:</span>
                          <span className="text-red-400">{historyItem.details.oldValue}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-400">{historyItem.details.newValue}</span>
                        </div>
                      )}
                      
                      {historyItem.details.changeType === 'content' && (
                        <div>
                          <div className="text-gray-400 mb-1">Content change:</div>
                          <div className="text-red-400 line-through">{historyItem.details.oldContent}</div>
                          <div className="text-green-400">{historyItem.details.newContent}</div>
                        </div>
                      )}
                      
                      {historyItem.details.changeType === 'theme' && (
                        <div>
                          <div className="text-gray-400 mb-1">Theme change to {historyItem.details.theme}:</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(historyItem.details.colorPalette || {}).map(([key, value]) => (
                              <div key={key} className="flex items-center">
                                <div 
                                  className="w-4 h-4 rounded-full mr-1" 
                                  style={{ backgroundColor: value }}
                                ></div>
                                <span className="text-xs text-gray-300">{key}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {historyItem.details.changeType === 'layout' && (
                        <div>
                          <div className="text-gray-400 mb-1">Layout change:</div>
                          <div className="flex items-center">
                            <span className="text-red-400">{historyItem.details.oldLayout}</span>
                            <span className="mx-2">→</span>
                            <span className="text-green-400">{historyItem.details.newLayout}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Version indicator */}
                  <div className="text-xs text-gray-500 mt-1">
                    {index === 0 ? 'Initial version' : `Revision ${index}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Push Confirmation Dialog */}
      {showPushDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Push to Production</h3>
            <p className="text-gray-300 mb-4">
              You are about to push {approvedChanges.length} approved change{approvedChanges.length !== 1 ? 's' : ''} to production.
            </p>
            <p className="text-gray-300 mb-6">
              {rejectedChanges.length > 0 ? 
                `${rejectedChanges.length} declined change${rejectedChanges.length !== 1 ? 's' : ''} will be discarded.` :
                'All changes have been approved.'
              }
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowPushDialog(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
              >
                Cancel
              </button>
              <button 
                onClick={confirmPush}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
              >
                Confirm Push
              </button>
            </div>
          </div>
        </div>
      )}
    </ChangeTrackerContext.Provider>
  );
};

// Hook to use the change tracker
export const useChangeTracker = () => {
  return useContext(ChangeTrackerContext);
};

// For backward compatibility
export const getChangeTracker = () => {
  return {
    trackChange: (component, description) => {
      console.log('Tracking change:', component, description);
      // This is just a stub - the actual tracking will be done through the context
      return null;
    }
  };
};

// Simple component that just displays the UI (hidden since we use the header button)
const ChangeTracker = () => {
  // No visible UI - the header has the button now
  return null;
};

export default ChangeTracker;