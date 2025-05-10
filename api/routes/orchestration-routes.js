/**
 * Orchestration Routes
 * 
 * This module provides API routes for the agent orchestration service.
 * It allows UI components to interact with the orchestration service
 * for multi-agent workflows, conversation management, and task execution.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Constants
const PROJECT_ROOT = '/mnt/c/Users/angel/devloop';
const ORCHESTRATION_SERVICE_PATH = path.join(PROJECT_ROOT, 'agents', 'utils', 'orchestration_service.py');
const TEMP_DIR = path.join(PROJECT_ROOT, 'api', 'temp');

// Make sure temp directory exists
(async () => {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating temp directory:', error);
  }
})();

// Configure routes with broadcast capability
const configureRoutes = (broadcastFn, eventTypes) => {
  // Health check endpoint
  router.get('/status', async (req, res) => {
    try {
      // Execute the orchestration service to check status
      const process = spawn('python3', [
        ORCHESTRATION_SERVICE_PATH,
        '--status'
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          res.status(200).json({
            status: 'ok',
            message: 'Orchestration service is available'
          });
        } else {
          res.status(503).json({
            status: 'error',
            message: 'Orchestration service is unavailable',
            error: stderr
          });
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error checking orchestration service status',
        error: error.message
      });
    }
  });
  
  // Provider availability endpoint
  router.get('/providers/status', async (req, res) => {
    try {
      // Execute the orchestration service to check provider status
      const process = spawn('python3', [
        ORCHESTRATION_SERVICE_PATH,
        '--provider-status'
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          try {
            const providerStatus = JSON.parse(stdout);
            res.status(200).json(providerStatus);
          } catch (e) {
            res.status(500).json({
              status: 'error',
              message: 'Error parsing provider status',
              error: e.message
            });
          }
        } else {
          res.status(500).json({
            status: 'error',
            message: 'Error checking provider status',
            error: stderr
          });
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error checking provider status',
        error: error.message
      });
    }
  });
  
  // Initialize conversation endpoint
  router.post('/conversation', async (req, res) => {
    try {
      const { conversation_id, context } = req.body;
      
      // Write conversation data to temp file
      const requestId = uuidv4();
      const dataPath = path.join(TEMP_DIR, `conversation-${requestId}.json`);
      await fs.writeFile(dataPath, JSON.stringify({
        conversation_id,
        context
      }));
      
      // Execute the orchestration service to initialize conversation
      const process = spawn('python3', [
        ORCHESTRATION_SERVICE_PATH,
        '--init-conversation',
        dataPath
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', async (code) => {
        // Clean up data file
        try {
          await fs.unlink(dataPath);
        } catch (e) {
          console.error(`Error deleting data file: ${e.message}`);
        }
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            
            // Broadcast event
            broadcastFn(eventTypes.CONVERSATION_INITIALIZED, {
              conversation_id: result.conversation_id,
              timestamp: new Date().toISOString()
            }, 'orchestration');
            
            res.status(200).json(result);
          } catch (e) {
            res.status(500).json({
              status: 'error',
              message: 'Error parsing conversation initialization result',
              error: e.message
            });
          }
        } else {
          res.status(500).json({
            status: 'error',
            message: 'Error initializing conversation',
            error: stderr
          });
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error initializing conversation',
        error: error.message
      });
    }
  });
  
  // Process message endpoint
  router.post('/process', async (req, res) => {
    try {
      const { conversation_id, message, options } = req.body;
      
      if (!conversation_id || !message) {
        return res.status(400).json({
          status: 'error',
          message: 'Conversation ID and message are required'
        });
      }
      
      // Write message data to temp file
      const requestId = uuidv4();
      const dataPath = path.join(TEMP_DIR, `message-${requestId}.json`);
      await fs.writeFile(dataPath, JSON.stringify({
        conversation_id,
        message,
        options
      }));
      
      // Execute the orchestration service to process the message
      const process = spawn('python3', [
        ORCHESTRATION_SERVICE_PATH,
        '--process-message',
        dataPath
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', async (code) => {
        // Clean up data file
        try {
          await fs.unlink(dataPath);
        } catch (e) {
          console.error(`Error deleting data file: ${e.message}`);
        }
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            
            // Broadcast event
            broadcastFn(eventTypes.MESSAGE_PROCESSED, {
              conversation_id,
              agent: result.agent,
              timestamp: new Date().toISOString()
            }, 'orchestration');
            
            res.status(200).json(result);
          } catch (e) {
            res.status(500).json({
              status: 'error',
              message: 'Error parsing message processing result',
              error: e.message
            });
          }
        } else {
          res.status(500).json({
            status: 'error',
            message: 'Error processing message',
            error: stderr
          });
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error processing message',
        error: error.message
      });
    }
  });
  
  // Get agents endpoint
  router.get('/agents', async (req, res) => {
    try {
      // Extract filter parameters
      const agent_type = req.query.agent_type;
      const provider = req.query.provider;
      const role = req.query.role;
      const capabilities = req.query.capabilities;
      const domain = req.query.domain;
      const available_only = req.query.available_only === 'true';
      
      // Build filter parameters
      const filterParams = [];
      if (agent_type) filterParams.push(`--agent-type=${agent_type}`);
      if (provider) filterParams.push(`--provider=${provider}`);
      if (role) filterParams.push(`--role=${role}`);
      if (capabilities) {
        const capList = Array.isArray(capabilities) ? capabilities : [capabilities];
        capList.forEach(cap => filterParams.push(`--capability=${cap}`));
      }
      if (domain) filterParams.push(`--domain=${domain}`);
      if (available_only) filterParams.push('--available-only');
      
      // Execute the orchestration service to get agents
      const process = spawn('python3', [
        ORCHESTRATION_SERVICE_PATH,
        '--list-agents',
        ...filterParams
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          try {
            const agents = JSON.parse(stdout);
            res.status(200).json(agents);
          } catch (e) {
            res.status(500).json({
              status: 'error',
              message: 'Error parsing agent list',
              error: e.message
            });
          }
        } else {
          res.status(500).json({
            status: 'error',
            message: 'Error getting agents',
            error: stderr
          });
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error getting agents',
        error: error.message
      });
    }
  });
  
  // Register agent endpoint
  router.post('/agents', async (req, res) => {
    try {
      const agentData = req.body;
      
      // Write agent data to temp file
      const requestId = uuidv4();
      const dataPath = path.join(TEMP_DIR, `agent-${requestId}.json`);
      await fs.writeFile(dataPath, JSON.stringify(agentData));
      
      // Execute the orchestration service to register the agent
      const process = spawn('python3', [
        ORCHESTRATION_SERVICE_PATH,
        '--register-agent',
        dataPath
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', async (code) => {
        // Clean up data file
        try {
          await fs.unlink(dataPath);
        } catch (e) {
          console.error(`Error deleting data file: ${e.message}`);
        }
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            
            // Broadcast event
            broadcastFn(eventTypes.AGENT_REGISTERED, {
              agent_id: agentData.agent_id,
              agent_type: agentData.agent_type,
              timestamp: new Date().toISOString()
            }, 'orchestration');
            
            res.status(200).json(result);
          } catch (e) {
            res.status(500).json({
              status: 'error',
              message: 'Error parsing agent registration result',
              error: e.message
            });
          }
        } else {
          res.status(500).json({
            status: 'error',
            message: 'Error registering agent',
            error: stderr
          });
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error registering agent',
        error: error.message
      });
    }
  });
  
  // Create task endpoint
  router.post('/tasks', async (req, res) => {
    try {
      const taskData = req.body;
      
      // Write task data to temp file
      const requestId = uuidv4();
      const dataPath = path.join(TEMP_DIR, `task-${requestId}.json`);
      await fs.writeFile(dataPath, JSON.stringify(taskData));
      
      // Execute the orchestration service to create the task
      const process = spawn('python3', [
        ORCHESTRATION_SERVICE_PATH,
        '--create-task',
        dataPath
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', async (code) => {
        // Clean up data file
        try {
          await fs.unlink(dataPath);
        } catch (e) {
          console.error(`Error deleting data file: ${e.message}`);
        }
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            
            // Broadcast event
            broadcastFn(eventTypes.TASK_CREATED, {
              task_id: result.task_id,
              agent_id: taskData.agent_id,
              timestamp: new Date().toISOString()
            }, 'orchestration');
            
            res.status(200).json(result);
          } catch (e) {
            res.status(500).json({
              status: 'error',
              message: 'Error parsing task creation result',
              error: e.message
            });
          }
        } else {
          res.status(500).json({
            status: 'error',
            message: 'Error creating task',
            error: stderr
          });
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error creating task',
        error: error.message
      });
    }
  });
  
  // Execute task endpoint
  router.post('/tasks/:taskId/execute', async (req, res) => {
    try {
      const { taskId } = req.params;
      
      // Execute the orchestration service to execute the task
      const process = spawn('python3', [
        ORCHESTRATION_SERVICE_PATH,
        '--execute-task',
        taskId
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            
            // Broadcast event
            broadcastFn(eventTypes.TASK_EXECUTED, {
              task_id: taskId,
              success: result.success,
              timestamp: new Date().toISOString()
            }, 'orchestration');
            
            res.status(200).json(result);
          } catch (e) {
            res.status(500).json({
              status: 'error',
              message: 'Error parsing task execution result',
              error: e.message
            });
          }
        } else {
          res.status(500).json({
            status: 'error',
            message: 'Error executing task',
            error: stderr
          });
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error executing task',
        error: error.message
      });
    }
  });
  
  // Create workflow endpoint
  router.post('/workflows', async (req, res) => {
    try {
      const { tasks, options } = req.body;
      
      // Write workflow data to temp file
      const requestId = uuidv4();
      const dataPath = path.join(TEMP_DIR, `workflow-${requestId}.json`);
      await fs.writeFile(dataPath, JSON.stringify({
        tasks,
        options
      }));
      
      // Execute the orchestration service to create the workflow
      const process = spawn('python3', [
        ORCHESTRATION_SERVICE_PATH,
        '--create-workflow',
        dataPath
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', async (code) => {
        // Clean up data file
        try {
          await fs.unlink(dataPath);
        } catch (e) {
          console.error(`Error deleting data file: ${e.message}`);
        }
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            
            // Broadcast event
            broadcastFn(eventTypes.WORKFLOW_CREATED, {
              workflow_id: result.workflow_id,
              task_count: tasks.length,
              timestamp: new Date().toISOString()
            }, 'orchestration');
            
            res.status(200).json(result);
          } catch (e) {
            res.status(500).json({
              status: 'error',
              message: 'Error parsing workflow creation result',
              error: e.message
            });
          }
        } else {
          res.status(500).json({
            status: 'error',
            message: 'Error creating workflow',
            error: stderr
          });
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error creating workflow',
        error: error.message
      });
    }
  });
  
  // Execute workflow endpoint
  router.post('/workflows/:workflowId/execute', async (req, res) => {
    try {
      const { workflowId } = req.params;
      
      // Execute the orchestration service to execute the workflow
      const process = spawn('python3', [
        ORCHESTRATION_SERVICE_PATH,
        '--execute-workflow',
        workflowId
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            
            // Broadcast event
            broadcastFn(eventTypes.WORKFLOW_EXECUTED, {
              workflow_id: workflowId,
              success: result.success,
              timestamp: new Date().toISOString()
            }, 'orchestration');
            
            res.status(200).json(result);
          } catch (e) {
            res.status(500).json({
              status: 'error',
              message: 'Error parsing workflow execution result',
              error: e.message
            });
          }
        } else {
          res.status(500).json({
            status: 'error',
            message: 'Error executing workflow',
            error: stderr
          });
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error executing workflow',
        error: error.message
      });
    }
  });
  
  // Setup agent workflow endpoint
  router.post('/workflows/setup', async (req, res) => {
    try {
      const workflowConfig = req.body;
      
      // Write workflow config to temp file
      const requestId = uuidv4();
      const dataPath = path.join(TEMP_DIR, `workflow-config-${requestId}.json`);
      await fs.writeFile(dataPath, JSON.stringify(workflowConfig));
      
      // Execute the orchestration service to setup the workflow
      const process = spawn('python3', [
        ORCHESTRATION_SERVICE_PATH,
        '--setup-workflow',
        dataPath
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', async (code) => {
        // Clean up data file
        try {
          await fs.unlink(dataPath);
        } catch (e) {
          console.error(`Error deleting data file: ${e.message}`);
        }
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            
            // Broadcast event
            broadcastFn(eventTypes.WORKFLOW_SETUP, {
              workflow_id: result.workflow_id,
              timestamp: new Date().toISOString()
            }, 'orchestration');
            
            res.status(200).json(result);
          } catch (e) {
            res.status(500).json({
              status: 'error',
              message: 'Error parsing workflow setup result',
              error: e.message
            });
          }
        } else {
          res.status(500).json({
            status: 'error',
            message: 'Error setting up workflow',
            error: stderr
          });
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error setting up workflow',
        error: error.message
      });
    }
  });
  
  // Send direct message to agent endpoint
  router.post('/agents/:agentId/message', async (req, res) => {
    try {
      const { agentId } = req.params;
      const { message, options } = req.body;
      
      // Write message data to temp file
      const requestId = uuidv4();
      const dataPath = path.join(TEMP_DIR, `agent-message-${requestId}.json`);
      await fs.writeFile(dataPath, JSON.stringify({
        agent_id: agentId,
        message,
        options
      }));
      
      // Execute the orchestration service to send the message
      const process = spawn('python3', [
        ORCHESTRATION_SERVICE_PATH,
        '--agent-message',
        dataPath
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', async (code) => {
        // Clean up data file
        try {
          await fs.unlink(dataPath);
        } catch (e) {
          console.error(`Error deleting data file: ${e.message}`);
        }
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            
            // Broadcast event
            broadcastFn(eventTypes.AGENT_MESSAGE, {
              agent_id: agentId,
              timestamp: new Date().toISOString()
            }, 'orchestration');
            
            res.status(200).json(result);
          } catch (e) {
            res.status(500).json({
              status: 'error',
              message: 'Error parsing agent message result',
              error: e.message
            });
          }
        } else {
          res.status(500).json({
            status: 'error',
            message: 'Error sending message to agent',
            error: stderr
          });
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error sending message to agent',
        error: error.message
      });
    }
  });
  
  // Create multi-agent conversation endpoint
  router.post('/conversations/multi-agent', async (req, res) => {
    try {
      const { conversation_id, agents, options } = req.body;
      
      // Write conversation data to temp file
      const requestId = uuidv4();
      const dataPath = path.join(TEMP_DIR, `multi-agent-conversation-${requestId}.json`);
      await fs.writeFile(dataPath, JSON.stringify({
        conversation_id,
        agents,
        options
      }));
      
      // Execute the orchestration service to create the conversation
      const process = spawn('python3', [
        ORCHESTRATION_SERVICE_PATH,
        '--create-multi-agent-conversation',
        dataPath
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', async (code) => {
        // Clean up data file
        try {
          await fs.unlink(dataPath);
        } catch (e) {
          console.error(`Error deleting data file: ${e.message}`);
        }
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            
            // Broadcast event
            broadcastFn(eventTypes.MULTI_AGENT_CONVERSATION_CREATED, {
              conversation_id: result.conversation_id,
              agent_count: agents.length,
              timestamp: new Date().toISOString()
            }, 'orchestration');
            
            res.status(200).json(result);
          } catch (e) {
            res.status(500).json({
              status: 'error',
              message: 'Error parsing multi-agent conversation result',
              error: e.message
            });
          }
        } else {
          res.status(500).json({
            status: 'error',
            message: 'Error creating multi-agent conversation',
            error: stderr
          });
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error creating multi-agent conversation',
        error: error.message
      });
    }
  });
  
  return router;
};

module.exports = {
  configureRoutes
};