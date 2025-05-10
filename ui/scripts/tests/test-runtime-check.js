#!/usr/bin/env node
/**
 * Test script for the runtime error detection
 * 
 * This script specifically tests the checkRuntimeErrors function
 * to make sure it properly detects issues in the running app.
 */

import { checkRuntimeErrors } from '../unified-ui-safeguard.js';

async function runTest() {
  console.log('Testing runtime error detection...');
  
  // Run the runtime check
  const result = await checkRuntimeErrors();
  
  console.log('\n=== Test Results ===');
  console.log(`Success: ${result.success ? 'Yes ✅' : 'No ❌'}`);
  
  if (result.errors.length > 0) {
    console.log('\nErrors detected:');
    result.errors.forEach((error, i) => {
      console.log(`${i+1}. ${error}`);
    });
  } else {
    console.log('No runtime errors detected.');
  }
  
  process.exit(result.success ? 0 : 1);
}

runTest().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});