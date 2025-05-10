/**
 * Agent API Routes
 * 
 * This module provides the API routes for interfacing with the agent system.
 * It allows for agent lifecycle management and command execution.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

// Create router
const router = express.Router();

// Constants
const PROJECT_ROOT = '/mnt/c/Users/angel/Devloop';
const AGENTS_DIR = path.join(PROJECT_ROOT, 'agents');

// Configure routes with broadcast capability
const configureRoutes = (broadcastFn, eventTypes) => {
  // Get all available agents
  router.get('/', (req, res) => {
    try {
      const agents = [];
      
      // Read the agents directory
      const agentDirs = fs.readdirSync(AGENTS_DIR).filter(dir => {
        const stat = fs.statSync(path.join(AGENTS_DIR, dir));
        return stat.isDirectory();
      });
      
      // Get metadata for each agent
      agentDirs.forEach(agentDir => {
        const metaPath = path.join(AGENTS_DIR, agentDir, 'agent-meta.json');
        
        if (fs.existsSync(metaPath)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            agents.push({
              id: agentDir,
              ...metadata
            });
          } catch (error) {
            console.error(`Error reading metadata for agent ${agentDir}: ${error.message}`);
          }
        }
      });
      
      res.json({
        success: true,
        agents
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Error listing agents: ${error.message}`
      });
    }
  });
  
  // Get specific agent details
  router.get('/:agentId', (req, res) => {
    try {
      const agentId = req.params.agentId;
      const agentDir = path.join(AGENTS_DIR, agentId);
      
      // Check if agent exists
      if (!fs.existsSync(agentDir)) {
        return res.status(404).json({
          success: false,
          error: `Agent ${agentId} not found`
        });
      }
      
      // Get agent metadata
      const metaPath = path.join(agentDir, 'agent-meta.json');
      
      if (fs.existsSync(metaPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          
          // Check if agent has a status file
          const statusPath = path.join(agentDir, 'status.json');
          let status = null;
          
          if (fs.existsSync(statusPath)) {
            try {
              status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
            } catch (error) {
              console.error(`Error reading status for agent ${agentId}: ${error.message}`);
            }
          }
          
          res.json({
            success: true,
            agent: {
              id: agentId,
              ...metadata,
              status
            }
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: `Error reading metadata for agent ${agentId}: ${error.message}`
          });
        }
      } else {
        res.status(404).json({
          success: false,
          error: `Metadata not found for agent ${agentId}`
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Error getting agent details: ${error.message}`
      });
    }
  });
  
  // Spawn an agent
  router.post('/:agentId/spawn', async (req, res) => {
    try {
      const agentId = req.params.agentId;
      const context = req.body.context || {};
      
      // Check if the agent exists
      const agentDir = path.join(AGENTS_DIR, agentId);
      
      if (!fs.existsSync(agentDir)) {
        return res.status(404).json({
          success: false,
          error: `Agent ${agentId} not found`
        });
      }
      
      // Determine the agent script path
      let agentScriptPath = path.join(agentDir, 'agent.py');
      
      // If agent.py doesn't exist, try core.py
      if (!fs.existsSync(agentScriptPath)) {
        agentScriptPath = path.join(agentDir, 'core.py');
        
        // If core.py doesn't exist either, return error
        if (!fs.existsSync(agentScriptPath)) {
          return res.status(404).json({
            success: false,
            error: `Agent script not found for ${agentId}`
          });
        }
      }
      
      // Make sure the script is executable
      await execPromise(`chmod +x ${agentScriptPath}`);
      
      // Prepare context file
      const contextPath = path.join(agentDir, 'context.json');
      fs.writeFileSync(contextPath, JSON.stringify(context, null, 2));
      
      // Execute the spawn command
      const process = spawn('python3', [agentScriptPath, '--spawn', `--context=${contextPath}`]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        // Parse the output if possible
        let result;
        
        try {
          result = JSON.parse(stdout);
        } catch (error) {
          result = {
            success: code === 0,
            output: stdout,
            error: stderr
          };
        }
        
        // Broadcast agent spawned event if successful
        if (result.success) {
          broadcastFn(eventTypes.AGENT_SPAWNED, {
            agent_id: agentId,
            timestamp: new Date().toISOString()
          }, 'agents');
        }
        
        res.status(code === 0 ? 200 : 500).json(result);
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Error spawning agent: ${error.message}`
      });
    }
  });
  
  // Execute an agent operation
  router.post('/:agentId/execute', async (req, res) => {
    try {
      const agentId = req.params.agentId;
      const operation = req.body.operation;
      const params = req.body.params || {};
      
      // Validate required fields
      if (!operation) {
        return res.status(400).json({
          success: false,
          error: 'Operation is required'
        });
      }
      
      // Check if the agent exists
      const agentDir = path.join(AGENTS_DIR, agentId);
      
      if (!fs.existsSync(agentDir)) {
        return res.status(404).json({
          success: false,
          error: `Agent ${agentId} not found`
        });
      }
      
      // Determine the agent script path
      let agentScriptPath = path.join(agentDir, 'agent.py');
      
      // If agent.py doesn't exist, try core.py
      if (!fs.existsSync(agentScriptPath)) {
        agentScriptPath = path.join(agentDir, 'core.py');
        
        // If core.py doesn't exist either, return error
        if (!fs.existsSync(agentScriptPath)) {
          return res.status(404).json({
            success: false,
            error: `Agent script not found for ${agentId}`
          });
        }
      }
      
      // Make sure the script is executable
      await execPromise(`chmod +x ${agentScriptPath}`);
      
      // Prepare params file
      const paramsPath = path.join(agentDir, 'params.json');
      fs.writeFileSync(paramsPath, JSON.stringify(params, null, 2));
      
      // Execute the operation
      const process = spawn('python3', [
        agentScriptPath, 
        '--operation', operation,
        `--params=${paramsPath}`
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
        // Parse the output if possible
        let result;
        
        try {
          result = JSON.parse(stdout);
        } catch (error) {
          result = {
            success: code === 0,
            output: stdout,
            error: stderr
          };
        }
        
        // Broadcast agent result event
        broadcastFn(eventTypes.AGENT_RESULT, {
          agent_id: agentId,
          operation: operation,
          success: result.success,
          timestamp: new Date().toISOString()
        }, `agent:${agentId}`);
        
        res.status(code === 0 ? 200 : 500).json(result);
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Error executing agent operation: ${error.message}`
      });
    }
  });
  
  // Retire an agent
  router.post('/:agentId/retire', async (req, res) => {
    try {
      const agentId = req.params.agentId;
      const reason = req.body.reason || 'API request';
      
      // Check if the agent exists
      const agentDir = path.join(AGENTS_DIR, agentId);
      
      if (!fs.existsSync(agentDir)) {
        return res.status(404).json({
          success: false,
          error: `Agent ${agentId} not found`
        });
      }
      
      // Determine the agent script path
      let agentScriptPath = path.join(agentDir, 'agent.py');
      
      // If agent.py doesn't exist, try core.py
      if (!fs.existsSync(agentScriptPath)) {
        agentScriptPath = path.join(agentDir, 'core.py');
        
        // If core.py doesn't exist either, return error
        if (!fs.existsSync(agentScriptPath)) {
          return res.status(404).json({
            success: false,
            error: `Agent script not found for ${agentId}`
          });
        }
      }
      
      // Make sure the script is executable
      await execPromise(`chmod +x ${agentScriptPath}`);
      
      // Execute the retire command
      const process = spawn('python3', [
        agentScriptPath, 
        '--retire',
        `--reason=${reason}`
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
        // Parse the output if possible
        let result;
        
        try {
          result = JSON.parse(stdout);
        } catch (error) {
          result = {
            success: code === 0,
            output: stdout,
            error: stderr
          };
        }
        
        // Broadcast agent retired event if successful
        if (result.success) {
          broadcastFn(eventTypes.AGENT_RETIRED, {
            agent_id: agentId,
            reason: reason,
            timestamp: new Date().toISOString()
          }, 'agents');
        }
        
        res.status(code === 0 ? 200 : 500).json(result);
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Error retiring agent: ${error.message}`
      });
    }
  });
  
  // Get agent status
  router.get('/:agentId/status', async (req, res) => {
    try {
      const agentId = req.params.agentId;
      
      // Check if the agent exists
      const agentDir = path.join(AGENTS_DIR, agentId);
      
      if (!fs.existsSync(agentDir)) {
        return res.status(404).json({
          success: false,
          error: `Agent ${agentId} not found`
        });
      }
      
      // Determine the agent script path
      let agentScriptPath = path.join(agentDir, 'agent.py');
      
      // If agent.py doesn't exist, try core.py
      if (!fs.existsSync(agentScriptPath)) {
        agentScriptPath = path.join(agentDir, 'core.py');
        
        // If core.py doesn't exist either, return error
        if (!fs.existsSync(agentScriptPath)) {
          return res.status(404).json({
            success: false,
            error: `Agent script not found for ${agentId}`
          });
        }
      }
      
      // Make sure the script is executable
      await execPromise(`chmod +x ${agentScriptPath}`);
      
      // Execute the status command
      const process = spawn('python3', [agentScriptPath, '--status']);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        // Parse the output if possible
        let result;
        
        try {
          result = JSON.parse(stdout);
        } catch (error) {
          result = {
            success: code === 0,
            output: stdout,
            error: stderr
          };
        }
        
        res.status(code === 0 ? 200 : 500).json(result);
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Error getting agent status: ${error.message}`
      });
    }
  });
  
  return router;
};

module.exports = {
  configureRoutes
};