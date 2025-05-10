/**
 * Test script for enhanced AI-powered document generation
 * Using the XML-aware, function-calling template
 */

import fetch from 'node-fetch';
import * as fs from 'fs';

async function testEnhancedDocumentGeneration() {
  // Example document request with rich metadata
  const documentRequest = {
    title: "Devloop AI Document Generation System",
    description: "Architecture and implementation of the AI-powered document generation system with XML processing and function calling",
    type: "architecture",
    purpose: "implementation",
    components: [
      "AI Service", 
      "Document Manager", 
      "Template Engine", 
      "Claude API",
      "XML Processor",
      "Function Call Interpreter"
    ]
  };

  console.log("Testing enhanced AI document generation:");
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
      const filename = 'enhanced-ai-document.md';
      fs.writeFileSync(filename, result.content);
      
      console.log(`\nDocument saved to ${filename}`);
      
      // Check for XML and function calling
      const hasXml = result.content.includes('<') || 
                    result.content.includes('<document:') || 
                    result.content.includes('<function');
      
      const hasFunctionCalls = result.content.includes('antml:function') || 
                              result.content.includes('name="generate') ||
                              result.content.includes('function name=');
      
      console.log("\nDocument Analysis:");
      console.log(`- Contains XML tags: ${hasXml ? 'YES' : 'NO'}`);
      console.log(`- Contains function calls: ${hasFunctionCalls ? 'YES' : 'NO'}`);
      console.log(`- Document length: ${result.content.length} characters`);
      
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
testEnhancedDocumentGeneration();