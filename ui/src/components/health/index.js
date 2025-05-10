/**
 * Health Components Export
 * 
 * This file exports the health dashboard components with their necessary wrappers.
 */

// Export main components
export { default as SystemValidation } from './SystemValidation';
export { default as StructureValidation } from './StructureValidation';
export { default as DependenciesValidation } from './DependenciesValidation';
export { default as RoadmapStatusTracker } from './RoadmapStatusTracker';
export { default as OverviewDashboard } from './OverviewDashboard';
export { default as IssueTracker } from './IssueTracker';
export { default as AIRecommendations } from './AIRecommendations';
export { default as AnalysisHub } from './AnalysisHub';
export { default as SettingsPanel } from './SettingsPanel';

// Export the wrapped version with trigger support
export { default as StructureValidationWithTriggers } from './StructureValidationWithTriggers';

// Re-export the TriggerContext for consumers that need it
export { TriggerProvider, useTrigger } from './TriggerContext.jsx';

// Export agent integration utilities
export { initializeAgentIntegration } from './InitializeAgentIntegration';

// Recommended import for most use cases - includes trigger support
export { default } from './StructureValidationWithTriggers';

// Initialize components when this module is imported
const initialize = async () => {
  try {
    // Register global dashboard object for component access
    if (typeof window !== 'undefined' && !window.systemHealthDashboard) {
      window.systemHealthDashboard = {
        registerComponent: (componentId, component) => {
          console.log(`Registered health component: ${componentId}`);
          if (!window.systemHealthDashboard.components) {
            window.systemHealthDashboard.components = {};
          }
          window.systemHealthDashboard.components[componentId] = component;
          return true;
        },
        getComponent: (componentId) => {
          return window.systemHealthDashboard?.components?.[componentId] || null;
        },
        notifyUpdate: (componentId, data) => {
          console.log(`Update notification for component: ${componentId}`, data);
          const event = new CustomEvent('health-component-update', { 
            detail: { componentId, data } 
          });
          window.dispatchEvent(event);
          return true;
        }
      };
      
      console.log('System Health Dashboard initialized');
    }
  } catch (error) {
    console.error('Failed to initialize health components:', error);
  }
};

// Call initialize on import
initialize();