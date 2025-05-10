/**
 * Test script for the Document Manager API integration with Claude
 * 
 * This utility tests the document generation API endpoint
 * by directly sending requests to the AI service.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Test direct Claude API integration
async function testClaudeDocumentGeneration() {
  const testData = {
    title: "AI-Powered Content Generation System",
    description: "Architecture and implementation of the AI-powered document generation system",
    docType: "architecture",
    docPurpose: "implementation",
    components: ["Claude API", "Document Manager", "Template Engine"]
  };

  console.log("Testing Claude document generation with:", testData);

  try {
    // Create command to call AI service directly
    const aiServiceScript = '/mnt/c/Users/angel/devloop/system-core/scripts/utils/ai_service.py';
    const promptJSON = JSON.stringify(testData);
    
    // Get API key from environment variable
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error("CLAUDE_API_KEY environment variable not found. Please set it in your .env file.");
    }
    console.log(`Using API key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`);
    
    // Set environment variable directly in the command
    const cmd = `CLAUDE_API_KEY="${apiKey}" python3 "${aiServiceScript}" "Generate detailed documentation for ${testData.title}" --template "feature_implementation_plan" --vars '${promptJSON}'`;
    
    console.log("\nExecuting command...");
    
    // Run the command
    const output = execSync(cmd, { maxBuffer: 1024 * 1024 }).toString();
    
    // Parse the response
    try {
      const response = JSON.parse(output);
      
      console.log("\nAPI response received. Success:", response.success);
      
      if (response.success && response.result) {
        // Result might be an object or a string
        const content = typeof response.result === 'object' ? 
          (response.result.text || JSON.stringify(response.result, null, 2)) : 
          response.result;
        
        // Save to a file
        fs.writeFileSync('claude-document-output.md', content);
        console.log("\nDocument content saved to 'claude-document-output.md'");
        console.log("\nPreview of generated content:");
        console.log(content.substring(0, 500) + "...");
      } else {
        console.error("API call succeeded but returned no content");
        if (response.error) {
          console.error("Error:", response.error);
        }
      }
    } catch (parseError) {
      console.error("Error parsing API response:", parseError);
      console.log("Raw output:", output);
    }
  } catch (error) {
    console.error("Error executing AI service command:", error.message);
    
    // Try to get stderr
    if (error.stderr) {
      console.error("Error details:", error.stderr.toString());
    }
  }
}

// Run the test
testClaudeDocumentGeneration();