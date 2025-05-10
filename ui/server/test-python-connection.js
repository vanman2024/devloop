/**
 * Test script to check if Node.js can execute Python in the WSL environment
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test regular Python execution
async function testPythonExecution() {
  console.log("STEP 1: Testing basic Python execution...");
  try {
    // Try directly
    const { stdout: directOutput } = await execPromise('python3 -c "print(\'hello from python via node\')"');
    console.log("Direct Python execution successful:");
    console.log(directOutput);
  } catch (error) {
    console.error("Error in direct Python execution:", error.message);
    
    // Try with bash wrapper
    try {
      console.log("\nTrying with bash wrapper...");
      const { stdout: bashOutput } = await execPromise('bash -c "python3 -c \'print(\"hello from python via bash\")\'\"');
      console.log("Bash-wrapped Python execution successful:");
      console.log(bashOutput);
    } catch (bashError) {
      console.error("Error in bash-wrapped Python execution:", bashError.message);
    }
  }
}

// Test Python script execution
async function testPythonScript() {
  console.log("\nSTEP 2: Testing Python script execution...");
  const scriptPath = path.join(__dirname, 'python-test.py');
  
  try {
    // Try directly
    const { stdout: directOutput } = await execPromise(`python3 "${scriptPath}"`);
    console.log("Direct Python script execution successful:");
    console.log(directOutput);
  } catch (error) {
    console.error("Error in direct Python script execution:", error.message);
    
    // Try with bash wrapper
    try {
      console.log("\nTrying with bash wrapper...");
      const { stdout: bashOutput } = await execPromise(`bash -c 'python3 "${scriptPath}"'`);
      console.log("Bash-wrapped Python script execution successful:");
      console.log(bashOutput);
    } catch (bashError) {
      console.error("Error in bash-wrapped Python script execution:", bashError.message);
    }
  }
}

// Test AI service script execution
async function testAIServiceExecution() {
  console.log("\nSTEP 3: Testing AI service script execution...");
  const aiServiceScript = '/mnt/c/Users/angel/devloop/system-core/scripts/utils/ai_service.py';
  
  try {
    // Use a mock API key for testing
    const mockApiKey = "sk-test12345678901234567890";
    
    // Test with bash wrapper (recommended approach)
    console.log("Testing with bash wrapper...");
    const cmd = `bash -c 'CLAUDE_API_KEY="${mockApiKey}" python3 "${aiServiceScript}" "Test prompt" --template "command_processing" --vars '"'"'{"test": true}'"'"''`;
    
    console.log("Command:", cmd);
    
    const { stdout, stderr } = await execPromise(cmd);
    
    console.log("AI Service execution successful:");
    console.log("stdout:", stdout.substring(0, 200) + (stdout.length > 200 ? "..." : ""));
    
    if (stderr) {
      console.warn("stderr:", stderr);
    }
  } catch (error) {
    console.error("Error in AI service execution:", error.message);
  }
}

// Run all tests
async function runTests() {
  console.log("=== Python Connectivity Test ===");
  console.log(`Testing from directory: ${__dirname}`);
  console.log("Current timestamp:", new Date().toISOString());
  console.log("");
  
  await testPythonExecution();
  await testPythonScript();
  await testAIServiceExecution();
  
  console.log("\n=== Test Complete ===");
}

runTests().catch(error => {
  console.error("Test failed with error:", error);
});