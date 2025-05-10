#!/usr/bin/env node
/**
 * UI Safeguard Test Script
 * 
 * This script tests the UI Safeguard system by:
 * 1. Taking a snapshot
 * 2. Modifying a file
 * 3. Verifying the change is detected
 * 4. Rolling back to the snapshot
 * 5. Verifying the rollback succeeded
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Colors for output
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
};

// Test file path
const testFilePath = path.join(projectRoot, 'src', 'components', 'system-health', 'TestComponent.jsx');

// Create a test component if it doesn't exist
if (!fs.existsSync(testFilePath)) {
  console.log(colors.blue('Creating test component...'));
  
  const testComponent = `
import React from 'react';

const TestComponent = () => {
  return (
    <div className="test-component">
      <h2>UI Safeguard Test Component</h2>
      <p>This component is used to test the UI Safeguard system.</p>
    </div>
  );
};

export default TestComponent;
`;
  
  fs.writeFileSync(testFilePath, testComponent);
  console.log(colors.green('Created test component at:'), testFilePath);
}

// Run CLI command
function runCli(command, args = []) {
  const cliPath = path.join(projectRoot, 'scripts', 'ui-safeguard-cli.js');
  const cmd = `node ${cliPath} ${command} ${args.join(' ')}`;
  
  console.log(colors.blue(`Running: ${cmd}`));
  
  try {
    const output = execSync(cmd, { encoding: 'utf8' });
    return { success: true, output };
  } catch (error) {
    console.error(colors.red('Error:'), error.message);
    return { success: false, error };
  }
}

// Main test function
async function runTest() {
  console.log(colors.cyan('UI Safeguard System Test'));
  console.log(colors.yellow('======================\n'));
  
  try {
    // Step 1: Take a snapshot
    console.log(colors.yellow('Step 1: Taking snapshot...'));
    const takeSnapshot = runCli('snapshot', ['system-health', '--description', '"UI Safeguard Test"']);
    
    if (!takeSnapshot.success) {
      throw new Error('Failed to take snapshot');
    }
    
    // Extract snapshot ID from output
    const snapshotMatch = takeSnapshot.output.match(/Snapshot\s+(\S+)\s+created/);
    const snapshotId = snapshotMatch ? snapshotMatch[1] : null;
    
    if (!snapshotId) {
      throw new Error('Could not determine snapshot ID');
    }
    
    console.log(colors.green('Snapshot created:'), snapshotId);
    
    // Step 2: Modify the test component
    console.log(colors.yellow('\nStep 2: Modifying test component...'));
    
    const originalContent = fs.readFileSync(testFilePath, 'utf8');
    const modifiedContent = originalContent.replace(
      '<h2>UI Safeguard Test Component</h2>',
      '<h2>Modified UI Safeguard Test Component</h2>'
    );
    
    fs.writeFileSync(testFilePath, modifiedContent);
    console.log(colors.green('Modified test component'));
    
    // Step 3: Verify the change is detected
    console.log(colors.yellow('\nStep 3: Verifying change detection...'));
    const verifyChange = runCli('verify');
    
    // Check if verification result includes our component
    const changeDetected = verifyChange.output.includes('Component system-health: fail') ||
                          verifyChange.output.includes('TestComponent.jsx');
    
    if (!changeDetected) {
      console.log(colors.red('Change was not detected properly'));
    } else {
      console.log(colors.green('Change detected successfully'));
    }
    
    // Step 4: Roll back to the snapshot
    console.log(colors.yellow('\nStep 4: Rolling back to snapshot...'));
    const rollback = runCli('restore', [snapshotId]);
    
    // Step 5: Verify the rollback succeeded
    console.log(colors.yellow('\nStep 5: Verifying rollback...'));
    
    // Read the file again to see if it reverted
    const rolledBackContent = fs.readFileSync(testFilePath, 'utf8');
    const rollbackSucceeded = rolledBackContent.includes('<h2>UI Safeguard Test Component</h2>');
    
    if (rollbackSucceeded) {
      console.log(colors.green('Rollback successful'));
    } else {
      console.log(colors.red('Rollback failed'));
      
      // Create a temporary test file with the expected content
      const tempPath = testFilePath + '.expected';
      fs.writeFileSync(tempPath, originalContent);
      console.log(colors.yellow('Created expected file at:'), tempPath);
      
      // Show diff
      try {
        const diff = execSync(`diff -u "${testFilePath}" "${tempPath}"`, { encoding: 'utf8' });
        console.log(colors.yellow('Diff:'));
        console.log(diff);
      } catch (diffError) {
        console.log(colors.yellow('Diff shows changes:'));
        console.log(diffError.stdout);
      }
    }
    
    // Final verification
    const finalVerify = runCli('verify');
    const verificationSucceeded = finalVerify.output.includes('Component system-health: pass');
    
    if (verificationSucceeded) {
      console.log(colors.green('Final verification passed'));
    } else {
      console.log(colors.red('Final verification failed'));
    }
    
    // Summary
    console.log(colors.yellow('\nTest Summary:'));
    console.log('Snapshot created:', colors.green('✓'));
    console.log('Change detected:', changeDetected ? colors.green('✓') : colors.red('✗'));
    console.log('Rollback executed:', rollback.success ? colors.green('✓') : colors.red('✗'));
    console.log('Rollback succeeded:', rollbackSucceeded ? colors.green('✓') : colors.red('✗'));
    console.log('Final verification:', verificationSucceeded ? colors.green('✓') : colors.red('✗'));
    
  } catch (error) {
    console.error(colors.red('\nTest failed with error:'), error.message);
  }
}

// Run the test
runTest();