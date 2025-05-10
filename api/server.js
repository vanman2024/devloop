/**
 * Devloop Unified Express Server
 * 
 * This is the single consolidated Express server that handles all 
 * backend API requests for the Devloop system. It integrates:
 * 
 * 1. Activity Center functionality
 * 2. Document Management
 * 3. Milestone Management
 * 4. Agent System Integration
 * 5. Health Monitoring
 * 6. Testing Endpoints
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

// Constants
const PROJECT_ROOT = '/mnt/c/Users/angel/Devloop';
const LOG_DIR = path.join(PROJECT_ROOT, 'logs');
const API_VERSION = 'v1';

// Create the Express application
const app = express();

// Setup middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Setup logging
const serverLogDir = path.join(LOG_DIR, 'server');
// Ensure log directory exists
if (!fs.existsSync(serverLogDir)) {
  fs.mkdirSync(serverLogDir, { recursive: true });
}

// Create a write stream for access logs
const accessLogStream = fs.createWriteStream(
  path.join(serverLogDir, 'access.log'),
  { flags: 'a' }
);

// Setup request logging
app.use(morgan('combined', { stream: accessLogStream }));

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

/**
 * Event types for WebSocket notifications
 */
const EventTypes = {
  // Activity events
  ACTIVITY_CREATED: 'activity_created',
  ACTIVITY_UPDATED: 'activity_updated',
  ACTIVITY_REVIEW_CHANGED: 'activity_review_changed',
  REVIEW_QUEUE_UPDATED: 'review_queue_updated',
  METRICS_UPDATED: 'metrics_updated',

  // Agent events
  AGENT_SPAWNED: 'agent_spawned',
  AGENT_RETIRED: 'agent_retired',
  AGENT_STATUS_CHANGED: 'agent_status_changed',
  AGENT_RESULT: 'agent_result',

  // Feature events
  FEATURE_PROCESSED: 'feature_processed',
  FEATURE_CREATED: 'feature_created',
  FEATURE_UPDATED: 'feature_updated',

  // System events
  SYSTEM_STATUS: 'system_status',
  ERROR_OCCURRED: 'error_occurred',

  // Connection events
  CONNECTION_ESTABLISHED: 'connection_established',
  SUBSCRIPTION_CONFIRMED: 'subscription_confirmed',

  // Orchestration events
  CONVERSATION_INITIALIZED: 'conversation_initialized',
  MESSAGE_PROCESSED: 'message_processed',
  AGENT_REGISTERED: 'agent_registered',
  TASK_CREATED: 'task_created',
  TASK_EXECUTED: 'task_executed',
  WORKFLOW_CREATED: 'workflow_created',
  WORKFLOW_EXECUTED: 'workflow_executed',
  WORKFLOW_SETUP: 'workflow_setup',
  AGENT_MESSAGE: 'agent_message',
  MULTI_AGENT_CONVERSATION_CREATED: 'multi_agent_conversation_created',
  DEPENDENCY_ANALYZED: 'dependency_analyzed',
  TASK_DEPENDENCIES_ANALYZED: 'task_dependencies_analyzed'
};

/**
 * WebSocket connection handler
 */
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: EventTypes.CONNECTION_ESTABLISHED,
    message: 'Connected to Devloop WebSocket server',
    timestamp: new Date().toISOString()
  }));
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle subscription requests
      if (data.type === 'subscribe') {
        handleSubscription(ws, data);
      }
      
      // Handle ping messages
      if (data.type === 'ping') {
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

/**
 * Handle subscription requests from WebSocket clients
 */
function handleSubscription(ws, data) {
  // Validate subscription data
  if (!data.channels || !Array.isArray(data.channels)) {
    ws.send(JSON.stringify({
      type: 'subscription_error',
      message: 'Invalid subscription format',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Store subscription info on the websocket object
  ws.subscriptions = data.channels;
  
  // Confirm subscription
  ws.send(JSON.stringify({
    type: EventTypes.SUBSCRIPTION_CONFIRMED,
    channels: ws.subscriptions,
    timestamp: new Date().toISOString()
  }));
}

/**
 * Broadcast an event to all connected WebSocket clients
 * that are subscribed to the relevant channel
 */
function broadcastEvent(eventType, data, channel = 'all') {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && 
        (!client.subscriptions || 
         client.subscriptions.includes(channel) || 
         client.subscriptions.includes('all'))) {
      
      client.send(JSON.stringify({
        type: eventType,
        data: data,
        channel: channel,
        timestamp: new Date().toISOString()
      }));
    }
  });
}

// Utility for reading files
function getFileContents(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    return null;
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`);
    return null;
  }
}

// Utility for running a Python script
async function runPythonScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const process = spawn('python3', [scriptPath, ...args]);
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

// ==========================================
// IMPORT ROUTE MODULES
// ==========================================

// Import route modules
const agentRoutes = require('./routes/agent-routes');
const projectStructureRoutes = require('./routes/project-structure-routes');
const featureCreationRoutes = require('./routes/feature-creation-routes');
const orchestrationRoutes = require('./routes/orchestration-routes');
const knowledgeGraphRoutes = require('./routes/knowledge-graph-routes');
// Additional route modules to be added as we build them
// const activityRoutes = require('./routes/activity-routes');
// const documentRoutes = require('./routes/document-routes');
// const milestoneRoutes = require('./routes/milestone-routes');

// ==========================================
//  HEALTH API ROUTES
// ==========================================

app.get(`/api/${API_VERSION}/health`, (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'unified-server',
    version: process.env.SERVER_VERSION || '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ==========================================
//  ACTIVITY API ROUTES
// ==========================================

// Will be configured with: app.use(`/api/${API_VERSION}/activities`, activityRoutes.configureRoutes(broadcastEvent, EventTypes));

// ==========================================
//  DOCUMENTS API ROUTES
// ==========================================

// Will be configured with: app.use(`/api/${API_VERSION}/documents`, documentRoutes);

// ==========================================
//  MILESTONE API ROUTES
// ==========================================

// Will be configured with: app.use(`/api/${API_VERSION}/milestones`, milestoneRoutes);

// ==========================================
//  AGENTS API ROUTES
// ==========================================

// Configure agent routes with broadcast functionality
app.use(`/api/${API_VERSION}/agents`, agentRoutes.configureRoutes(broadcastEvent, EventTypes));

// ==========================================
//  PROJECT STRUCTURE API ROUTES
// ==========================================

app.use(`/api/${API_VERSION}/project-structure`, projectStructureRoutes);

// ==========================================
//  FEATURE CREATION API ROUTES
// ==========================================

// Configure feature creation routes with broadcast functionality
app.use(`/api/${API_VERSION}/feature-creation`, featureCreationRoutes.configureRoutes(broadcastEvent, EventTypes));

// ==========================================
//  ORCHESTRATION API ROUTES
// ==========================================

// Configure orchestration routes with broadcast functionality
app.use(`/api/orchestration`, orchestrationRoutes.configureRoutes(broadcastEvent, EventTypes));

// ==========================================
//  KNOWLEDGE GRAPH API ROUTES
// ==========================================

// Configure knowledge graph routes
app.use(`/api/graph`, knowledgeGraphRoutes);

// ==========================================
//  TESTING API ROUTES
// ==========================================

// Will be configured with: app.use(`/api/${API_VERSION}/test`, testRoutes);

// ==========================================
// SERVER SETUP AND EXPORT
// ==========================================

// Export server objects for testing and scripting
module.exports = {
  app,
  server,
  wss,
  broadcastEvent,
  EventTypes,
  startServer: (port = 8080) => {
    return new Promise((resolve, reject) => {
      try {
        server.listen(port, () => {
          console.log(`Devloop Unified Server running on port ${port}`);
          resolve({ port });
        });
      } catch (error) {
        console.error(`Error starting server: ${error.message}`);
        reject(error);
      }
    })
  },
  stopServer: () => {
    return new Promise((resolve, reject) => {
      try {
        wss.close(() => {
          server.close(() => {
            console.log('Devloop Unified Server stopped');
            resolve();
          });
        });
      } catch (error) {
        console.error(`Error stopping server: ${error.message}`);
        reject(error);
      }
    });
  }
};

// Start the server if this file is executed directly
if (require.main === module) {
  const port = process.env.SERVER_PORT || 8080;
  module.exports.startServer(port)
    .then(({ port }) => {
      console.log(`Devloop Unified Server running at http://localhost:${port}`);
      console.log(`WebSocket server available at ws://localhost:${port}`);
    })
    .catch((error) => {
      console.error(`Failed to start server: ${error.message}`);
    });
}