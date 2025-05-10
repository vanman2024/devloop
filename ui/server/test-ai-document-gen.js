/**
 * Test script for AI-powered document generation
 */

import fetch from 'node-fetch';
import * as fs from 'fs';

async function testAIDocumentGeneration() {
  // Example document request
  const documentRequest = {
    title: "AI Document Generation System Architecture",
    description: "Technical architecture and implementation details of the AI-powered document generation system",
    type: "architecture",
    purpose: "implementation",
    components: ["AI Service", "Document Manager", "Template Engine", "Claude API"]
  };

  console.log("Testing AI-powered document generation:");
  console.log(JSON.stringify(documentRequest, null, 2));

  try {
    console.log("Sending request to AI endpoint...");
    const response = await fetch('http://localhost:3002/api/documents/generate-with-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(documentRequest),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const result = await response.json();
    
    console.log(`\nResponse received: success=${result.success}, generated=${result.generated}, AI-powered=${result.ai_powered || false}`);
    
    if (result.success && result.content) {
      // Save the content to a file for viewing
      const filename = 'ai-generated-document.md';
      fs.writeFileSync(filename, result.content);
      
      console.log(`\nDocument saved to ${filename}`);
      console.log("\nPreview (first 500 characters):");
      console.log("-------------------------------");
      console.log(result.content.substring(0, 500) + "...");
      console.log("-------------------------------");
    } else if (result.error) {
      console.error("Error generating document:", result.error);
    }
  } catch (error) {
    console.error("Error calling API:", error.message);
  }
}

// Run the test
testAIDocumentGeneration();