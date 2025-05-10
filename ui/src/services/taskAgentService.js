/**
 * Task Agent Service
 * 
 * Provides methods for interfacing with the Task Agent API.
 * This service allows the UI to use the AI-powered Task Agent to:
 * - Generate tasks from feature requirements and user stories
 * - Analyze task dependencies
 * - Manage task lifecycle
 * - Get task completion statistics
 */

import { fetchFeatureTasks, updateTask } from './taskService';

// Base API URL
const API_BASE_URL = 'http://localhost:8000/api';
const AGENT_API_URL = `${API_BASE_URL}/agents`;

/**
 * Process a feature to generate tasks using the Task Agent
 * @param {string} featureId - The ID of the feature to process
 * @param {boolean} [useLlm=true] - Whether to use AI for task extraction
 * @returns {Promise<Object>} The result of processing the feature
 */
export const processFeatureWithAgent = async (featureId, useLlm = true) => {
  try {
    // Execute the task agent to process the feature
    const response = await fetch(`${AGENT_API_URL}/task_agent/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'process',
        params: {
          feature_id: featureId,
          use_llm: useLlm
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Error executing task agent: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error in processFeatureWithAgent for ${featureId}:`, error);
    
    // Fallback to direct API call if agent execution fails
    try {
      console.warn('Task Agent execution failed, falling back to direct API call');
      const response = await fetch(`${API_BASE_URL}/graph/feature/${featureId}/generate-tasks`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Error generating tasks: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (fallbackError) {
      console.error('Fallback API call also failed:', fallbackError);
      throw error; // Throw the original error
    }
  }
};

/**
 * Process multiple features to generate tasks using the Task Agent
 * @param {Array<string>} featureIds - The IDs of the features to process
 * @param {boolean} [useLlm=true] - Whether to use AI for task extraction
 * @returns {Promise<Object>} The result of processing the features
 */
export const processBatchWithAgent = async (featureIds, useLlm = true) => {
  try {
    // Execute the task agent to process multiple features
    const response = await fetch(`${AGENT_API_URL}/task_agent/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'batch',
        params: {
          feature_ids: featureIds,
          use_llm: useLlm
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Error executing task agent batch: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error in processBatchWithAgent for ${featureIds.join(', ')}:`, error);
    
    // Process features individually as fallback
    console.warn('Batch processing failed, falling back to individual processing');
    const results = {
      success: true,
      features: {},
      summary: {
        total_features: featureIds.length,
        successful: 0,
        failed: 0,
        total_tasks: 0
      }
    };

    for (const featureId of featureIds) {
      try {
        const result = await processFeatureWithAgent(featureId, useLlm);
        
        results.features[featureId] = result;
        
        if (result.success) {
          results.summary.successful += 1;
          results.summary.total_tasks += result.tasks ? result.tasks.length : 0;
        } else {
          results.summary.failed += 1;
          results.success = false;
        }
      } catch (innerError) {
        console.error(`Error processing feature ${featureId}:`, innerError);
        results.features[featureId] = {
          success: false,
          message: innerError.message,
          tasks: []
        };
        results.summary.failed += 1;
        results.success = false;
      }
    }
    
    return results;
  }
};

/**
 * Get tasks and completion status for a feature using the Task Agent
 * @param {string} featureId - The ID of the feature
 * @returns {Promise<Object>} The tasks and completion status
 */
export const getFeatureTasksWithAgent = async (featureId) => {
  try {
    // Execute the task agent to get feature tasks
    const response = await fetch(`${AGENT_API_URL}/task_agent/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'get',
        params: {
          feature_id: featureId
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Error getting tasks with agent: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error in getFeatureTasksWithAgent for ${featureId}:`, error);
    
    // Fallback to standard task service
    console.warn('Task Agent execution failed, falling back to task service');
    try {
      const tasks = await fetchFeatureTasks(featureId);
      
      // Calculate completion statistics manually
      const total = tasks.length;
      const completed = tasks.filter(task => task.status === 'completed').length;
      const inProgress = tasks.filter(task => task.status === 'in-progress').length;
      const notStarted = tasks.filter(task => task.status === 'not-started').length;
      const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return {
        success: true,
        feature_id: featureId,
        feature_name: 'Unknown Feature', // We don't have feature name in fallback
        tasks: tasks,
        task_count: total,
        completion_status: {
          total_tasks: total,
          completed: completed,
          in_progress: inProgress,
          not_started: notStarted,
          percent_complete: completionPercentage
        },
        agent_thoughts: [] // No agent thoughts in fallback
      };
    } catch (fallbackError) {
      console.error('Fallback API call also failed:', fallbackError);
      throw error; // Throw the original error
    }
  }
};

/**
 * Update a task's status using the Task Agent
 * @param {string} taskId - The ID of the task
 * @param {string} status - The new status
 * @returns {Promise<Object>} The result of updating the task
 */
export const updateTaskWithAgent = async (taskId, status) => {
  try {
    // Execute the task agent to update task status
    const response = await fetch(`${AGENT_API_URL}/task_agent/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'update',
        params: {
          task_id: taskId,
          status: status
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Error updating task with agent: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error in updateTaskWithAgent for ${taskId}:`, error);
    
    // Fallback to standard task service
    console.warn('Task Agent execution failed, falling back to task service');
    try {
      await updateTask(taskId, { status });
      
      return {
        success: true,
        message: 'Task updated',
        task_id: taskId,
        status: status
      };
    } catch (fallbackError) {
      console.error('Fallback API call also failed:', fallbackError);
      throw error; // Throw the original error
    }
  }
};

/**
 * Check status of the Task Agent
 * @returns {Promise<Object>} The agent status
 */
export const checkTaskAgentStatus = async () => {
  try {
    const response = await fetch(`${AGENT_API_URL}/task_agent/status`);
    
    if (!response.ok) {
      throw new Error(`Error checking task agent status: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking task agent status:', error);
    
    // Return unavailable status
    return {
      success: false,
      available: false,
      message: 'Task Agent is not available',
      error: error.message
    };
  }
};

/**
 * Determine if the Task Agent is available
 * @returns {Promise<boolean>} Whether the Task Agent is available
 */
export const isTaskAgentAvailable = async () => {
  try {
    const status = await checkTaskAgentStatus();
    return status.success && status.available;
  } catch (error) {
    console.error('Error checking task agent availability:', error);
    return false;
  }
};