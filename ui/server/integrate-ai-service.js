/**
 * AI Service Integration for Document Manager
 * 
 * This script creates the actual integration between the Document Manager and AI service.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import express from 'express';
import cors from 'cors';

// Create a simple API server to demonstrate the integration
const app = express();
const PORT = 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Template loader for testing
function loadAndValidateTemplate() {
  console.log('Validating template loading...');
  
  try {
    // Check template file existence
    const templatePath = '/mnt/c/Users/angel/devloop/system-core/templates/ai/prompt-templates/feature_implementation_plan.json';
    if (!fs.existsSync(templatePath)) {
      return { success: false, error: 'Template file not found' };
    }
    
    // Read the template file
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    try {
      // Parse the JSON
      const templateJson = JSON.parse(templateContent);
      // Check if it has the expected structure
      if (!templateJson.prompt_templates || !templateJson.prompt_templates.feature_implementation_plan) {
        return { 
          success: false, 
          error: 'Invalid template structure', 
          found: Object.keys(templateJson) 
        };
      }
      
      return { 
        success: true, 
        message: 'Template validation passed',
        templates: Object.keys(templateJson.prompt_templates)
      };
    } catch (parseError) {
      return { success: false, error: `JSON parse error: ${parseError.message}` };
    }
  } catch (error) {
    return { success: false, error: `File system error: ${error.message}` };
  }
}

// List all templates
function listAvailableTemplates() {
  try {
    const results = [];
    const templatesDir = '/mnt/c/Users/angel/devloop/system-core/templates/ai/prompt-templates';
    
    // List all files in the templates directory
    const files = fs.readdirSync(templatesDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = `${templatesDir}/${file}`;
        const content = fs.readFileSync(filePath, 'utf8');
        
        try {
          const json = JSON.parse(content);
          // Handle different JSON structures
          if (json.prompt_templates) {
            // New format with prompt_templates key
            results.push({
              file,
              templates: Object.keys(json.prompt_templates)
            });
          } else {
            // Old format with direct keys
            results.push({
              file,
              templates: Object.keys(json)
            });
          }
        } catch (e) {
          results.push({
            file,
            error: `Parse error: ${e.message}`
          });
        }
      }
    }
    
    return {
      success: true,
      templates: results
    };
  } catch (error) {
    return {
      success: false,
      error: `Error listing templates: ${error.message}`
    };
  }
}

// Generate document with AI service
async function generateDocumentWithAI(data) {
  try {
    // Create command to call AI service directly
    const aiServiceScript = '/mnt/c/Users/angel/devloop/system-core/scripts/utils/ai_service.py';
    const promptJSON = JSON.stringify(data);
    
    // Get API key from .env file
    const envFile = fs.readFileSync('/mnt/c/Users/angel/devloop/.env', 'utf8');
    const apiKeyMatch = envFile.match(/CLAUDE_API_KEY=([^\n]+)/);
    const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : '';
    
    if (!apiKey) {
      return {
        success: false,
        error: 'API key not found in .env file'
      };
    }
    
    console.log(`Using API key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    
    // Command to call the AI service
    const cmd = `CLAUDE_API_KEY="${apiKey}" python3 "${aiServiceScript}" "Generate detailed documentation for ${data.title}" --template "feature_implementation_plan" --vars '${promptJSON}'`;
    
    console.log('Executing AI service command...');
    const output = execSync(cmd, { maxBuffer: 1024 * 1024 }).toString();
    
    try {
      const response = JSON.parse(output);
      
      return {
        success: true,
        result: response
      };
    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse AI service response: ${parseError.message}`,
        rawOutput: output
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `AI service execution error: ${error.message}`,
      stderr: error.stderr ? error.stderr.toString() : 'No additional details'
    };
  }
}

// API endpoint to check template
app.get('/api/validate-template', (req, res) => {
  const result = loadAndValidateTemplate();
  res.json(result);
});

// API endpoint to list templates
app.get('/api/list-templates', (req, res) => {
  const result = listAvailableTemplates();
  res.json(result);
});

// Document generation endpoint
app.post('/api/generate-document', async (req, res) => {
  const { title, description, type, purpose, components = [] } = req.body;
  
  if (!title) {
    return res.status(400).json({
      success: false,
      error: "Title is required"
    });
  }
  
  console.log('Generating document with AI service:', title);
  
  // Prepare data for AI service
  const data = {
    title,
    description: description || '',
    docType: type || 'general',
    docPurpose: purpose || 'information',
    components: Array.isArray(components) ? components : []
  };
  
  // Call AI service
  const result = await generateDocumentWithAI(data);
  
  if (result.success && result.result.success) {
    // Extract content from AI response
    let content = '';
    if (typeof result.result.result === 'object') {
      content = result.result.result.text || JSON.stringify(result.result.result, null, 2);
    } else {
      content = result.result.result;
    }
    
    // Save content to file for reference
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    fs.writeFileSync(filename, content);
    
    res.json({
      success: true,
      content,
      filename,
      generated: true,
      ai_powered: true
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error || 'Unknown error',
      result
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`AI Service Integration server running on port ${PORT}`);
  console.log(`Try it out at http://localhost:${PORT}/api/validate-template`);
});