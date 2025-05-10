/**
 * Test script for SQLite database functionality
 * 
 * This script demonstrates the use of the DatabaseHelper module with SQLite
 * for storing and retrieving feature data, dependencies, technical decisions,
 * and session context values.
 * 
 * Usage:
 *   node scripts/test-sqlite-db.js
 */

// Use ES modules for Node.js environment
import {
  storeFeature,
  getFeature,
  getFeaturesByStatus,
  getFeaturesByModule,
  storeDependency,
  getDependenciesForFeature,
  getDependantsForFeature,
  storeDecision,
  getDecision,
  getDecisionsByCategory,
  saveContext,
  getContext,
  getCategoryContext,
  deleteContext,
  STORES
} from '../../src/utils/DatabaseHelper.js';

// Ensure data directory exists
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  console.log('Creating data directory...');
  fs.mkdirSync(dataDir, { recursive: true });
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

// Utility function for logging
function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

// Utility for dividers
function divider() {
  console.log('\n' + colors.yellow + '-'.repeat(80) + colors.reset + '\n');
}

// Main test function
async function runTests() {
  log('SQLite Database Test Script', colors.bright + colors.cyan);
  log('Testing DatabaseHelper with SQLite storage', colors.cyan);
  divider();

  try {
    // --------------------------------------------------
    // Test Feature Management
    // --------------------------------------------------
    log('1. Testing Feature Management', colors.bright + colors.green);
    
    // Store a workflow feature
    const workflowFeature = {
      id: 'feature-5001',
      name: 'Workflow Engine Core',
      type: 'feature',
      status: 'completed',
      module: 'WorkflowEngine',
      description: 'Core workflow execution engine with event-driven architecture',
      dependencies: ['Redis', 'MongoDB', 'EventEmitter'],
      implementation: 'Uses a multi-tier memory architecture with immediate (Redis), persistent (MongoDB), and graph (Neo4j) storage layers.'
    };
    
    log('Storing workflow feature...', colors.blue);
    const featureId = await storeFeature(workflowFeature);
    log(`Feature stored with ID: ${featureId}`, colors.green);
    
    // Store a visualization feature
    const vizFeature = {
      id: 'feature-5009',
      name: 'Workflow Visualization',
      type: 'feature',
      status: 'not_started',
      module: 'Visualization',
      description: 'Interactive D3.js visualization system for workflow executions',
      dependencies: ['D3.js', 'React', 'WorkflowEngine'],
      implementation: 'Uses D3.js for rendering workflow graphs with real-time execution state tracking.'
    };
    
    log('Storing visualization feature...', colors.blue);
    await storeFeature(vizFeature);
    
    // Store another feature in the same module
    const analyticsFeature = {
      id: 'feature-5010',
      name: 'Workflow Performance Analytics',
      type: 'feature',
      status: 'not_started',
      module: 'Visualization',
      description: 'Performance analytics dashboard for workflows',
      dependencies: ['Chart.js', 'React', 'WorkflowEngine'],
      implementation: 'Tracks and displays execution time, resource usage, and bottlenecks in workflow execution.'
    };
    
    log('Storing analytics feature...', colors.blue);
    await storeFeature(analyticsFeature);
    
    // Retrieve a feature by ID
    log('Retrieving feature by ID...', colors.blue);
    const retrievedFeature = await getFeature('feature-5001');
    log('Retrieved feature:', colors.green);
    console.log(retrievedFeature);
    
    // Get features by status
    log('Getting features with "not_started" status...', colors.blue);
    const notStartedFeatures = await getFeaturesByStatus('not_started');
    log(`Found ${notStartedFeatures.length} not started features:`, colors.green);
    console.log(notStartedFeatures.map(f => f.name));
    
    // Get features by module
    log('Getting features in Visualization module...', colors.blue);
    const vizFeatures = await getFeaturesByModule('Visualization');
    log(`Found ${vizFeatures.length} visualization features:`, colors.green);
    console.log(vizFeatures.map(f => f.name));
    
    divider();
    
    // --------------------------------------------------
    // Test Dependency Management
    // --------------------------------------------------
    log('2. Testing Dependency Management', colors.bright + colors.green);
    
    // Store dependencies
    const dependency1 = {
      id: 'dep-1',
      sourceId: 'feature-5001',
      targetId: 'feature-5009',
      type: 'required',
      strength: 'high',
      description: 'Visualization requires workflow execution data'
    };
    
    log('Storing dependency...', colors.blue);
    await storeDependency(dependency1);
    
    const dependency2 = {
      id: 'dep-2',
      sourceId: 'feature-5001',
      targetId: 'feature-5010',
      type: 'required',
      strength: 'high',
      description: 'Analytics requires workflow execution data'
    };
    
    log('Storing another dependency...', colors.blue);
    await storeDependency(dependency2);
    
    // Get dependencies for a feature
    log('Getting dependencies for Workflow Engine...', colors.blue);
    const dependencies = await getDependenciesForFeature('feature-5001');
    log(`Found ${dependencies.length} dependencies:`, colors.green);
    console.log(dependencies.map(d => `${d.sourceId} -> ${d.targetId}: ${d.description}`));
    
    // Get dependants for a feature
    log('Getting features that depend on Workflow Engine...', colors.blue);
    const dependants = await getDependantsForFeature('feature-5001');
    log(`Found ${dependants.length} dependant features:`, colors.green);
    console.log(dependants.map(d => d.targetId));
    
    divider();
    
    // --------------------------------------------------
    // Test Technical Decision Management
    // --------------------------------------------------
    log('3. Testing Technical Decision Management', colors.bright + colors.green);
    
    // Store technical decisions
    const decision1 = {
      id: 'decision-1',
      title: 'Multi-tier Memory Architecture',
      category: 'architecture',
      description: 'Use Redis for immediate storage, MongoDB for persistence, and Neo4j for graph relationships',
      rationale: 'Optimizes for both performance and complex relationship queries',
      alternatives: [
        'Single database approach',
        'File-based storage',
        'In-memory only'
      ]
    };
    
    log('Storing technical decision...', colors.blue);
    await storeDecision(decision1);
    
    const decision2 = {
      id: 'decision-2',
      title: 'Circuit Breaker Pattern',
      category: 'resilience',
      description: 'Implement circuit breaker for external service calls',
      rationale: 'Prevents cascading failures when external services are unavailable',
      alternatives: [
        'Retry mechanisms only',
        'Timeout-based fallbacks'
      ]
    };
    
    log('Storing another technical decision...', colors.blue);
    await storeDecision(decision2);
    
    // Get decision by ID
    log('Retrieving technical decision by ID...', colors.blue);
    const retrievedDecision = await getDecision('decision-1');
    log('Retrieved decision:', colors.green);
    console.log(retrievedDecision);
    
    // Get decisions by category
    log('Getting decisions in architecture category...', colors.blue);
    const archDecisions = await getDecisionsByCategory('architecture');
    log(`Found ${archDecisions.length} architecture decisions:`, colors.green);
    console.log(archDecisions.map(d => d.title));
    
    divider();
    
    // --------------------------------------------------
    // Test Session Context Management
    // --------------------------------------------------
    log('4. Testing Session Context Management', colors.bright + colors.green);
    
    // Save context values
    log('Saving session context values...', colors.blue);
    await saveContext('session', 'last_viewed_feature', 'feature-5001');
    await saveContext('session', 'active_module', 'WorkflowEngine');
    await saveContext('ui', 'theme', 'dark');
    await saveContext('ui', 'sidebar_collapsed', true);
    
    // Get a specific context value
    log('Getting specific context value...', colors.blue);
    const lastViewedFeature = await getContext('session', 'last_viewed_feature');
    log(`Last viewed feature: ${lastViewedFeature}`, colors.green);
    
    // Get all context values for a category
    log('Getting all UI context values...', colors.blue);
    const uiContext = await getCategoryContext('ui');
    log('UI context:', colors.green);
    console.log(uiContext);
    
    // Delete a context value
    log('Deleting a context value...', colors.blue);
    await deleteContext('ui', 'sidebar_collapsed');
    
    // Verify deletion
    log('Verifying deletion...', colors.blue);
    const uiContextAfterDelete = await getCategoryContext('ui');
    log('UI context after deletion:', colors.green);
    console.log(uiContextAfterDelete);
    
    divider();
    
    log('All tests completed successfully! ✅', colors.bright + colors.green);
    
  } catch (error) {
    log('Error during tests:', colors.red);
    console.error(error);
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});