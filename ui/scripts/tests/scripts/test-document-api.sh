#!/bin/bash
# Test the Document Manager API

echo "Testing Document Manager API..."

# Create temporary test script
cat > temp-test.js << 'EOL'
import fetch from 'node-fetch';

async function testDocumentGeneration() {
  const testData = {
    title: "Python Test Document",
    description: "Test document to verify Python connectivity",
    type: "test",
    purpose: "diagnostics",
    components: ["Document API", "Python Integration"],
  };

  console.log("Testing document generation API with:", testData);

  try {
    // Try the mock API first for basic connectivity test
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
      contentLength: data.content ? data.content.length : 0
    });

    // Save to a file for inspection
    if (data.content) {
      const fs = await import('fs');
      fs.default.writeFileSync('document-test-output.md', data.content);
      console.log("Document content saved to 'document-test-output.md'");
    }
  } catch (error) {
    console.error("Error testing document generation API:", error);
  }
}

testDocumentGeneration();
EOL

# Run the test script
echo "Running test..."
node temp-test.js

# Clean up
rm temp-test.js

echo "Test complete."