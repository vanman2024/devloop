import axios from 'axios';
import { getWebSocketService } from './websocketService';

// API endpoint for project structure operations
const STRUCTURE_ENDPOINT = '/api/v1/project-structure';

// Initialize the WebSocket service for real-time updates
const webSocketService = getWebSocketService();

/**
 * Initialize a new project structure
 * @param {Object} projectData - Project initialization data
 * @param {string} projectData.projectName - The name of the project
 * @param {string} projectData.description - Optional project description
 * @param {string} projectData.templateType - The type of template to use
 * @param {Object} projectData.initialStructure - Optional initial structure data
 * @returns {Promise} The created project structure
 */
export const initializeProject = async (projectData) => {
  try {
    const response = await axios.post(`${STRUCTURE_ENDPOINT}/initialize`, projectData);
    return response.data;
  } catch (error) {
    console.error('Error initializing project:', error);
    throw error;
  }
};

/**
 * Retrieve an existing project structure
 * @param {string} projectId - The ID of the project to retrieve
 * @returns {Promise} The project structure
 */
export const getProjectStructure = async (projectId) => {
  try {
    const response = await axios.get(`${STRUCTURE_ENDPOINT}/get-structure/${projectId}`);
    return response.data;
  } catch (error) {
    console.error('Error retrieving project structure:', error);
    throw error;
  }
};

/**
 * List all available projects
 * @returns {Promise} List of projects with basic metadata
 */
export const listProjects = async () => {
  try {
    const response = await axios.get(`${STRUCTURE_ENDPOINT}/list`);
    return response.data;
  } catch (error) {
    console.error('Error listing projects:', error);
    throw error;
  }
};

/**
 * Add a new component to a project structure
 * @param {string} projectId - The ID of the project
 * @param {Object} componentData - The component data to add
 * @param {string} componentData.name - The name of the component
 * @param {string} componentData.type - The type of component
 * @param {string} componentData.parentId - The ID of the parent component
 * @param {Object} componentData.metadata - Additional component metadata
 * @returns {Promise} The updated project structure
 */
export const addComponent = async (projectId, componentData) => {
  try {
    const response = await axios.post(`${STRUCTURE_ENDPOINT}/add-component/${projectId}`, componentData);
    return response.data;
  } catch (error) {
    console.error('Error adding component:', error);
    throw error;
  }
};

/**
 * Update an existing component in a project structure
 * @param {string} projectId - The ID of the project
 * @param {string} componentId - The ID of the component to update
 * @param {Object} updateData - The updated component data
 * @returns {Promise} The updated project structure
 */
export const updateComponent = async (projectId, componentId, updateData) => {
  try {
    const response = await axios.put(
      `${STRUCTURE_ENDPOINT}/update-component/${projectId}/${componentId}`, 
      updateData
    );
    return response.data;
  } catch (error) {
    console.error('Error updating component:', error);
    throw error;
  }
};

/**
 * Move a component within the project structure
 * @param {string} projectId - The ID of the project
 * @param {string} componentId - The ID of the component to move
 * @param {string} newParentId - The ID of the new parent component
 * @param {number} newIndex - Optional new index position within parent's children
 * @returns {Promise} The updated project structure
 */
export const moveComponent = async (projectId, componentId, newParentId, newIndex) => {
  try {
    const response = await axios.post(
      `${STRUCTURE_ENDPOINT}/move-component/${projectId}/${componentId}`,
      { newParentId, newIndex }
    );
    return response.data;
  } catch (error) {
    console.error('Error moving component:', error);
    throw error;
  }
};

/**
 * Delete a component from the project structure
 * @param {string} projectId - The ID of the project
 * @param {string} componentId - The ID of the component to delete
 * @returns {Promise} The updated project structure
 */
export const deleteComponent = async (projectId, componentId) => {
  try {
    const response = await axios.delete(
      `${STRUCTURE_ENDPOINT}/delete-component/${projectId}/${componentId}`
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting component:', error);
    throw error;
  }
};

/**
 * Request agent assistance to rebalance a project structure
 * @param {string} projectId - The ID of the project
 * @param {Object} options - Optional rebalancing options
 * @returns {Promise} The rebalanced project structure
 */
export const rebalanceStructure = async (projectId, options = {}) => {
  try {
    const response = await axios.post(
      `${STRUCTURE_ENDPOINT}/balance/${projectId}`,
      options
    );
    return response.data;
  } catch (error) {
    console.error('Error rebalancing structure:', error);
    throw error;
  }
};

/**
 * Get agent recommendations for improving a project structure
 * @param {string} projectId - The ID of the project
 * @returns {Promise} List of improvement recommendations
 */
export const getStructureRecommendations = async (projectId) => {
  try {
    const response = await axios.get(
      `${STRUCTURE_ENDPOINT}/recommendations/${projectId}`
    );
    return response.data;
  } catch (error) {
    console.error('Error getting structure recommendations:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time structure updates for a project
 * @param {string} projectId - The ID of the project to watch
 * @param {Function} callback - Callback function for updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToStructureUpdates = (projectId, callback) => {
  const channel = `project-structure-${projectId}`;
  
  const handleMessage = (message) => {
    if (message.type === 'structure-update' && message.projectId === projectId) {
      callback(message.data);
    }
  };
  
  // Subscribe to updates via WebSocket
  webSocketService.subscribe(channel, handleMessage);
  
  // Return unsubscribe function
  return () => webSocketService.unsubscribe(channel, handleMessage);
};

export default {
  initializeProject,
  getProjectStructure,
  listProjects,
  addComponent,
  updateComponent,
  moveComponent,
  deleteComponent,
  rebalanceStructure,
  getStructureRecommendations,
  subscribeToStructureUpdates
};