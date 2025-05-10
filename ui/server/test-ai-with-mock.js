/**
 * Test script to call the document generation with the mock endpoint
 */

import fetch from 'node-fetch';
import * as fs from 'fs';

async function testDocumentGeneration() {
  // Example document request
  const documentRequest = {
    title: "AI Document Generation Architecture Guide",
    description: "Comprehensive overview of the AI-powered document generation system",
    type: "architecture",
    purpose: "implementation",
    components: ["AI Service", "Document Manager", "Template Engine", "Claude API"]
  };

  console.log("Testing document generation with mock API:");
  console.log(JSON.stringify(documentRequest, null, 2));

  try {
    console.log("Sending request to mock API endpoint...");
    const response = await fetch('http://localhost:3002/api/documents/generate-mock', {
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
    
    console.log(`\nResponse received: success=${result.success}, generated=${result.generated}`);
    
    if (result.success && result.content) {
      // Save the content to a file for viewing
      const filename = 'mock-generated-document.md';
      fs.writeFileSync(filename, result.content);
      
      console.log(`\nDocument saved to ${filename}`);
      console.log("\nDocument content:");
      console.log("-------------------------------");
      console.log(result.content);
      console.log("-------------------------------");
      
      console.log("\nNext steps to integrate AI:");
      console.log("1. Restart the server to ensure the AI endpoint is available");
      console.log("2. Test with the AI endpoint to compare results");
      console.log("3. Create a chatbot interface for interactive document creation");
    } else if (result.error) {
      console.error("Error generating document:", result.error);
    }
  } catch (error) {
    console.error("Error calling API:", error.message);
  }
}

// Run the test
testDocumentGeneration();