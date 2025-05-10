/**
 * Task Service
 * 
 * Provides methods for interacting with the task management API.
 * Uses the Knowledge Graph as the single source of truth.
 */

// Base API URL
const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Fetch all tasks from the Knowledge Graph
 * @returns {Promise<Array>} Array of task objects
 */
export const fetchAllTasks = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/graph/nodes?type=task`);
    
    if (!response.ok) {
      throw new Error(`Error fetching tasks: ${response.statusText}`);
    }
    
    const tasks = await response.json();
    return tasks.map(formatTaskFromNode);
  } catch (error) {
    console.error('Error in fetchAllTasks:', error);
    throw error;
  }
};

/**
 * Fetch tasks for a specific feature
 * @param {string} featureId - The feature ID
 * @returns {Promise<Array>} Array of task objects
 */
export const fetchFeatureTasks = async (featureId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/graph/feature/${featureId}/tasks`);
    
    if (!response.ok) {
      throw new Error(`Error fetching feature tasks: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error in fetchFeatureTasks for ${featureId}:`, error);
    throw error;
  }
};

/**
 * Create a new task for a feature
 * @param {string} featureId - The feature ID
 * @param {Object} taskData - The task data
 * @returns {Promise<Object>} The created task
 */
export const createFeatureTask = async (featureId, taskData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/graph/feature/${featureId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
    });
    
    if (!response.ok) {
      throw new Error(`Error creating task: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in createFeatureTask:', error);
    throw error;
  }
};

/**
 * Update an existing task
 * @param {string} taskId - The task ID
 * @param {Object} taskData - The updated task data
 * @returns {Promise<Object>} The updated task
 */
export const updateTask = async (taskId, taskData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/graph/node/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: taskData
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error updating task: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error in updateTask for ${taskId}:`, error);
    throw error;
  }
};

/**
 * Delete a task
 * @param {string} taskId - The task ID
 * @returns {Promise<boolean>} True if deletion was successful
 */
export const deleteTask = async (taskId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/graph/node/${taskId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Error deleting task: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error in deleteTask for ${taskId}:`, error);
    throw error;
  }
};

/**
 * Get tasks by status
 * @param {string} status - The task status
 * @returns {Promise<Array>} Array of task objects
 */
export const getTasksByStatus = async (status) => {
  try {
    const allTasks = await fetchAllTasks();
    return allTasks.filter(task => task.status === status);
  } catch (error) {
    console.error(`Error in getTasksByStatus for ${status}:`, error);
    throw error;
  }
};

/**
 * Get feature for a task
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} The parent feature
 */
export const getTaskFeature = async (taskId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/graph/edges?type=feature_has_task`);
    
    if (!response.ok) {
      throw new Error(`Error fetching task relationships: ${response.statusText}`);
    }
    
    const edges = await response.json();
    const taskEdge = edges.find(edge => edge.target === taskId);
    
    if (!taskEdge) {
      throw new Error(`No feature found for task ${taskId}`);
    }
    
    const featureResponse = await fetch(`${API_BASE_URL}/graph/node/${taskEdge.source}`);
    
    if (!featureResponse.ok) {
      throw new Error(`Error fetching feature: ${featureResponse.statusText}`);
    }
    
    return await featureResponse.json();
  } catch (error) {
    console.error(`Error in getTaskFeature for ${taskId}:`, error);
    throw error;
  }
};

/**
 * Format task from KG node format to application format
 * @param {Object} node - The node object from Knowledge Graph
 * @returns {Object} Formatted task object
 */
const formatTaskFromNode = (node) => {
  return {
    id: node.id,
    name: node.properties.name,
    description: node.properties.description,
    status: node.properties.status,
    priority: node.properties.priority,
    complexity: node.properties.complexity,
    estimatedHours: node.properties.estimated_hours,
    createdAt: node.created_at,
    updatedAt: node.updated_at
  };
};

/**
 * Get task completion statistics for a feature
 * @param {string} featureId - The feature ID
 * @returns {Promise<Object>} Task statistics
 */
export const getFeatureTaskStats = async (featureId) => {
  try {
    let tasks = [];
    try {
      tasks = await fetchFeatureTasks(featureId);
    } catch (fetchError) {
      console.warn(`Could not fetch tasks for feature ${featureId}, returning empty stats:`, fetchError);
      // Return empty stats instead of throwing
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        notStarted: 0,
        completionPercentage: 0
      };
    }
    
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === 'completed').length;
    const inProgress = tasks.filter(task => task.status === 'in-progress').length;
    const notStarted = tasks.filter(task => task.status === 'not-started').length;
    
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      total,
      completed,
      inProgress,
      notStarted,
      completionPercentage
    };
  } catch (error) {
    console.error(`Error in getFeatureTaskStats for ${featureId}:`, error);
    // Return empty stats instead of throwing
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      completionPercentage: 0
    };
  }
};