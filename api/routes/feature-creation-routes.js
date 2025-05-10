/**
 * Feature Creation Routes
 * 
 * This module provides API routes for the Feature Creation Agent.
 * It allows for analyzing feature descriptions and suggesting
 * optimal placement within project structure.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Constants
const PROJECT_ROOT = '/mnt/c/Users/angel/Devloop';
const AGENT_DIR = path.join(PROJECT_ROOT, 'agents', 'planning', 'feature_creation');
const AGENT_SCRIPT = path.join(AGENT_DIR, 'core.py');

// Configure routes with broadcast capability
const configureRoutes = (broadcastFn, eventTypes) => {
  // Process a feature creation request
  router.post('/process', async (req, res) => {
    try {
      const featureData = req.body;
      
      // Validate required fields
      if (!featureData.name) {
        return res.status(400).json({
          success: false,
          error: 'Feature name is required'
        });
      }
      
      // Create a unique request ID
      const requestId = uuidv4();
      
      // Prepare params file
      const paramsPath = path.join(AGENT_DIR, `params-${requestId}.json`);
      await fs.writeFile(paramsPath, JSON.stringify(featureData, null, 2));
      
      // Execute the feature creation agent
      const process = spawn('python3', [
        AGENT_SCRIPT,
        '--operation', 'process_feature',
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
      
      process.on('close', async (code) => {
        // Clean up params file
        try {
          await fs.unlink(paramsPath);
        } catch (e) {
          console.error(`Error deleting params file: ${e.message}`);
        }
        
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
        
        // Broadcast feature processing event
        broadcastFn(eventTypes.FEATURE_PROCESSED, {
          feature_id: result.feature?.id || 'unknown',
          request_id: requestId,
          success: result.success,
          timestamp: new Date().toISOString()
        }, 'feature-creation');
        
        res.status(code === 0 ? 200 : 500).json(result);
      });
    } catch (error) {
      console.error('Error processing feature request:', error);
      res.status(500).json({
        success: false,
        error: `Error processing feature request: ${error.message}`
      });
    }
  });
  
  // Analyze feature description only (no complete processing)
  router.post('/analyze', async (req, res) => {
    try {
      const { name, description } = req.body;
      
      // Validate required fields
      if (!name || !description) {
        return res.status(400).json({
          success: false,
          error: 'Feature name and description are required'
        });
      }
      
      // Create a unique request ID
      const requestId = uuidv4();
      
      // Prepare params file
      const paramsPath = path.join(AGENT_DIR, `params-${requestId}.json`);
      await fs.writeFile(paramsPath, JSON.stringify({
        name,
        description
      }, null, 2));
      
      // Execute the feature analyzer only
      const process = spawn('python3', [
        AGENT_SCRIPT,
        '--operation', 'analyze_feature',
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
      
      process.on('close', async (code) => {
        // Clean up params file
        try {
          await fs.unlink(paramsPath);
        } catch (e) {
          console.error(`Error deleting params file: ${e.message}`);
        }
        
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
      console.error('Error analyzing feature:', error);
      res.status(500).json({
        success: false,
        error: `Error analyzing feature: ${error.message}`
      });
    }
  });
  
  // Get feature placement suggestions
  router.post('/suggest-placement', async (req, res) => {
    try {
      const { 
        analysis_result,
        knowledge_result,
        structure_result,
        user_milestone,
        user_phase,
        user_module
      } = req.body;
      
      // Validate required fields
      if (!analysis_result) {
        return res.status(400).json({
          success: false,
          error: 'Analysis result is required'
        });
      }
      
      // Create a unique request ID
      const requestId = uuidv4();
      
      // Prepare params file
      const paramsPath = path.join(AGENT_DIR, `params-${requestId}.json`);
      await fs.writeFile(paramsPath, JSON.stringify({
        analysis_result,
        knowledge_result: knowledge_result || {},
        structure_result: structure_result || {},
        user_milestone,
        user_phase,
        user_module
      }, null, 2));
      
      // Execute the placement suggester
      const process = spawn('python3', [
        AGENT_SCRIPT,
        '--operation', 'suggest_placement',
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
      
      process.on('close', async (code) => {
        // Clean up params file
        try {
          await fs.unlink(paramsPath);
        } catch (e) {
          console.error(`Error deleting params file: ${e.message}`);
        }
        
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
      console.error('Error suggesting placement:', error);
      res.status(500).json({
        success: false,
        error: `Error suggesting placement: ${error.message}`
      });
    }
  });
  
  // Generate a feature ID
  router.post('/generate-id', async (req, res) => {
    try {
      const { feature_name, milestone, project_id } = req.body;
      
      // Validate required fields
      if (!feature_name) {
        return res.status(400).json({
          success: false,
          error: 'Feature name is required'
        });
      }
      
      // Create a unique request ID
      const requestId = uuidv4();
      
      // Prepare params file
      const paramsPath = path.join(AGENT_DIR, `params-${requestId}.json`);
      await fs.writeFile(paramsPath, JSON.stringify({
        feature_name,
        milestone,
        project_id
      }, null, 2));
      
      // Execute the ID generator
      const process = spawn('python3', [
        AGENT_SCRIPT,
        '--operation', 'generate_id',
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
      
      process.on('close', async (code) => {
        // Clean up params file
        try {
          await fs.unlink(paramsPath);
        } catch (e) {
          console.error(`Error deleting params file: ${e.message}`);
        }
        
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
      console.error('Error generating ID:', error);
      res.status(500).json({
        success: false,
        error: `Error generating ID: ${error.message}`
      });
    }
  });
  
  // Get agent status
  router.get('/status', async (req, res) => {
    try {
      // Execute the status command
      const process = spawn('python3', [AGENT_SCRIPT, '--status']);
      
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
      console.error('Error getting agent status:', error);
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