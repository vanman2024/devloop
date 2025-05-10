/**
 * Drift Detection API Endpoints
 * 
 * This file defines the Express API endpoints for drift detection functionality.
 * It should be integrated with the main Express app by requiring it in server.js.
 */

const path = require('path');
const { spawn } = require('child_process');
const express = require('express');

// Create a router
const router = express.Router();

// Helper to find the project root
const getProjectRoot = () => {
  const currentFile = __filename;
  let currentDir = path.dirname(currentFile);
  
  while (path.dirname(currentDir) !== currentDir) {
    if (fs.existsSync(path.join(currentDir, 'system-core')) && 
        fs.existsSync(path.join(currentDir, 'milestones'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  // Default fallback path
  return '/mnt/c/Users/angel/Devloop';
};

const PROJECT_ROOT = getProjectRoot();

// Path to drift detector scripts
const DRIFT_DETECTOR_PATH = path.join(
  PROJECT_ROOT,
  'milestones',
  'milestone-integrated-testing',
  'phase-04',
  'module-test-scenarios',
  'feature-1305-dev-drift-detection',
  'output',
  'dev_drift_detector.py'
);

// Path to drift data
const DRIFT_DATA_PATH = path.join(
  PROJECT_ROOT,
  'system-core',
  'project-tracker',
  'active',
  'data',
  'drift_detection_status.json'
);

// Path to baselines directory
const BASELINES_DIR = path.join(
  PROJECT_ROOT,
  'system-core',
  'logs',
  'health-checks',
  'baselines'
);

// GET /api/health/drift-status - Get current drift status
router.get('/drift-status', (req, res) => {
  try {
    // Check if drift data file exists
    if (!fs.existsSync(DRIFT_DATA_PATH)) {
      return res.status(404).json({
        success: false,
        message: 'No drift detection data found'
      });
    }
    
    // Read the drift data file
    const driftData = JSON.parse(fs.readFileSync(DRIFT_DATA_PATH, 'utf8'));
    
    res.json({
      success: true,
      data: driftData
    });
  } catch (error) {
    console.error('Error retrieving drift status:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving drift status',
      error: error.message
    });
  }
});

// POST /api/health/run-drift-check - Run drift detection check
router.post('/run-drift-check', (req, res) => {
  const baseline = req.body?.baseline || 'latest';
  
  // Spawn process to run drift detection
  const process = spawn('python3', [
    DRIFT_DETECTOR_PATH,
    'detect',
    '--baseline', baseline,
    '--report', 'html'
  ]);
  
  let stdoutData = '';
  let stderrData = '';
  
  process.stdout.on('data', (data) => {
    stdoutData += data.toString();
  });
  
  process.stderr.on('data', (data) => {
    stderrData += data.toString();
  });
  
  process.on('close', (code) => {
    if (code === 0 || code === 1) { // 1 is expected when drift is detected
      // Update UI by finding the latest report
      const UI_INTEGRATION_PATH = path.join(
        path.dirname(DRIFT_DETECTOR_PATH),
        'ui_integration.py'
      );
      
      const uiProcess = spawn('python3', [UI_INTEGRATION_PATH]);
      
      uiProcess.on('close', (uiCode) => {
        res.json({
          success: true,
          message: 'Drift check completed and dashboard updated',
          stdout: stdoutData,
          code: code
        });
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error running drift check',
        stdout: stdoutData,
        stderr: stderrData,
        code: code
      });
    }
  });
});

// POST /api/health/create-baseline - Create a new baseline
router.post('/create-baseline', (req, res) => {
  const { name, type } = req.body;
  
  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Baseline name is required'
    });
  }
  
  // Spawn process to create baseline
  const process = spawn('python3', [
    DRIFT_DETECTOR_PATH,
    'baseline',
    '--name', name,
    '--type', type || 'all'
  ]);
  
  let stdoutData = '';
  let stderrData = '';
  
  process.stdout.on('data', (data) => {
    stdoutData += data.toString();
  });
  
  process.stderr.on('data', (data) => {
    stderrData += data.toString();
  });
  
  process.on('close', (code) => {
    if (code === 0) {
      res.json({
        success: true,
        message: `Baseline "${name}" created successfully`,
        stdout: stdoutData
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error creating baseline',
        stdout: stdoutData,
        stderr: stderrData,
        code: code
      });
    }
  });
});

// GET /api/health/baselines - Get list of available baselines
router.get('/baselines', (req, res) => {
  try {
    if (!fs.existsSync(BASELINES_DIR)) {
      return res.json({
        success: true,
        baselines: []
      });
    }
    
    // Read baselines directory
    const files = fs.readdirSync(BASELINES_DIR);
    const baselines = [];
    
    // Process each baseline file
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const baselinePath = path.join(BASELINES_DIR, file);
          const baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
          
          baselines.push({
            name: baselineData.baseline_name,
            created: baselineData.created_at,
            updated: baselineData.updated_at,
            type: Object.keys(baselineData).filter(key => 
              ['configs', 'structure', 'scripts', 'templates'].includes(key) && 
              Object.keys(baselineData[key]).length > 0
            ).join(',') || 'all'
          });
        } catch (err) {
          console.error(`Error processing baseline file ${file}:`, err);
        }
      }
    }
    
    res.json({
      success: true,
      baselines: baselines
    });
  } catch (error) {
    console.error('Error retrieving baselines:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving baselines',
      error: error.message
    });
  }
});

// Export the router
module.exports = function(app) {
  app.use('/api/health', router);
};