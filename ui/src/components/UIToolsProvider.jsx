import React, { useState, useEffect } from 'react';
import { useChangeTracker } from './ChangeTracker.jsx';
import { useRollbackManager } from './RollbackManager.jsx';
import { createToast } from './ToastNotification.jsx';

// Lazy load modals
const VisualChangelog = React.lazy(() => import('./VisualChangelog.jsx'));

/**
 * UIToolsProvider component that provides a unified interface to UI tools
 * including Visual Changelog, Version History, etc.
 */
const UIToolsProvider = ({ children }) => {
  // State for managing which components are displayed
  const [showVisualChangelog, setShowVisualChangelog] = useState(false);
  const [showVisualDiff, setShowVisualDiff] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [trackedComponents, setTrackedComponents] = useState([]);
  
  // Access to the tracker and rollback manager
  const { changes } = useChangeTracker();
  const { registeredComponents, captureComponentState } = useRollbackManager();
  
  // Collect components that have changes
  useEffect(() => {
    // Get unique component names from changes
    const componentsWithChanges = [...new Set(changes.map(change => change.component))];
    
    // Combine with registered components
    const allComponents = [...new Set([
      ...componentsWithChanges,
      ...registeredComponents
    ])];
    
    setTrackedComponents(allComponents);
  }, [changes, registeredComponents]);
  
  // Handle opening the visual changelog
  const handleOpenChangelog = (componentName = null) => {
    if (componentName) {
      setSelectedComponent(componentName);
    }
    setShowVisualChangelog(true);
  };
  
  // Handle opening the visual diff
  const handleOpenVisualDiff = (componentName = null) => {
    if (componentName) {
      setSelectedComponent(componentName);
    }
    setShowVisualDiff(true);
  };
  
  // Handle capturing a snapshot
  const handleCaptureSnapshot = (componentName) => {
    if (!componentName) return;
    
    // Find the DOM element
    const componentKey = componentName.toLowerCase().replace(/\s+/g, '_');
    const element = document.querySelector(`[data-component="${componentKey}"]`);
    
    if (element) {
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Visual feedback that we're capturing (add a temporary highlight)
      element.classList.add('snapshot-highlight');
      setTimeout(() => {
        element.classList.remove('snapshot-highlight');
      }, 500);
      
      // Capture state
      captureComponentState(
        componentName,
        { timestamp: new Date().toISOString() },
        'Manual snapshot capture'
      );
      
      // Show success toast
      createToast.success(`Snapshot captured for ${componentName}`);
    }
  };
  
  return (
    <>
      {children}
      
      {/* Visual Changelog Modal */}
      {showVisualChangelog && (
        <React.Suspense fallback={
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        }>
          <VisualChangelog 
            componentName={selectedComponent}
            onClose={() => {
              setShowVisualChangelog(false);
              setSelectedComponent(null);
            }}
          />
        </React.Suspense>
      )}
      
      {/* Visual Diff Modal will go here */}
    </>
  );
};

export default UIToolsProvider;