/**
 * Test script to call the document generation with AI service
 * This script directly calls the server on port 3002
 */

import fetch from 'node-fetch';

async function testDocumentGeneration() {
  // Example document request
  const documentRequest = {
    title: "AI Document Generation Architecture Guide",
    description: "Comprehensive overview of the AI-powered document generation system",
    type: "architecture",
    purpose: "implementation",
    components: ["AI Service", "Document Manager", "Template Engine", "Claude API"]
  };

  console.log("Testing document generation with real AI service:");
  console.log(JSON.stringify(documentRequest, null, 2));

  try {
    // First check if the AI endpoint exists
    console.log("Checking available endpoints...");
    try {
      const mockResponse = await fetch('http://localhost:3002/api/documents/generate-mock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({title: "Test Document"}),
      });
      if (mockResponse.ok) {
        console.log("Mock endpoint is available");
      }
    } catch (e) {
      console.log("Mock endpoint test failed:", e.message);
    }
    
    // Try the AI endpoint
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
      const fs = await import('fs');
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
testDocumentGeneration();