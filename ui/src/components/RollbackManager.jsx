import React, { useState, useEffect, createContext, useContext } from 'react';
import { useChangeTracker } from './ChangeTracker.jsx';
import { 
  getSnapshotsByComponent, 
  getSnapshot, 
  captureElement, 
  generateVisualDiff
} from '../utils/VisualSnapshot.js';

// Create a context for the rollback manager
const RollbackManagerContext = createContext({
  captureComponentState: () => null,
  rollbackComponent: () => null,
  getRollbackHistory: () => [],
  getComponentSnapshots: () => [],
  compareSnapshots: () => null,
  rollbackInProgress: false,
  rollbackHistory: []
});

// Provider component for rollback capabilities
export const RollbackManagerProvider = ({ children }) => {
  const [rollbackInProgress, setRollbackInProgress] = useState(false);
  const [rollbackHistory, setRollbackHistory] = useState([]);
  const [rollbackRegistry, setRollbackRegistry] = useState({});
  const [registeredComponents, setRegisteredComponents] = useState([]);
  
  // Get the change tracker context
  const { trackChange } = useChangeTracker();
  
  // Initialize from localStorage
  useEffect(() => {
    try {
      const storedRegistry = localStorage.getItem('devloop_rollback_registry');
      if (storedRegistry) {
        setRollbackRegistry(JSON.parse(storedRegistry));
      }
      
      const storedHistory = localStorage.getItem('devloop_rollback_history');
      if (storedHistory) {
        setRollbackHistory(JSON.parse(storedHistory));
      }
      
      const storedComponents = localStorage.getItem('devloop_registered_components');
      if (storedComponents) {
        setRegisteredComponents(JSON.parse(storedComponents));
      }
    } catch (e) {
      console.error('Error loading rollback data from localStorage:', e);
    }
  }, []);
  
  // Update localStorage when data changes
  useEffect(() => {
    try {
      localStorage.setItem('devloop_rollback_registry', JSON.stringify(rollbackRegistry));
      localStorage.setItem('devloop_rollback_history', JSON.stringify(rollbackHistory));
      localStorage.setItem('devloop_registered_components', JSON.stringify(registeredComponents));
    } catch (e) {
      console.error('Error saving rollback data to localStorage:', e);
    }
  }, [rollbackRegistry, rollbackHistory, registeredComponents]);
  
  /**
   * Register a component for state tracking
   * @param {string} componentName - Name of the component
   * @param {string} selector - CSS selector to find the component in DOM
   * @param {Object} initialState - Initial component state
   */
  const registerComponent = (componentName, selector, initialState = {}) => {
    // Check if component is already registered
    if (!registeredComponents.includes(componentName)) {
      setRegisteredComponents(prev => [...prev, componentName]);
      
      // Store initial state
      const componentKey = componentName.toLowerCase().replace(/\s+/g, '_');
      setRollbackRegistry(prev => ({
        ...prev,
        [componentKey]: {
          selector,
          states: [
            {
              id: `state-${Date.now()}`,
              timestamp: new Date().toISOString(),
              state: initialState,
              description: 'Initial state'
            }
          ]
        }
      }));
      
      // Trigger change tracking
      trackChange(componentName, `Registered ${componentName} for rollback tracking`, {
        changeType: 'component_registration',
        timestamp: new Date().toISOString(),
        detail: `Initialized rollback tracking for ${componentName}`
      });
      
      // Try to capture initial visual snapshot if possible
      try {
        const element = document.querySelector(selector);
        if (element) {
          captureElement(element, componentName, null, { isInitial: true });
        }
      } catch (e) {
        console.warn(`Could not capture initial snapshot for ${componentName}:`, e);
      }
    }
  };
  
  /**
   * Capture the current state of a component
   * @param {string} componentName - Name of the component
   * @param {Object} state - Current component state
   * @param {string} description - Description of the state change
   * @returns {string} - ID of the captured state
   */
  const captureComponentState = async (componentName, state, description = 'State update') => {
    // Get component key
    const componentKey = componentName.toLowerCase().replace(/\s+/g, '_');
    
    // Register component if not already registered
    if (!registeredComponents.includes(componentName)) {
      registerComponent(componentName, `[data-component="${componentKey}"]`, state);
      return;
    }
    
    // Create state entry
    const stateId = `state-${Date.now()}`;
    const stateEntry = {
      id: stateId,
      timestamp: new Date().toISOString(),
      state,
      description
    };
    
    // Update registry
    setRollbackRegistry(prev => {
      const component = prev[componentKey] || { states: [] };
      
      return {
        ...prev,
        [componentKey]: {
          ...component,
          states: [...component.states, stateEntry]
        }
      };
    });
    
    // Track the change
    const changeId = trackChange(componentName, `State captured: ${description}`, {
      changeType: 'state_capture',
      timestamp: new Date().toISOString(),
      stateId,
      detail: `Captured component state: ${description}`
    });
    
    // Try to capture visual snapshot
    try {
      const selector = rollbackRegistry[componentKey]?.selector || `[data-component="${componentKey}"]`;
      const element = document.querySelector(selector);
      
      if (element) {
        await captureElement(element, componentName, changeId, { stateId });
      }
    } catch (e) {
      console.warn(`Could not capture visual snapshot for ${componentName}:`, e);
    }
    
    return stateId;
  };
  
  /**
   * Rollback a component to a previous state
   * @param {string} componentName - Name of the component
   * @param {string} stateId - ID of the state to rollback to
   * @returns {Object} - The state that was rolled back to
   */
  const rollbackComponent = async (componentName, stateId) => {
    setRollbackInProgress(true);
    
    try {
      // Get component key
      const componentKey = componentName.toLowerCase().replace(/\s+/g, '_');
      
      // Check if component is registered
      if (!rollbackRegistry[componentKey]) {
        throw new Error(`Component ${componentName} is not registered for rollback`);
      }
      
      // Find the state to rollback to
      const component = rollbackRegistry[componentKey];
      const stateToRollback = component.states.find(s => s.id === stateId);
      
      if (!stateToRollback) {
        throw new Error(`State ${stateId} not found for component ${componentName}`);
      }
      
      // Get the latest state
      const latestState = component.states[component.states.length - 1];
      
      // Add to rollback history
      const rollbackEntry = {
        id: `rollback-${Date.now()}`,
        timestamp: new Date().toISOString(),
        componentName,
        fromStateId: latestState.id,
        toStateId: stateId,
        description: `Rolled back ${componentName} from "${latestState.description}" to "${stateToRollback.description}"`
      };
      
      setRollbackHistory(prev => [...prev, rollbackEntry]);
      
      // Track the rollback action
      trackChange(componentName, `Rolled back to: ${stateToRollback.description}`, {
        changeType: 'rollback',
        timestamp: new Date().toISOString(),
        fromStateId: latestState.id,
        toStateId: stateId,
        detail: `Reverted from "${latestState.description}" to "${stateToRollback.description}"`
      });
      
      // Return the rollback state
      return stateToRollback.state;
    } catch (error) {
      console.error('Error during rollback:', error);
      throw error;
    } finally {
      setRollbackInProgress(false);
    }
  };
  
  /**
   * Get the rollback history for a component or all components
   * @param {string} componentName - Optional name of the component
   * @returns {Array} - Rollback history
   */
  const getRollbackHistory = (componentName = null) => {
    if (componentName) {
      return rollbackHistory.filter(entry => entry.componentName === componentName);
    }
    
    return rollbackHistory;
  };
  
  /**
   * Get all saved states for a component
   * @param {string} componentName - Name of the component
   * @returns {Array} - Array of saved states
   */
  const getComponentStates = (componentName) => {
    const componentKey = componentName.toLowerCase().replace(/\s+/g, '_');
    
    if (!rollbackRegistry[componentKey]) {
      return [];
    }
    
    return rollbackRegistry[componentKey].states || [];
  };
  
  /**
   * Get all visual snapshots for a component
   * @param {string} componentName - Name of the component
   * @returns {Promise<Array>} - Array of snapshot data
   */
  const getComponentSnapshots = async (componentName) => {
    try {
      return await getSnapshotsByComponent(componentName);
    } catch (error) {
      console.error('Error getting component snapshots:', error);
      return [];
    }
  };
  
  /**
   * Compare two snapshots to generate a visual diff
   * @param {string} snapshotId1 - ID of the first snapshot
   * @param {string} snapshotId2 - ID of the second snapshot
   * @returns {Promise<Object>} - Diff data
   */
  const compareSnapshots = async (snapshotId1, snapshotId2) => {
    try {
      return await generateVisualDiff(snapshotId1, snapshotId2);
    } catch (error) {
      console.error('Error comparing snapshots:', error);
      throw error;
    }
  };
  
  // Create context value
  const contextValue = {
    registerComponent,
    captureComponentState,
    rollbackComponent,
    getRollbackHistory,
    getComponentStates,
    getComponentSnapshots,
    compareSnapshots,
    rollbackInProgress,
    rollbackHistory,
    registeredComponents
  };
  
  return (
    <RollbackManagerContext.Provider value={contextValue}>
      {children}
    </RollbackManagerContext.Provider>
  );
};

// Hook to use the rollback manager
export const useRollbackManager = () => {
  return useContext(RollbackManagerContext);
};

// Component that provides a simple UI for rollback management
const RollbackManager = ({ componentName = null }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(componentName);
  const [componentsWithHistory, setComponentsWithHistory] = useState([]);
  
  const { 
    rollbackHistory, 
    registeredComponents, 
    getComponentStates 
  } = useRollbackManager();
  
  // Get list of components with rollback history
  useEffect(() => {
    const componentsWithRollbacks = rollbackHistory
      .map(entry => entry.componentName)
      .filter((value, index, self) => self.indexOf(value) === index);
      
    setComponentsWithHistory(componentsWithRollbacks);
  }, [rollbackHistory]);
  
  // Handle showing specific component if provided
  useEffect(() => {
    if (componentName) {
      setSelectedComponent(componentName);
      
      // Only automatically show the dialog if the component has states
      const states = getComponentStates(componentName);
      if (states.length > 0) {
        setShowDialog(true);
      }
    }
  }, [componentName, getComponentStates]);
  
  if (!registeredComponents.length) {
    return null; // Don't show the UI if no components are registered
  }
  
  return (
    <>
      <button 
        onClick={() => setShowDialog(true)}
        className="bg-purple-700 hover:bg-purple-600 text-white rounded-md px-3 py-2 flex items-center text-sm"
        title="Manage UI Component Versions"
      >
        <span className="mr-1">↩</span>
        {componentsWithHistory.length ? 'Version History' : 'Versions'}
      </button>
      
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full overflow-hidden">
            <div className="bg-gray-700 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                Component Version History
              </h2>
              <button 
                onClick={() => setShowDialog(false)}
                className="text-gray-300 hover:text-white"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            
            <div className="p-4">
              {/* Component selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Select Component
                </label>
                <select 
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"
                  value={selectedComponent || ''}
                  onChange={(e) => setSelectedComponent(e.target.value)}
                >
                  <option value="" disabled>Choose a component...</option>
                  {registeredComponents.map(component => (
                    <option key={component} value={component}>
                      {component}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Component version history will be rendered here */}
              {selectedComponent && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    Version History
                  </h3>
                  <div className="text-sm text-gray-400 mb-4">
                    Select a version to view details or restore to that state
                  </div>
                  
                  {/* This would be populated with actual state history */}
                  <div className="bg-gray-900 rounded-md p-4">
                    <div className="text-gray-400 text-center py-4">
                      Component version history interface will be rendered here
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-gray-700 p-4 flex justify-end">
              <button 
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RollbackManager;