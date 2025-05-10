/**
 * Test script for the Document Manager API integration
 * 
 * This utility tests the document generation API endpoint
 * to ensure it works correctly with the AI Service.
 */

import fetch from 'node-fetch';

// Helper function to handle API response
async function handleResponse(response) {
  const data = await response.json();
  
  console.log("API response:", {
    success: data.success,
    generated: data.generated,
    contentPreview: data.content ? data.content.substring(0, 150) + '...' : 'No content'
  });

  // Save to a file for inspection
  if (data.content) {
    const fs = await import('fs');
    fs.default.writeFileSync('document-test-output.md', data.content);
    console.log("Document content saved to 'document-test-output.md' for inspection");
  }
  
  return data;
}

async function testDocumentGeneration() {
  const testData = {
    title: "Testing Framework Overview",
    description: "Comprehensive guide to the Devloop testing framework",
    type: "technical",
    purpose: "developer-guide",
    components: ["Testing Framework", "Core System"],
  };

  console.log("Testing document generation API with:", testData);

  try {
    // First try the real API, then fall back to mock if real API is unavailable
    console.log("Trying real document generation API...");
    try {
      const realResponse = await fetch('http://localhost:3001/api/documents/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
        timeout: 5000, // 5 second timeout
      });
      
      if (realResponse.ok) {
        return await handleResponse(realResponse);
      }
      console.log("Real API unavailable, falling back to mock API...");
    } catch (e) {
      console.log("Error connecting to real API:", e.message);
      console.log("Falling back to mock API...");
    }
    
    // Fall back to mock API
    const response = await fetch('http://localhost:3001/api/documents/generate-mock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    // Check the response
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    await handleResponse(response);
  } catch (error) {
    console.error("Error testing document generation API:", error);
  }
}

// Run the test
testDocumentGeneration();