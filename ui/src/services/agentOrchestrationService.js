/**
 * Agent Orchestration Service
 * 
 * This service provides a unified interface for managing interactions
 * between agents across different AI providers (Anthropic, OpenAI, Google).
 * It connects the UI to the backend orchestration service to enable
 * multi-agent workflows.
 * 
 * Features:
 * - Unified interface for all agent interactions
 * - Support for both manager and decentralized patterns
 * - Conversation state management across agents
 * - Task creation and management
 * - Agent capability discovery
 */

// API base URL
const API_BASE_URL = 'http://localhost:8000/api';
const ORCHESTRATION_API_URL = `${API_BASE_URL}/orchestration`;

// Agent types
export const AGENT_TYPES = {
  FEATURE_CREATION: 'feature_creation',
  TASK: 'task',
  RELATIONSHIP: 'relationship',
  CHAT: 'chat',
  ORCHESTRATOR: 'orchestrator',
  KNOWLEDGE_GRAPH: 'knowledge_graph',
  CUSTOM: 'custom'
};

// Agent providers
export const AGENT_PROVIDERS = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai',
  GOOGLE: 'google',
  UNKNOWN: 'unknown'
};

// Agent roles
export const AGENT_ROLES = {
  MANAGER: 'manager',
  WORKER: 'worker',
  PEER: 'peer',
  EVALUATOR: 'evaluator'
};

// Task status
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  WAITING: 'waiting',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Initialize a conversation with the orchestration service
 * @param {string} conversationId - The conversation ID (optional, will be generated if not provided)
 * @param {Object} context - Initial context for the conversation
 * @returns {Promise<Object>} Created conversation
 */
export const initializeConversation = async (conversationId = null, context = {}) => {
  try {
    const response = await fetch(`${ORCHESTRATION_API_URL}/conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        context
      }),
    });

    if (!response.ok) {
      throw new Error(`Error initializing conversation: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error initializing conversation:', error);
    
    // Return a fallback conversation object for offline usage
    return {
      conversation_id: conversationId || `conversation_${Date.now()}`,
      created_at: new Date().toISOString(),
      context,
      messages: []
    };
  }
};

/**
 * Process a message through the orchestration service
 * @param {string} conversationId - The conversation ID
 * @param {string} message - The message to process
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing result
 */
export const processMessage = async (conversationId, message, options = {}) => {
  try {
    const response = await fetch(`${ORCHESTRATION_API_URL}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        message,
        options
      }),
    });

    if (!response.ok) {
      throw new Error(`Error processing message: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error processing message for conversation ${conversationId}:`, error);
    
    // Generate a fallback response for offline usage
    return generateFallbackResponse(message, conversationId);
  }
};

/**
 * Generate a fallback response when the orchestration service is unavailable
 * @param {string} message - The user message
 * @param {string} conversationId - The conversation ID
 * @returns {Object} Fallback response
 */
const generateFallbackResponse = (message, conversationId) => {
  const lowerMessage = message.toLowerCase();
  let responseContent = 'I apologize, but I am currently operating in offline mode and cannot process your request through our agent network. Please try again later when the service is available.';
  let agentType = AGENT_TYPES.CHAT;

  // Simple fallback logic for common patterns
  if (lowerMessage.includes('create feature') || lowerMessage.includes('new feature')) {
    responseContent = 'I would help you create a new feature, but I am currently operating in offline mode. Please try again when the service is available.';
    agentType = AGENT_TYPES.FEATURE_CREATION;
  } else if (lowerMessage.includes('task') || lowerMessage.includes('todo')) {
    responseContent = 'I would help you with task management, but I am currently operating in offline mode. Please try again when the service is available.';
    agentType = AGENT_TYPES.TASK;
  } else if (lowerMessage.includes('relationship') || lowerMessage.includes('connection')) {
    responseContent = 'I would help you analyze relationships, but I am currently operating in offline mode. Please try again when the service is available.';
    agentType = AGENT_TYPES.RELATIONSHIP;
  }

  return {
    conversationId,
    message: responseContent,
    agent: agentType,
    offline: true
  };
};

/**
 * Get agents by type, provider, or capabilities
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} List of matching agents
 */
export const getAgents = async (filters = {}) => {
  try {
    // Build query string from filters
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => queryParams.append(`${key}[]`, item));
        } else {
          queryParams.append(key, value);
        }
      }
    });

    const response = await fetch(`${ORCHESTRATION_API_URL}/agents?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Error getting agents: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting agents:', error);
    return [];
  }
};

/**
 * Create a task in the orchestration service
 * @param {Object} taskData - Task data
 * @returns {Promise<Object>} Created task
 */
export const createTask = async (taskData) => {
  try {
    const response = await fetch(`${ORCHESTRATION_API_URL}/tasks`, {
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
    console.error('Error creating task:', error);
    
    // Return a fallback task object for offline usage
    return {
      task_id: `task_${Date.now()}`,
      description: taskData.description || 'Offline task',
      agent_id: taskData.agent_id,
      status: TASK_STATUS.PENDING,
      created_at: new Date().toISOString(),
      offline: true
    };
  }
};

/**
 * Execute a task in the orchestration service
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} Task execution result
 */
export const executeTask = async (taskId) => {
  try {
    const response = await fetch(`${ORCHESTRATION_API_URL}/tasks/${taskId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Error executing task: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error executing task ${taskId}:`, error);
    
    // Return a fallback execution result for offline usage
    return {
      success: false,
      error: 'Task execution failed - orchestration service is unavailable',
      offline: true
    };
  }
};

/**
 * Create a workflow of tasks
 * @param {Array} tasks - List of tasks in the workflow
 * @param {Object} options - Workflow options
 * @returns {Promise<Object>} Workflow creation result
 */
export const createWorkflow = async (tasks, options = {}) => {
  try {
    const response = await fetch(`${ORCHESTRATION_API_URL}/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks,
        options
      }),
    });

    if (!response.ok) {
      throw new Error(`Error creating workflow: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating workflow:', error);
    
    // Return a fallback workflow object for offline usage
    return {
      workflow_id: `workflow_${Date.now()}`,
      success: false,
      error: 'Workflow creation failed - orchestration service is unavailable',
      offline: true
    };
  }
};

/**
 * Execute a workflow in the orchestration service
 * @param {string} workflowId - The workflow ID
 * @returns {Promise<Object>} Workflow execution result
 */
export const executeWorkflow = async (workflowId) => {
  try {
    const response = await fetch(`${ORCHESTRATION_API_URL}/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Error executing workflow: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error executing workflow ${workflowId}:`, error);
    
    // Return a fallback execution result for offline usage
    return {
      success: false,
      error: 'Workflow execution failed - orchestration service is unavailable',
      offline: true
    };
  }
};

/**
 * Check if the orchestration service is available
 * @returns {Promise<boolean>} Whether the service is available
 */
export const isOrchestrationServiceAvailable = async () => {
  try {
    const response = await fetch(`${ORCHESTRATION_API_URL}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Short timeout to quickly determine availability
      signal: AbortSignal.timeout(2000)
    });

    return response.ok;
  } catch (error) {
    console.warn('Orchestration service unavailable:', error);
    return false;
  }
};

/**
 * Check the availability of all agent providers
 * @returns {Promise<Object>} Provider availability status
 */
export const checkProviderAvailability = async () => {
  try {
    const response = await fetch(`${ORCHESTRATION_API_URL}/providers/status`);

    if (!response.ok) {
      throw new Error(`Error checking provider availability: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking provider availability:', error);
    
    // Return a fallback provider status for offline usage
    return {
      [AGENT_PROVIDERS.ANTHROPIC]: false,
      [AGENT_PROVIDERS.OPENAI]: false,
      [AGENT_PROVIDERS.GOOGLE]: false
    };
  }
};

/**
 * Send a message directly to an agent, bypassing the orchestration service
 * @param {string} agentId - The agent ID
 * @param {string} message - The message to send
 * @param {Object} options - Message options
 * @returns {Promise<Object>} Message sending result
 */
export const sendDirectAgentMessage = async (agentId, message, options = {}) => {
  try {
    const response = await fetch(`${ORCHESTRATION_API_URL}/agents/${agentId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        options
      }),
    });

    if (!response.ok) {
      throw new Error(`Error sending message to agent: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error sending direct message to agent ${agentId}:`, error);
    
    // Return a fallback response for offline usage
    return {
      success: false,
      error: 'Direct agent messaging failed - orchestration service is unavailable',
      offline: true
    };
  }
};

/**
 * Register a new agent with the orchestration service
 * @param {Object} agentData - Agent data
 * @returns {Promise<Object>} Agent registration result
 */
export const registerAgent = async (agentData) => {
  try {
    const response = await fetch(`${ORCHESTRATION_API_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentData),
    });

    if (!response.ok) {
      throw new Error(`Error registering agent: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error registering agent:', error);
    
    // Return a fallback result for offline usage
    return {
      success: false,
      error: 'Agent registration failed - orchestration service is unavailable',
      offline: true
    };
  }
};

/**
 * Create a conversation with multiple specialized agent participants
 * @param {string} conversationId - The conversation ID
 * @param {Array} agents - List of agents to include in the conversation
 * @param {Object} options - Conversation options
 * @returns {Promise<Object>} Conversation creation result
 */
export const createMultiAgentConversation = async (conversationId, agents, options = {}) => {
  try {
    const response = await fetch(`${ORCHESTRATION_API_URL}/conversations/multi-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        agents,
        options
      }),
    });

    if (!response.ok) {
      throw new Error(`Error creating multi-agent conversation: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating multi-agent conversation:', error);
    
    // Return a fallback conversation for offline usage
    return {
      conversation_id: conversationId || `conversation_${Date.now()}`,
      agents,
      success: false,
      error: 'Multi-agent conversation creation failed - orchestration service is unavailable',
      offline: true
    };
  }
};

/**
 * Setup an agent orchestration workflow with multiple agents
 * @param {Object} workflowConfig - Workflow configuration
 * @returns {Promise<Object>} Workflow setup result
 */
export const setupAgentWorkflow = async (workflowConfig) => {
  try {
    const response = await fetch(`${ORCHESTRATION_API_URL}/workflows/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflowConfig),
    });

    if (!response.ok) {
      throw new Error(`Error setting up agent workflow: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error setting up agent workflow:', error);
    
    // Return a fallback result for offline usage
    return {
      success: false,
      error: 'Agent workflow setup failed - orchestration service is unavailable',
      offline: true
    };
  }
};

export default {
  AGENT_TYPES,
  AGENT_PROVIDERS,
  AGENT_ROLES,
  TASK_STATUS,
  initializeConversation,
  processMessage,
  getAgents,
  createTask,
  executeTask,
  createWorkflow,
  executeWorkflow,
  isOrchestrationServiceAvailable,
  checkProviderAvailability,
  sendDirectAgentMessage,
  registerAgent,
  createMultiAgentConversation,
  setupAgentWorkflow
};