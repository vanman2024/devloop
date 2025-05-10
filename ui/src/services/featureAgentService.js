/**
 * Feature Agent Service
 * 
 * Provides a unified interface for interacting with both the Feature Creation Agent
 * and the Task Agent. This service allows generating features and tasks in one
 * connected workflow, maintaining the agentic architecture design.
 */

import { processFeature, analyzeFeature } from './featureCreationService';
import { processFeatureWithAgent, processBatchWithAgent, isTaskAgentAvailable } from './taskAgentService';

/**
 * Process a feature with both Feature Creation and Task Agents
 * This creates a feature and then generates tasks for it
 * 
 * @param {Object} featureData - The feature data to process
 * @param {boolean} [generateTasks=true] - Whether to automatically generate tasks
 * @returns {Promise<Object>} The combined result
 */
export const createFeatureWithTasks = async (featureData, generateTasks = true) => {
  try {
    // Step 1: Process the feature with the Feature Creation Agent
    const featureResult = await processFeature(featureData);
    
    if (!featureResult.success || !featureResult.feature) {
      return {
        success: false,
        message: featureResult.message || 'Failed to create feature',
        feature: null,
        tasks: []
      };
    }
    
    // If tasks should not be generated, return just the feature
    if (!generateTasks) {
      return {
        success: true,
        message: 'Feature created successfully (without tasks)',
        feature: featureResult.feature,
        tasks: []
      };
    }
    
    // Step 2: Generate tasks for the feature with the Task Agent
    try {
      // Check if Task Agent is available
      const taskAgentAvailable = await isTaskAgentAvailable();
      
      if (!taskAgentAvailable) {
        return {
          success: true,
          message: 'Feature created successfully, but task generation is not available',
          feature: featureResult.feature,
          tasks: []
        };
      }
      
      // Generate tasks for the feature
      const taskResult = await processFeatureWithAgent(featureResult.feature.id);
      
      return {
        success: true,
        message: 'Feature and tasks created successfully',
        feature: featureResult.feature,
        tasks: taskResult.tasks || [],
        taskResult
      };
    } catch (taskError) {
      console.error('Error generating tasks for feature:', taskError);
      
      // Return success but note the task generation failure
      return {
        success: true,
        message: `Feature created successfully, but task generation failed: ${taskError.message}`,
        feature: featureResult.feature,
        tasks: []
      };
    }
  } catch (error) {
    console.error('Error in unified feature creation process:', error);
    throw error;
  }
};

/**
 * Analyze a feature and estimate the number and types of tasks
 * that would be generated without actually creating the feature
 * 
 * @param {string} name - Feature name
 * @param {string} description - Feature description
 * @returns {Promise<Object>} Analysis results with task estimates
 */
export const analyzeFeatureWithTaskEstimate = async (name, description) => {
  try {
    // First analyze the feature
    const analysisResult = await analyzeFeature(name, description);
    
    if (!analysisResult.success) {
      return analysisResult;
    }
    
    // Based on feature analysis, estimate tasks
    const { domain, purpose, complexity } = analysisResult.analysis || {};
    
    // Simple heuristic for task estimation
    let estimatedTaskCount = 5; // Default baseline
    
    // Adjust based on domain
    if (domain === 'ui') estimatedTaskCount += 3; // UI features tend to have more tasks
    if (domain === 'testing') estimatedTaskCount += 2; // Testing features have more validation tasks
    if (domain === 'api') estimatedTaskCount += 1; // API features have more integration tasks
    
    // Adjust based on purpose
    if (purpose === 'enhancement') estimatedTaskCount -= 1; // Enhancements are usually smaller
    if (purpose === 'feature') estimatedTaskCount += 2; // New features are usually larger
    
    // Adjust based on complexity (if available)
    if (complexity === 'high') estimatedTaskCount += 3;
    if (complexity === 'low') estimatedTaskCount -= 2;
    
    // Ensure reasonable bounds
    estimatedTaskCount = Math.max(2, Math.min(estimatedTaskCount, 15));
    
    // Sample task types based on domain
    const taskTypes = [];
    
    if (domain === 'ui' || domain === 'frontend') {
      taskTypes.push('Component Design', 'Component Implementation', 'Styling', 'State Management', 'Testing');
    } else if (domain === 'api' || domain === 'backend') {
      taskTypes.push('API Design', 'Endpoint Implementation', 'Data Validation', 'Error Handling', 'Testing');
    } else if (domain === 'testing') {
      taskTypes.push('Test Plan', 'Unit Tests', 'Integration Tests', 'Test Automation', 'Test Documentation');
    } else {
      taskTypes.push('Design', 'Implementation', 'Documentation', 'Testing', 'Review');
    }
    
    // Return enhanced analysis with task estimates
    return {
      ...analysisResult,
      taskEstimate: {
        estimatedTaskCount,
        taskTypes: taskTypes.slice(0, Math.min(taskTypes.length, estimatedTaskCount))
      }
    };
  } catch (error) {
    console.error('Error analyzing feature with task estimate:', error);
    throw error;
  }
};

/**
 * Process multiple features and generate tasks for them
 * 
 * @param {Array<Object>} featuresData - Array of feature data objects
 * @param {boolean} [generateTasks=true] - Whether to automatically generate tasks
 * @returns {Promise<Object>} Results of batch processing
 */
export const processFeaturesWithTasks = async (featuresData, generateTasks = true) => {
  try {
    // Step 1: Process all features first
    const featureResults = await Promise.all(
      featuresData.map(featureData => processFeature(featureData))
    );
    
    // Extract successfully created feature IDs
    const successfulFeatures = featureResults
      .filter(result => result.success && result.feature)
      .map(result => result.feature);
    
    const featureIds = successfulFeatures.map(feature => feature.id);
    
    // If no features were created or tasks shouldn't be generated, return just the feature results
    if (featureIds.length === 0 || !generateTasks) {
      return {
        success: featureResults.some(result => result.success),
        message: `Created ${successfulFeatures.length}/${featuresData.length} features successfully (without tasks)`,
        features: successfulFeatures,
        tasks: []
      };
    }
    
    // Step 2: Generate tasks for all successful features
    try {
      // Check if Task Agent is available
      const taskAgentAvailable = await isTaskAgentAvailable();
      
      if (!taskAgentAvailable) {
        return {
          success: true,
          message: `Features created successfully, but task generation is not available`,
          features: successfulFeatures,
          tasks: []
        };
      }
      
      // Process the batch of features with the Task Agent
      const batchResult = await processBatchWithAgent(featureIds);
      
      return {
        success: true,
        message: `Created ${successfulFeatures.length}/${featuresData.length} features with tasks successfully`,
        features: successfulFeatures,
        featureResults,
        batchResult
      };
    } catch (taskError) {
      console.error('Error generating tasks for features:', taskError);
      
      // Return success for features but note the task generation failure
      return {
        success: true,
        message: `Features created successfully, but task generation failed: ${taskError.message}`,
        features: successfulFeatures,
        tasks: []
      };
    }
  } catch (error) {
    console.error('Error in batch feature processing:', error);
    throw error;
  }
};

/**
 * Check if both feature and task agents are available
 * 
 * @returns {Promise<Object>} Availability status of both agents
 */
export const checkAgentsAvailability = async () => {
  try {
    // Check if the Task Agent is available
    const taskAgentAvailable = await isTaskAgentAvailable();
    
    // Check if the Feature Creation Agent is available by making a simple analysis request
    let featureAgentAvailable = false;
    try {
      const testAnalysis = await analyzeFeature("Test Feature", "This is a test feature description");
      featureAgentAvailable = testAnalysis.success;
    } catch (e) {
      console.warn('Feature Agent availability check failed:', e);
      featureAgentAvailable = false;
    }
    
    return {
      allAvailable: taskAgentAvailable && featureAgentAvailable,
      taskAgentAvailable,
      featureAgentAvailable
    };
  } catch (error) {
    console.error('Error checking agent availability:', error);
    return {
      allAvailable: false,
      taskAgentAvailable: false,
      featureAgentAvailable: false,
      error: error.message
    };
  }
};

export default {
  createFeatureWithTasks,
  analyzeFeatureWithTaskEstimate,
  processFeaturesWithTasks,
  checkAgentsAvailability
};