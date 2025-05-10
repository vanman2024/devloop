// Simple test script for document generation
import fetch from 'node-fetch';

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
    // Make the API call to our simple server
    const response = await fetch('http://localhost:3002/api/documents/generate-mock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    console.log("API response:", {
      success: data.success,
      generated: data.generated,
      contentPreview: data.content ? data.content.substring(0, 150) + '...' : 'No content'
    });
    
    console.log("\nFull Generated Content:");
    console.log("--------------------");
    console.log(data.content);
  } catch (error) {
    console.error("Error testing document generation API:", error);
  }
}

// Run the test
testDocumentGeneration();