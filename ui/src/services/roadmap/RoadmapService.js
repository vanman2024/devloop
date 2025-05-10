/**
 * Roadmap Service
 *
 * Provides API access to the Knowledge Graph for roadmap components.
 * This service connects the Roadmap UI to the actual project structure
 * in the Knowledge Graph, ensuring all data is from a single source of truth.
 */

// Import task agent service for batch processing features
import { processBatchWithAgent, isTaskAgentAvailable } from '../taskAgentService';

// Base API URL
const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Fetch all milestones from the Knowledge Graph
 * @returns {Promise<Array>} Array of milestone objects
 */
export const fetchMilestones = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/graph/nodes?type=milestone`);
    
    if (!response.ok) {
      throw new Error(`Error fetching milestones: ${response.statusText}`);
    }
    
    const milestones = await response.json();
    return milestones.map(formatNodeForUI);
  } catch (error) {
    console.error('Error in fetchMilestones:', error);
    throw error;
  }
};

/**
 * Fetch all phases for a milestone
 * @param {string} milestoneId - The milestone ID
 * @returns {Promise<Array>} Array of phase objects
 */
export const fetchMilestonePhases = async (milestoneId) => {
  try {
    // Get all edges that connect the milestone to its phases
    const edgesResponse = await fetch(`${API_BASE_URL}/graph/edges?type=milestone_contains_phase&source=${milestoneId}`);
    
    if (!edgesResponse.ok) {
      throw new Error(`Error fetching milestone phases: ${edgesResponse.statusText}`);
    }
    
    const edges = await edgesResponse.json();
    
    // If no phases are found, return empty array
    if (!edges || edges.length === 0) {
      return [];
    }
    
    // Fetch the phase nodes for each target in the edges
    const phases = await Promise.all(
      edges.map(async (edge) => {
        const phaseResponse = await fetch(`${API_BASE_URL}/graph/node/${edge.target}`);
        
        if (!phaseResponse.ok) {
          throw new Error(`Error fetching phase node: ${phaseResponse.statusText}`);
        }
        
        return formatNodeForUI(await phaseResponse.json());
      })
    );
    
    return phases;
  } catch (error) {
    console.error(`Error in fetchMilestonePhases for ${milestoneId}:`, error);
    throw error;
  }
};

/**
 * Fetch all modules for a phase
 * @param {string} phaseId - The phase ID
 * @returns {Promise<Array>} Array of module objects
 */
export const fetchPhaseModules = async (phaseId) => {
  try {
    // Get all edges that connect the phase to its modules
    const edgesResponse = await fetch(`${API_BASE_URL}/graph/edges?type=phase_contains_module&source=${phaseId}`);
    
    if (!edgesResponse.ok) {
      throw new Error(`Error fetching phase modules: ${edgesResponse.statusText}`);
    }
    
    const edges = await edgesResponse.json();
    
    // If no modules are found, return empty array
    if (!edges || edges.length === 0) {
      return [];
    }
    
    // Fetch the module nodes for each target in the edges
    const modules = await Promise.all(
      edges.map(async (edge) => {
        const moduleResponse = await fetch(`${API_BASE_URL}/graph/node/${edge.target}`);
        
        if (!moduleResponse.ok) {
          throw new Error(`Error fetching module node: ${moduleResponse.statusText}`);
        }
        
        return formatNodeForUI(await moduleResponse.json());
      })
    );
    
    return modules;
  } catch (error) {
    console.error(`Error in fetchPhaseModules for ${phaseId}:`, error);
    throw error;
  }
};

/**
 * Fetch all features for a module
 * @param {string} moduleId - The module ID
 * @returns {Promise<Array>} Array of feature objects
 */
export const fetchModuleFeatures = async (moduleId) => {
  try {
    // Get all edges that connect the module to its features
    const edgesResponse = await fetch(`${API_BASE_URL}/graph/edges?type=module_contains_feature&source=${moduleId}`);
    
    if (!edgesResponse.ok) {
      throw new Error(`Error fetching module features: ${edgesResponse.statusText}`);
    }
    
    const edges = await edgesResponse.json();
    
    // If no features are found, return empty array
    if (!edges || edges.length === 0) {
      return [];
    }
    
    // Fetch the feature nodes for each target in the edges
    const features = await Promise.all(
      edges.map(async (edge) => {
        const featureResponse = await fetch(`${API_BASE_URL}/graph/node/${edge.target}`);
        
        if (!featureResponse.ok) {
          throw new Error(`Error fetching feature node: ${featureResponse.statusText}`);
        }
        
        return formatNodeForUI(await featureResponse.json());
      })
    );
    
    return features;
  } catch (error) {
    console.error(`Error in fetchModuleFeatures for ${moduleId}:`, error);
    throw error;
  }
};

/**
 * Fetch the complete structure for a milestone
 * @param {string} milestoneId - The milestone ID
 * @returns {Promise<Object>} Milestone object with phases, modules, and features
 */
export const fetchMilestoneStructure = async (milestoneId) => {
  try {
    // Fetch milestone
    const milestoneResponse = await fetch(`${API_BASE_URL}/graph/node/${milestoneId}`);
    
    if (!milestoneResponse.ok) {
      throw new Error(`Error fetching milestone: ${milestoneResponse.statusText}`);
    }
    
    const milestone = formatNodeForUI(await milestoneResponse.json());
    
    // Fetch phases for this milestone
    const phases = await fetchMilestonePhases(milestoneId);
    
    // For each phase, fetch its modules
    const phasesWithModules = await Promise.all(
      phases.map(async (phase) => {
        const modules = await fetchPhaseModules(phase.id);
        
        // For each module, fetch its features
        const modulesWithFeatures = await Promise.all(
          modules.map(async (module) => {
            const features = await fetchModuleFeatures(module.id);
            return {
              ...module,
              children: features
            };
          })
        );
        
        return {
          ...phase,
          children: modulesWithFeatures
        };
      })
    );
    
    return {
      ...milestone,
      children: phasesWithModules
    };
  } catch (error) {
    console.error(`Error in fetchMilestoneStructure for ${milestoneId}:`, error);
    throw error;
  }
};

/**
 * Fetch all milestones with their complete structure
 * @returns {Promise<Array>} Array of complete milestone objects
 */
export const fetchAllMilestonesWithStructure = async () => {
  try {
    const milestones = await fetchMilestones();
    
    const milestonesWithStructure = await Promise.all(
      milestones.map(async (milestone) => {
        return await fetchMilestoneStructure(milestone.id);
      })
    );
    
    return milestonesWithStructure;
  } catch (error) {
    console.error('Error in fetchAllMilestonesWithStructure:', error);
    throw error;
  }
};

/**
 * Update a feature in the Knowledge Graph
 * @param {string} featureId - The feature ID
 * @param {Object} featureData - The updated feature data
 * @returns {Promise<Object>} The updated feature
 */
export const updateFeature = async (featureId, featureData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/graph/node/${featureId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: featureData
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error updating feature: ${response.statusText}`);
    }
    
    return formatNodeForUI(await response.json());
  } catch (error) {
    console.error(`Error in updateFeature for ${featureId}:`, error);
    throw error;
  }
};

/**
 * Format a node from the Knowledge Graph for UI display
 * @param {Object} node - The node object from Knowledge Graph
 * @returns {Object} Formatted node object
 */
const formatNodeForUI = (node) => {
  const { id, type, properties } = node;
  
  // Extract properties with defensive coding
  const formatted = {
    id,
    type
  };
  
  // Map all properties
  if (properties) {
    Object.keys(properties).forEach(key => {
      formatted[key] = properties[key];
    });
  }
  
  return formatted;
};

/**
 * Format a complete milestone structure for UI display
 * Used for converting the graph data to the format expected by the Roadmap component
 * @param {Object} milestone - The complete milestone structure
 * @returns {Object} Formatted milestone object for UI
 */
export const formatMilestoneForUI = (milestone) => {
  return {
    id: milestone.id,
    name: milestone.name || 'Unnamed Milestone',
    type: 'milestone',
    status: milestone.status || 'not_started',
    children: (milestone.children || []).map(phase => ({
      id: phase.id,
      name: phase.name || 'Unnamed Phase',
      type: 'phase',
      status: phase.status || 'not_started',
      children: (phase.children || []).map(module => ({
        id: module.id,
        name: module.name || 'Unnamed Module',
        type: 'module',
        status: module.status || 'not_started',
        children: (module.children || []).map(feature => ({
          id: feature.id,
          name: feature.name || 'Unnamed Feature',
          description: feature.description || '',
          type: feature.type || 'feature',
          status: feature.status || 'not_started'
        }))
      }))
    }))
  };
};

/**
 * Create a new milestone in the Knowledge Graph
 * @param {Object} milestoneData - The milestone data
 * @returns {Promise<Object>} The created milestone
 */
export const createMilestone = async (milestoneData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/graph/nodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'milestone',
        properties: milestoneData
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error creating milestone: ${response.statusText}`);
    }
    
    return formatNodeForUI(await response.json());
  } catch (error) {
    console.error('Error in createMilestone:', error);
    throw error;
  }
};

/**
 * Create a new phase in the Knowledge Graph and connect it to a milestone
 * @param {string} milestoneId - The parent milestone ID
 * @param {Object} phaseData - The phase data
 * @returns {Promise<Object>} The created phase
 */
export const createPhase = async (milestoneId, phaseData) => {
  try {
    // Create phase node
    const nodeResponse = await fetch(`${API_BASE_URL}/graph/nodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'phase',
        properties: phaseData
      }),
    });
    
    if (!nodeResponse.ok) {
      throw new Error(`Error creating phase: ${nodeResponse.statusText}`);
    }
    
    const phase = await nodeResponse.json();
    
    // Create relationship between milestone and phase
    const edgeResponse = await fetch(`${API_BASE_URL}/graph/edges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: milestoneId,
        target: phase.id,
        type: 'milestone_contains_phase'
      }),
    });
    
    if (!edgeResponse.ok) {
      throw new Error(`Error creating milestone-phase relationship: ${edgeResponse.statusText}`);
    }
    
    return formatNodeForUI(phase);
  } catch (error) {
    console.error(`Error in createPhase for milestone ${milestoneId}:`, error);
    throw error;
  }
};

/**
 * Create a new module in the Knowledge Graph and connect it to a phase
 * @param {string} phaseId - The parent phase ID
 * @param {Object} moduleData - The module data
 * @returns {Promise<Object>} The created module
 */
export const createModule = async (phaseId, moduleData) => {
  try {
    // Create module node
    const nodeResponse = await fetch(`${API_BASE_URL}/graph/nodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'module',
        properties: moduleData
      }),
    });
    
    if (!nodeResponse.ok) {
      throw new Error(`Error creating module: ${nodeResponse.statusText}`);
    }
    
    const module = await nodeResponse.json();
    
    // Create relationship between phase and module
    const edgeResponse = await fetch(`${API_BASE_URL}/graph/edges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: phaseId,
        target: module.id,
        type: 'phase_contains_module'
      }),
    });
    
    if (!edgeResponse.ok) {
      throw new Error(`Error creating phase-module relationship: ${edgeResponse.statusText}`);
    }
    
    return formatNodeForUI(module);
  } catch (error) {
    console.error(`Error in createModule for phase ${phaseId}:`, error);
    throw error;
  }
};

/**
 * Create a new feature in the Knowledge Graph and connect it to a module
 * @param {string} moduleId - The parent module ID
 * @param {Object} featureData - The feature data
 * @returns {Promise<Object>} The created feature
 */
export const createFeature = async (moduleId, featureData) => {
  try {
    // Create feature node
    const nodeResponse = await fetch(`${API_BASE_URL}/graph/nodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'feature',
        properties: featureData
      }),
    });
    
    if (!nodeResponse.ok) {
      throw new Error(`Error creating feature: ${nodeResponse.statusText}`);
    }
    
    const feature = await nodeResponse.json();
    
    // Create relationship between module and feature
    const edgeResponse = await fetch(`${API_BASE_URL}/graph/edges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: moduleId,
        target: feature.id,
        type: 'module_contains_feature'
      }),
    });
    
    if (!edgeResponse.ok) {
      throw new Error(`Error creating module-feature relationship: ${edgeResponse.statusText}`);
    }
    
    return formatNodeForUI(feature);
  } catch (error) {
    console.error(`Error in createFeature for module ${moduleId}:`, error);
    throw error;
  }
};

/**
 * Create a dependency relationship between two features
 * @param {string} dependentFeatureId - The dependent feature ID
 * @param {string} dependencyFeatureId - The dependency feature ID
 * @returns {Promise<Object>} The created relationship
 */
export const createFeatureDependency = async (dependentFeatureId, dependencyFeatureId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/graph/edges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: dependentFeatureId,
        target: dependencyFeatureId,
        type: 'feature_depends_on'
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error creating feature dependency: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error in createFeatureDependency between ${dependentFeatureId} and ${dependencyFeatureId}:`, error);
    throw error;
  }
};

/**
 * Get all feature dependencies
 * @returns {Promise<Array>} Array of dependency relationships
 */
export const getFeatureDependencies = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/graph/edges?type=feature_depends_on`);
    
    if (!response.ok) {
      throw new Error(`Error fetching feature dependencies: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in getFeatureDependencies:', error);
    throw error;
  }
};

/**
 * Get dependencies for a specific feature
 * @param {string} featureId - The feature ID
 * @returns {Promise<Array>} Array of dependency objects
 */
export const getFeatureDependenciesFor = async (featureId) => {
  try {
    // Get all edges where this feature depends on others
    const dependsOnResponse = await fetch(`${API_BASE_URL}/graph/edges?type=feature_depends_on&source=${featureId}`);
    
    if (!dependsOnResponse.ok) {
      throw new Error(`Error fetching feature dependencies: ${dependsOnResponse.statusText}`);
    }
    
    const dependsOnEdges = await dependsOnResponse.json();
    
    // Get feature details for all dependencies
    const dependencies = await Promise.all(
      dependsOnEdges.map(async (edge) => {
        const featureResponse = await fetch(`${API_BASE_URL}/graph/node/${edge.target}`);
        
        if (!featureResponse.ok) {
          throw new Error(`Error fetching dependency feature: ${featureResponse.statusText}`);
        }
        
        return formatNodeForUI(await featureResponse.json());
      })
    );
    
    return dependencies;
  } catch (error) {
    console.error(`Error in getFeatureDependenciesFor ${featureId}:`, error);
    throw error;
  }
};

/**
 * Get features that depend on a specific feature
 * @param {string} featureId - The feature ID
 * @returns {Promise<Array>} Array of dependent feature objects
 */
export const getFeatureDependentsFor = async (featureId) => {
  try {
    // Get all edges where others depend on this feature
    const dependentsResponse = await fetch(`${API_BASE_URL}/graph/edges?type=feature_depends_on&target=${featureId}`);
    
    if (!dependentsResponse.ok) {
      throw new Error(`Error fetching feature dependents: ${dependentsResponse.statusText}`);
    }
    
    const dependentEdges = await dependentsResponse.json();
    
    // Get feature details for all dependents
    const dependents = await Promise.all(
      dependentEdges.map(async (edge) => {
        const featureResponse = await fetch(`${API_BASE_URL}/graph/node/${edge.source}`);
        
        if (!featureResponse.ok) {
          throw new Error(`Error fetching dependent feature: ${featureResponse.statusText}`);
        }
        
        return formatNodeForUI(await featureResponse.json());
      })
    );
    
    return dependents;
  } catch (error) {
    console.error(`Error in getFeatureDependentsFor ${featureId}:`, error);
    throw error;
  }
};

/**
 * Get all dependencies for a feature including both directions
 * @param {string} featureId - The feature ID
 * @returns {Promise<Object>} Object with dependencies and dependents
 */
export const fetchDependencies = async (featureId) => {
  try {
    const [dependencies, dependents] = await Promise.all([
      getFeatureDependenciesFor(featureId),
      getFeatureDependentsFor(featureId)
    ]);

    return { dependencies, dependents };
  } catch (error) {
    console.error(`Error in fetchDependencies for ${featureId}:`, error);
    throw error;
  }
};

/**
 * Process all features in a milestone to generate tasks
 * @param {string} milestoneId - The milestone ID
 * @returns {Promise<Object>} - Processing results
 */
export const processMilestoneFeatures = async (milestoneId) => {
  try {
    // First check if the Task Agent is available
    const agentAvailable = await isTaskAgentAvailable();

    if (!agentAvailable) {
      return {
        success: false,
        message: 'Task Agent is not available',
        milestone_id: milestoneId,
        features_processed: 0
      };
    }

    // Get the milestone structure to find all features
    const milestoneStructure = await fetchMilestoneStructure(milestoneId);

    // Extract all feature IDs from the milestone structure
    const featureIds = [];

    // Helper function to recursively extract feature IDs from the structure
    const extractFeatureIds = (node) => {
      if (node.type === 'feature') {
        featureIds.push(node.id);
      }

      if (node.children && node.children.length > 0) {
        node.children.forEach(extractFeatureIds);
      }
    };

    // Extract features from the milestone structure
    if (milestoneStructure.children) {
      milestoneStructure.children.forEach(extractFeatureIds);
    }

    if (featureIds.length === 0) {
      return {
        success: false,
        message: 'No features found in milestone',
        milestone_id: milestoneId,
        features_processed: 0
      };
    }

    // Process all features in a batch
    const result = await processBatchWithAgent(featureIds);

    return {
      success: result.success,
      message: `Processed ${result.summary.successful} features successfully, ${result.summary.failed} failed`,
      milestone_id: milestoneId,
      features_processed: result.summary.successful,
      total_features: featureIds.length,
      total_tasks: result.summary.total_tasks,
      details: result
    };
  } catch (error) {
    console.error(`Error processing milestone features for ${milestoneId}:`, error);
    return {
      success: false,
      message: `Error processing milestone features: ${error.message}`,
      milestone_id: milestoneId,
      features_processed: 0
    };
  }
};

// Ensure default export also includes all named exports
export default {
  fetchMilestones,
  fetchMilestoneStructure,
  fetchMilestonePhases,
  fetchPhaseModules,
  fetchModuleFeatures,
  fetchDependencies,
  formatNodeForUI,
  processMilestoneFeatures
};