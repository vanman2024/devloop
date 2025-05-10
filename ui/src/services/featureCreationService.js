/**
 * Feature Creation Service
 * 
 * Service for interacting with the Feature Creation Agent API
 * to process feature descriptions, suggest placements, and generate IDs.
 * Connects to the Knowledge Graph API for integration with the project structure.
 */

import axios from 'axios';

// API base URLs
const API_BASE_URL = 'http://localhost:8080/api/v1';
const FEATURE_CREATION_ENDPOINT = `${API_BASE_URL}/feature-creation`;
const KNOWLEDGE_GRAPH_API = 'http://localhost:8080/api/graph';

/**
 * Process a complete feature creation request
 * 
 * @param {Object} featureData Feature data object
 * @param {string} featureData.name Feature name
 * @param {string} featureData.description Feature description
 * @param {string} [featureData.milestone] User-selected milestone (optional)
 * @param {string} [featureData.phase] User-selected phase (optional)
 * @param {string} [featureData.module] User-selected module (optional)
 * @param {Array<string>} [featureData.tags] User-provided tags (optional)
 * @param {string} [featureData.projectId] Project ID (optional)
 * @returns {Promise<Object>} The processed feature data with AI suggestions
 */
export const processFeature = async (featureData) => {
  try {
    // First try the Feature Creation API
    try {
      const response = await axios.post(`${FEATURE_CREATION_ENDPOINT}/process`, featureData);
      return response.data;
    } catch (featureApiError) {
      console.warn('Feature Creation API error, falling back to Knowledge Graph:', featureApiError);
      
      // If Feature Creation API fails, fall back to direct Knowledge Graph integration
      return await createFeatureInKnowledgeGraph(featureData);
    }
  } catch (error) {
    console.error('Error processing feature:', error);
    throw error;
  }
};

/**
 * Create a feature directly in the Knowledge Graph
 * 
 * @param {Object} featureData The feature data
 * @returns {Promise<Object>} The created feature
 */
const createFeatureInKnowledgeGraph = async (featureData) => {
  try {
    // Generate a unique ID if not provided
    const featureId = featureData.id || `feature-${Math.floor(1000 + Math.random() * 9000)}-${featureData.name.toLowerCase().replace(/[^\w]+/g, '-')}`;
    
    // Determine milestone, phase, and module based on input or default values
    const milestone = featureData.milestone || await suggestMilestone(featureData);
    const phase = featureData.phase || await suggestPhase(featureData, milestone);
    const module = featureData.module || await suggestModule(featureData, milestone, phase);
    
    // Create feature node in Knowledge Graph
    const featureNode = await axios.post(`${KNOWLEDGE_GRAPH_API}/nodes`, {
      id: featureId,
      type: 'feature',
      properties: {
        name: featureData.name,
        description: featureData.description,
        status: 'not_started',
        milestone,
        phase,
        module,
        tags: featureData.tags || [],
        created_at: new Date().toISOString()
      }
    });
    
    // Connect feature to its module
    await axios.post(`${KNOWLEDGE_GRAPH_API}/edges`, {
      source: module,
      target: featureId,
      type: 'module_contains_feature'
    });
    
    return {
      success: true,
      feature: {
        id: featureId,
        ...featureNode.data,
        suggestedMilestone: milestone,
        suggestedPhase: phase,
        suggestedModule: module,
        suggestedTags: featureData.tags || []
      }
    };
  } catch (error) {
    console.error('Error creating feature in Knowledge Graph:', error);
    throw error;
  }
};

/**
 * Analyze a feature description only
 * 
 * @param {string} name Feature name
 * @param {string} description Feature description
 * @returns {Promise<Object>} Analysis results with extracted concepts
 */
export const analyzeFeature = async (name, description) => {
  try {
    // First try the Feature Creation API
    try {
      const response = await axios.post(`${FEATURE_CREATION_ENDPOINT}/analyze`, { name, description });
      return response.data;
    } catch (featureApiError) {
      console.warn('Feature Creation API error, falling back to simple analysis:', featureApiError);
      
      // If Feature Creation API fails, perform a simple analysis
      return simpleAnalysis(name, description);
    }
  } catch (error) {
    console.error('Error analyzing feature:', error);
    throw error;
  }
};

/**
 * Simple feature analysis algorithm (fallback when API is unavailable)
 * 
 * @param {string} name Feature name
 * @param {string} description Feature description
 * @returns {Object} Simple analysis result
 */
const simpleAnalysis = (name, description) => {
  const text = `${name} ${description}`.toLowerCase();
  const domain = 
    text.includes('test') ? 'testing' :
    text.includes('ui') || text.includes('interface') ? 'ui' :
    text.includes('git') || text.includes('github') ? 'integration' :
    text.includes('api') ? 'api' :
    'core';
  
  const purpose = 
    text.includes('add') || text.includes('creat') ? 'creation' :
    text.includes('fix') || text.includes('bug') ? 'bug-fix' :
    text.includes('enhanc') || text.includes('improv') ? 'enhancement' :
    text.includes('refactor') ? 'refactoring' :
    'feature';
  
  const confidence = 0.7;
  
  return {
    success: true,
    analysis: {
      domain,
      purpose,
      confidence,
      keywords: name.toLowerCase().split(/[^\w]+/).filter(w => w.length > 3)
    }
  };
};

/**
 * Get feature placement suggestions
 * 
 * @param {Object} analysisResult Feature analysis result
 * @param {Object} [knowledgeResult] Knowledge graph query result (optional)
 * @param {Object} [structureResult] Project structure result (optional)
 * @param {string} [userMilestone] User-selected milestone (optional)
 * @param {string} [userPhase] User-selected phase (optional)
 * @param {string} [userModule] User-selected module (optional)
 * @returns {Promise<Object>} Placement suggestions
 */
export const suggestPlacement = async (
  analysisResult, 
  knowledgeResult = {}, 
  structureResult = {},
  userMilestone,
  userPhase,
  userModule
) => {
  try {
    // First try the Feature Creation API
    try {
      const response = await axios.post(
        `${FEATURE_CREATION_ENDPOINT}/suggest-placement`, 
        {
          analysis_result: analysisResult,
          knowledge_result: knowledgeResult,
          structure_result: structureResult,
          user_milestone: userMilestone,
          user_phase: userPhase,
          user_module: userModule
        }
      );
      return response.data;
    } catch (featureApiError) {
      console.warn('Feature Creation API error, falling back to simple placement:', featureApiError);
      
      // If Feature Creation API fails, perform a simple placement suggestion
      return {
        success: true,
        placement: {
          milestone: userMilestone || suggestMilestone({ analysis: analysisResult?.analysis || {} }),
          phase: userPhase || "phase-02",
          module: userModule || "module-core"
        }
      };
    }
  } catch (error) {
    console.error('Error suggesting placement:', error);
    throw error;
  }
};

/**
 * Generate a feature ID based on the feature name and conventions
 * 
 * @param {string} featureName Feature name
 * @param {string} [milestone] Milestone ID (optional)
 * @param {string} [projectId] Project ID (optional)
 * @returns {Promise<string>} Generated feature ID
 */
export const generateFeatureId = async (featureName, milestone, projectId) => {
  try {
    // First try the Feature Creation API
    try {
      const response = await axios.post(
        `${FEATURE_CREATION_ENDPOINT}/generate-id`, 
        {
          feature_name: featureName,
          milestone,
          project_id: projectId
        }
      );
      return response.data;
    } catch (featureApiError) {
      console.warn('Feature Creation API error, falling back to simple ID generation:', featureApiError);
      
      // If Feature Creation API fails, generate a simple ID
      const idNumber = Math.floor(1000 + Math.random() * 9000);
      const namePart = featureName.toLowerCase().replace(/[^\w]+/g, '-').substring(0, 30);
      return {
        success: true,
        id: `feature-${idNumber}-${namePart}`
      };
    }
  } catch (error) {
    console.error('Error generating feature ID:', error);
    throw error;
  }
};

/**
 * Suggest an appropriate milestone based on feature data
 * 
 * @param {Object} featureData The feature data
 * @returns {Promise<string>} The suggested milestone ID 
 */
const suggestMilestone = async (featureData) => {
  try {
    // Get analysis result if available
    const analysis = featureData.analysis || 
      (await analyzeFeature(featureData.name, featureData.description))?.analysis || {};
    
    // Logic to determine the appropriate milestone based on analysis
    const domain = analysis.domain || '';
    const purpose = analysis.purpose || '';
    
    // Map domains to milestones
    if (domain.includes('test')) return 'milestone-integrated-testing';
    if (domain.includes('ui')) return 'milestone-ui-dashboard';
    if (domain.includes('integrat')) return 'milestone-github-integration';
    
    // Check name and description for clues
    const text = `${featureData.name} ${featureData.description}`.toLowerCase();
    if (text.includes('test')) return 'milestone-integrated-testing';
    if (text.includes('ui') || text.includes('interface') || text.includes('dashboard')) return 'milestone-ui-dashboard';
    if (text.includes('git') || text.includes('github')) return 'milestone-github-integration';
    
    // Default to core foundation
    return 'milestone-core-foundation';
  } catch (error) {
    console.error('Error suggesting milestone:', error);
    return 'milestone-core-foundation';
  }
};

/**
 * Suggest an appropriate phase based on feature data and milestone
 * 
 * @param {Object} featureData The feature data
 * @param {string} milestone The milestone ID
 * @returns {Promise<string>} The suggested phase ID
 */
const suggestPhase = async (featureData, milestone) => {
  try {
    // Logic to determine the appropriate phase based on milestone and data
    // This would typically query the project structure to understand available phases
    
    // For now, use a simple mapping
    const phaseMapping = {
      'milestone-integrated-testing': ['phase-01', 'phase-02', 'phase-03', 'phase-04'],
      'milestone-core-foundation': ['phase-01', 'phase-02', 'phase-03'],
      'milestone-ui-dashboard': ['phase-01', 'phase-02', 'phase-03', 'phase-04', 'phase-05', 'phase-06'],
      'milestone-github-integration': ['phase-01', 'phase-02', 'phase-03', 'phase-04']
    };
    
    // If milestone has phases defined, use them
    if (phaseMapping[milestone]) {
      // Simple heuristic to select phase
      const text = `${featureData.name} ${featureData.description}`.toLowerCase();
      
      // Look for phase indicators in the text
      if (text.includes('foundation') || text.includes('core') || text.includes('basic')) {
        return phaseMapping[milestone][0]; // First phase
      }
      
      if (text.includes('final') || text.includes('polish') || text.includes('complete')) {
        return phaseMapping[milestone][phaseMapping[milestone].length - 1]; // Last phase
      }
      
      // Default to middle phase
      const middlePhaseIndex = Math.floor(phaseMapping[milestone].length / 2);
      return phaseMapping[milestone][middlePhaseIndex];
    }
    
    // Default to phase-02
    return 'phase-02';
  } catch (error) {
    console.error('Error suggesting phase:', error);
    return 'phase-02';
  }
};

/**
 * Suggest an appropriate module based on feature data, milestone, and phase
 * 
 * @param {Object} featureData The feature data
 * @param {string} milestone The milestone ID
 * @param {string} phase The phase ID
 * @returns {Promise<string>} The suggested module ID
 */
const suggestModule = async (featureData, milestone, phase) => {
  try {
    // This would typically query the project structure to understand available modules
    // For now, use a simple mapping
    const moduleMapping = {
      'milestone-integrated-testing': {
        'phase-01': ['test-core', 'test-infrastructure'],
        'phase-02': ['test-progression', 'test-automation'],
        'phase-04': ['test-scenarios', 'test-integration']
      },
      'milestone-ui-dashboard': {
        'phase-04': ['feature-improvements', 'ui-enhancements'],
        'phase-05': ['status-display', 'dashboard-metrics']
      },
      'milestone-github-integration': {
        'phase-04': ['github-lifecycle', 'github-sync']
      }
    };
    
    // If milestone and phase have modules defined, use them
    if (moduleMapping[milestone]?.[phase]) {
      const modules = moduleMapping[milestone][phase];
      
      // Simple heuristic to select module
      const text = `${featureData.name} ${featureData.description}`.toLowerCase();
      
      // Check for module indicators in the text
      for (const module of modules) {
        const moduleKey = module.replace(/[^a-z0-9]/g, '');
        if (text.includes(moduleKey)) {
          return module;
        }
      }
      
      // Default to first module
      return modules[0];
    }
    
    // Generate a module name based on the feature domain
    const analysis = featureData.analysis || {};
    const domain = analysis.domain || '';
    
    if (domain.includes('test')) return 'test-core';
    if (domain.includes('ui')) return 'ui-components';
    if (domain.includes('integrat')) return 'integration-services';
    if (domain.includes('api')) return 'api-services';
    
    // Default module
    return 'core-features';
  } catch (error) {
    console.error('Error suggesting module:', error);
    return 'core-features';
  }
};

/**
 * Fetch features from the Knowledge Graph
 * 
 * @param {Object} filters Optional filters for the query
 * @returns {Promise<Array>} Array of feature objects
 */
export const fetchFeatures = async (filters = {}) => {
  try {
    // Build query based on filters
    let queryParams = '?type=feature';
    
    if (filters.milestone) {
      queryParams += `&milestone=${filters.milestone}`;
    }
    
    if (filters.phase) {
      queryParams += `&phase=${filters.phase}`;
    }
    
    if (filters.module) {
      queryParams += `&module=${filters.module}`;
    }
    
    if (filters.status) {
      queryParams += `&status=${filters.status}`;
    }
    
    // Get feature nodes
    const response = await axios.get(`${KNOWLEDGE_GRAPH_API}/nodes${queryParams}`);
    
    // Extract and format feature data
    const features = response.data.map(node => ({
      id: node.id,
      name: node.properties.name,
      description: node.properties.description,
      status: node.properties.status || 'not_started',
      milestone: node.properties.milestone,
      phase: node.properties.phase,
      module: node.properties.module,
      tags: node.properties.tags || [],
      lastUpdated: node.properties.updated_at || node.properties.created_at
    }));
    
    return features;
  } catch (error) {
    console.error('Error fetching features from Knowledge Graph:', error);
    
    // If API fails, return empty array to avoid breaking UI
    return [];
  }
};

/**
 * Update a feature in the Knowledge Graph
 * 
 * @param {string} featureId The feature ID
 * @param {Object} updateData The data to update
 * @returns {Promise<Object>} The updated feature
 */
export const updateFeature = async (featureId, updateData) => {
  try {
    // Update feature node in Knowledge Graph
    const response = await axios.put(`${KNOWLEDGE_GRAPH_API}/node/${featureId}`, {
      properties: updateData
    });
    
    return {
      success: true,
      feature: response.data
    };
  } catch (error) {
    console.error(`Error updating feature ${featureId}:`, error);
    throw error;
  }
};

/**
 * Get the current status of the Feature Creation Agent
 * 
 * @returns {Promise<Object>} Agent status
 */
export const getAgentStatus = async () => {
  try {
    const response = await axios.get(`${FEATURE_CREATION_ENDPOINT}/status`);
    return response.data;
  } catch (error) {
    console.error('Error getting agent status:', error);
    
    // Return fallback status to avoid breaking UI
    return {
      status: 'unknown',
      available: false,
      message: 'Feature Creation Agent status could not be determined'
    };
  }
};

export default {
  processFeature,
  analyzeFeature,
  suggestPlacement,
  generateFeatureId,
  getAgentStatus,
  fetchFeatures,
  updateFeature
};