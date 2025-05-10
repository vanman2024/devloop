/**
 * API endpoints for milestone management
 * This file provides Express.js routes for milestone creation and manipulation
 */

const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

// Root path for the project
const PROJECT_ROOT = path.resolve('/mnt/c/Users/angel/Devloop');

/**
 * Create a new milestone using the create_milestone.py script
 */
router.post('/create', async (req, res) => {
  try {
    const {
      id,
      name,
      description,
      phases,
      dependencies,
      useAiStructure,
      useAiDescription,
      dryRun,
      template,
      force,
      skipRegistry,
      skipDashboard,
      skipRoadmap,
      cloneFrom,
    } = req.body;
    
    // Validate required fields
    if (!id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Milestone ID and name are required'
      });
    }
    
    // Prepare arguments for the Python script
    const scriptPath = path.join(PROJECT_ROOT, 'create_milestone.py');
    
    // Create a Python process using the MilestoneCreator class
    const pythonArgs = [
      '-c',
      `
import sys
sys.path.append('${PROJECT_ROOT}')
from create_milestone import MilestoneCreator
import json

# Prepare options from JSON input
options = json.loads("""${JSON.stringify({
        id,
        name,
        description,
        phases: parseInt(phases || 4, 10),
        dependencies: dependencies || {},
        use_ai_structure: useAiStructure !== false,
        use_ai_description: useAiDescription !== false,
        dry_run: dryRun === true,
        template,
        force: force === true,
        no_registry: skipRegistry === true,
        no_dashboard: skipDashboard === true,
        skip_roadmap: skipRoadmap === true,
        clone_from: cloneFrom,
      })}""")

# Call the MilestoneCreator API
result = MilestoneCreator.create_milestone(options)

# Return JSON result
print(json.dumps(result))
      `
    ];
    
    console.log(`Executing Python script: ${scriptPath}`);
    
    const pythonProcess = spawn('python3', pythonArgs);
    
    let stdout = '';
    let stderr = '';
    
    // Collect stdout data
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    // Collect stderr data
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        console.error(`Error: ${stderr}`);
        return res.status(500).json({
          success: false,
          message: 'Failed to create milestone',
          error: stderr
        });
      }
      
      try {
        // Parse the JSON output from the Python script
        const result = JSON.parse(stdout);
        return res.status(200).json(result);
      } catch (error) {
        console.error(`Error parsing Python output: ${error.message}`);
        return res.status(500).json({
          success: false,
          message: 'Failed to parse milestone creation result',
          error: error.message,
          stdout
        });
      }
    });
  } catch (error) {
    console.error(`Error in milestone creation API: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Update feature status
 */
router.post('/feature-status', async (req, res) => {
  try {
    const { milestoneId, featureId, status, reason } = req.body;
    
    // Validate required fields
    if (!milestoneId || !featureId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Milestone ID, feature ID, and status are required'
      });
    }
    
    // Create a Python process to update feature status
    const pythonArgs = [
      '-c',
      `
import sys
sys.path.append('${PROJECT_ROOT}')
from create_milestone import MilestoneCreator
import json

# Call the update_feature_status method
result = MilestoneCreator.update_feature_status(
    milestone_id="${milestoneId}",
    feature_id="${featureId}",
    new_status="${status}",
    reason=${reason ? `"${reason}"` : 'None'}
)

# Return JSON result
print(json.dumps(result))
      `
    ];
    
    const pythonProcess = spawn('python3', pythonArgs);
    
    let stdout = '';
    let stderr = '';
    
    // Collect stdout data
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    // Collect stderr data
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        console.error(`Error: ${stderr}`);
        return res.status(500).json({
          success: false,
          message: 'Failed to update feature status',
          error: stderr
        });
      }
      
      try {
        // Parse the JSON output from the Python script
        const result = JSON.parse(stdout);
        return res.status(200).json(result);
      } catch (error) {
        console.error(`Error parsing Python output: ${error.message}`);
        return res.status(500).json({
          success: false,
          message: 'Failed to parse feature status update result',
          error: error.message,
          stdout
        });
      }
    });
  } catch (error) {
    console.error(`Error in feature status update API: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;