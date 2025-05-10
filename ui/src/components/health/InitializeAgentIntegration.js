/**
 * Initialize Agent Integration
 * 
 * This script attempts to initialize the integration between the StructureValidation
 * component and the File Organization Agent. It will run when the component mounts
 * and check if the agent's trigger system is available.
 */

// Check for agent path and try to load integration
export const initializeAgentIntegration = async () => {
  try {
    // Try to dynamically import the agent's integration module
    const agentIntegrationPath = '../../../../agents/system-health-agent/child-agents/file-organization-agent/ui-integration/StructureValidationIntegration';
    
    try {
      // Dynamic import to avoid breaking if file isn't available
      const module = await import(agentIntegrationPath);
      
      if (module && module.initializeStructureValidationIntegration) {
        // Get dashboard API from global (if available)
        const dashboard = typeof window !== 'undefined' && window.systemHealthDashboard
          ? window.systemHealthDashboard
          : null;
        
        if (dashboard) {
          console.log('Initializing File Organization Agent integration with Structure Validation');
          module.initializeStructureValidationIntegration(dashboard);
          return true;
        } else {
          console.warn('Dashboard API not available, agent integration skipped');
        }
      } else {
        console.warn('Agent integration module found but initializeStructureValidationIntegration function missing');
      }
    } catch (importError) {
      console.warn('Could not import agent integration module:', importError.message);
      console.warn('Using fallback trigger implementation');
    }
  } catch (error) {
    console.warn('Error initializing agent integration:', error.message);
  }
  
  return false;
};

// If window is defined (browser environment), try to initialize on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    initializeAgentIntegration().then(success => {
      if (success) {
        console.log('Successfully initialized agent integration');
      } else {
        console.warn('Using fallback trigger implementation');
      }
    });
  });
}

export default initializeAgentIntegration;