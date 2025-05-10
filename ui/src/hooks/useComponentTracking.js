import { useEffect, useRef } from 'react';
import { useChangeTracker } from '../components/ChangeTracker.jsx';
import { useRollbackManager } from '../components/RollbackManager.jsx';

/**
 * Custom hook for tracking component changes and enabling visual history
 * 
 * @param {string} componentName - Name of the component
 * @param {Object} options - Configuration options
 * @param {string} options.selector - CSS selector to identify the component
 * @param {Object} options.initialState - Initial component state
 * @param {boolean} options.captureOnMount - Whether to capture the initial state
 * @param {boolean} options.enableRollback - Whether to enable rollback functionality
 * @param {Array} options.dependencies - Dependencies that trigger capture when changed
 * @param {Object} options.featureContext - Feature context for relating UI changes to features
 * @returns {Object} - Utility functions for tracking component changes
 */
const useComponentTracking = (
  componentName, 
  { 
    selector = null,
    initialState = {}, 
    captureOnMount = true,
    enableRollback = true,
    dependencies = [],
    featureContext = null 
  } = {}
) => {
  // Get references to the tracking systems
  const { trackChange, trackStyleChange, trackContentChange } = useChangeTracker();
  const { registerComponent, captureComponentState } = useRollbackManager();
  
  // Keep a reference to the component element
  const componentRef = useRef(null);
  
  // Generate a default selector if not provided
  const componentSelector = selector || `[data-component="${componentName.toLowerCase().replace(/\s+/g, '_')}"]`;
  
  // Register the component with the rollback system on mount
  useEffect(() => {
    if (enableRollback) {
      registerComponent(componentName, componentSelector, initialState);
      
      // Capture initial state if requested
      if (captureOnMount) {
        captureComponentState(componentName, initialState, 'Initial state');
      }
    }
  }, []);
  
  // Track changes when dependencies change
  useEffect(() => {
    if (dependencies.length > 0 && enableRollback) {
      captureComponentState(
        componentName, 
        { current: dependencies }, 
        'State updated'
      );
    }
  }, dependencies);
  
  /**
   * Track a style change in the component
   * @param {string} property - CSS property that changed
   * @param {string} oldValue - Previous value
   * @param {string} newValue - New value
   */
  const trackStyle = (property, oldValue, newValue) => {
    trackStyleChange(componentName, property, oldValue, newValue, featureContext);
    
    if (enableRollback) {
      captureComponentState(
        componentName, 
        { 
          [property]: newValue,
          previous: oldValue,
          featureContext
        }, 
        `Style changed: ${property}`
      );
    }
  };
  
  /**
   * Track a content change in the component
   * @param {string} oldContent - Previous content
   * @param {string} newContent - New content
   */
  const trackContent = (oldContent, newContent) => {
    trackContentChange(componentName, oldContent, newContent, featureContext);
    
    if (enableRollback) {
      captureComponentState(
        componentName, 
        { 
          content: newContent,
          previous: oldContent,
          featureContext
        }, 
        'Content updated'
      );
    }
  };
  
  /**
   * Capture the current state of the component
   * @param {Object} state - Current component state
   * @param {string} description - Description of the state
   * @param {Object} additionalContext - Optional additional context or metadata
   */
  const captureState = (state, description = 'State captured', additionalContext = {}) => {
    // Merge feature context with any additional context
    const context = {
      ...featureContext,
      ...additionalContext
    };
    
    if (enableRollback) {
      captureComponentState(componentName, {
        ...state,
        featureContext: context
      }, description);
      
      // Also track as a change if there's additional context
      if (Object.keys(additionalContext).length > 0) {
        trackChange(
          componentName, 
          description, 
          { changeType: 'state', ...state }, 
          context
        );
      }
    }
  };
  
  /**
   * Set the ref for the component element
   * @param {HTMLElement} element - The component DOM element
   */
  const setRef = (element) => {
    componentRef.current = element;
    
    // If element has data-component attribute, update it
    if (element && !element.hasAttribute('data-component')) {
      element.setAttribute(
        'data-component', 
        componentName.toLowerCase().replace(/\s+/g, '_')
      );
      
      // Add feature context data attributes if available
      if (featureContext && featureContext.featureId) {
        element.setAttribute('data-feature-id', featureContext.featureId);
      }
      
      if (featureContext && featureContext.featureName) {
        element.setAttribute('data-feature-name', featureContext.featureName);
      }
    }
  };
  
  /**
   * Set or update the feature context for this component
   * @param {Object} newContext - New feature context
   */
  const setFeatureContext = (newContext) => {
    featureContext = {
      ...featureContext,
      ...newContext
    };
    
    // Update data attributes on the element if it exists
    if (componentRef.current && newContext.featureId) {
      componentRef.current.setAttribute('data-feature-id', newContext.featureId);
    }
    
    if (componentRef.current && newContext.featureName) {
      componentRef.current.setAttribute('data-feature-name', newContext.featureName);
    }
  };
  
  return {
    trackStyle,
    trackContent,
    captureState,
    setRef,
    setFeatureContext,
    componentRef,
    // Also expose the feature context for convenience
    featureContext
  };
};

export default useComponentTracking;