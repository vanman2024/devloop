/**
 * API tests for Feature Creation endpoints
 * 
 * This script uses axios to test the feature creation API endpoints
 */

const axios = require('axios');
const assert = require('assert');

// Configuration
const API_BASE_URL = 'http://localhost:8080/api/v1';
const FEATURE_CREATION_ENDPOINT = `${API_BASE_URL}/feature-creation`;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Test suite
async function runTests() {
  console.log(`${colors.blue}Running Feature Creation API Tests${colors.reset}`);
  
  try {
    // Test 1: Get agent status
    console.log(`\n${colors.yellow}Test 1: Get agent status${colors.reset}`);
    const statusResponse = await axios.get(`${FEATURE_CREATION_ENDPOINT}/status`);
    console.log(`Status: ${JSON.stringify(statusResponse.data, null, 2)}`);
    assert(statusResponse.data.success, 'Status request should succeed');
    console.log(`${colors.green}✓ Agent status test passed${colors.reset}`);
    
    // Test 2: Analyze a feature
    console.log(`\n${colors.yellow}Test 2: Analyze a feature${colors.reset}`);
    const analyzeResponse = await axios.post(`${FEATURE_CREATION_ENDPOINT}/analyze`, {
      name: 'Dashboard Component',
      description: 'A reusable UI component for the system dashboard'
    });
    console.log(`Analysis: ${JSON.stringify(analyzeResponse.data, null, 2)}`);
    assert(analyzeResponse.data.success, 'Analysis request should succeed');
    assert(analyzeResponse.data.result, 'Analysis should return a result');
    console.log(`${colors.green}✓ Feature analysis test passed${colors.reset}`);
    
    // Test 3: Generate a feature ID
    console.log(`\n${colors.yellow}Test 3: Generate a feature ID${colors.reset}`);
    const idResponse = await axios.post(`${FEATURE_CREATION_ENDPOINT}/generate-id`, {
      feature_name: 'Dashboard Component'
    });
    console.log(`Generated ID: ${JSON.stringify(idResponse.data, null, 2)}`);
    assert(idResponse.data.success, 'ID generation request should succeed');
    assert(idResponse.data.result && typeof idResponse.data.result === 'string', 'Should return an ID string');
    assert(idResponse.data.result.startsWith('feature-'), 'ID should start with "feature-"');
    console.log(`${colors.green}✓ Feature ID generation test passed${colors.reset}`);
    
    // Test 4: Process a complete feature
    console.log(`\n${colors.yellow}Test 4: Process a complete feature${colors.reset}`);
    const processResponse = await axios.post(`${FEATURE_CREATION_ENDPOINT}/process`, {
      name: 'Testing Framework Integration',
      description: 'Integrates the testing framework with CI/CD pipeline',
      tags: ['testing', 'ci-cd']
    });
    console.log(`Processed Feature: ${JSON.stringify(processResponse.data, null, 2)}`);
    assert(processResponse.data.success, 'Feature processing request should succeed');
    assert(processResponse.data.result && processResponse.data.result.feature, 'Should return a feature object');
    assert(processResponse.data.result.feature.id, 'Feature should have an ID');
    assert(processResponse.data.result.feature.suggestedMilestone, 'Feature should have a suggested milestone');
    console.log(`${colors.green}✓ Complete feature processing test passed${colors.reset}`);
    
    console.log(`\n${colors.green}All tests passed successfully!${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}ERROR: ${error.message}${colors.reset}`);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests };