/**
 * Register with Knowledge Graph
 * 
 * This script handles registration of the Structure Validation component with
 * the system Knowledge Graph, ensuring that it's properly integrated into the
 * system health monitoring architecture.
 */

import knowledgeGraph from './KnowledgeGraphConnector';

/**
 * Register the Structure Validation component with the Knowledge Graph
 */
export const registerWithKnowledgeGraph = async () => {
  try {
    // Check if knowledge graph is available
    const kgAvailable = await knowledgeGraph.isAvailable();
    if (!kgAvailable) {
      console.warn('Knowledge Graph not available for registration');
      return false;
    }
    
    // Call registration endpoint to register the component
    const response = await fetch(`${knowledgeGraph.SYSTEM_HEALTH_ENDPOINT}/register-component`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component_id: 'structure-validation',
        component_type: 'ui',
        capabilities: [
          'file-structure-validation',
          'script-organization-validation',
          'roadmap-item-validation'
        ],
        metadata: {
          version: '1.0.0',
          description: 'Unified structure validation component for file system organization',
          parent: 'system-health-dashboard'
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    console.log('Successfully registered Structure Validation with Knowledge Graph');
    return true;
  } catch (error) {
    console.warn('Error registering with Knowledge Graph:', error);
    return false;
  }
};

// Register on load - only in browser environment
if (typeof window !== 'undefined') {
  // Wait for the page to fully load
  window.addEventListener('load', () => {
    // Register with a slight delay to ensure all systems are initialized
    setTimeout(() => {
      registerWithKnowledgeGraph().then(success => {
        if (success) {
          console.log('Structure Validation registered with Knowledge Graph');
        }
      });
    }, 2000);
  });
}

export default registerWithKnowledgeGraph;