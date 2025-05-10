/**
 * Test script for the AI-powered Document Generation API
 * 
 * This utility tests the AI document generation endpoint
 */

import fetch from 'node-fetch';

async function testAIDocumentGeneration() {
  const testData = {
    title: "AI System Integration Overview",
    description: "Comprehensive guide to integrating AI capabilities into Devloop",
    type: "technical",
    purpose: "implementation",
    components: ["AI Service", "Document Manager", "Claude Integration"],
  };

  console.log("Testing AI document generation API with:", testData);

  try {
    // Make the API call
    const response = await fetch('http://localhost:3002/api/documents/generate-with-ai', {
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

    const data = await response.json();
    
    console.log("API response:", {
      success: data.success,
      generated: data.generated,
      ai_powered: data.ai_powered || false,
      contentPreview: data.content ? data.content.substring(0, 150) + '...' : 'No content'
    });

    // Save to a file for inspection
    if (data.content) {
      const fs = await import('fs');
      fs.default.writeFileSync('ai-document-output.md', data.content);
      console.log("Document content saved to 'ai-document-output.md' for inspection");
    }
  } catch (error) {
    console.error("Error testing AI document generation API:", error);
  }
}

// Run the test
testAIDocumentGeneration();