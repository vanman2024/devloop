// Simple Express server for document API testing
import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const app = express();
const PORT = 3002;
const execPromise = promisify(exec);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is healthy' });
});

// Document generation endpoint (mock for testing)
app.post('/api/documents/generate-mock', (req, res) => {
  const { title, description, type, purpose, components = [] } = req.body;
  
  if (!title) {
    return res.status(400).json({
      success: false,
      error: "Title is required"
    });
  }
  
  // Create a mock document
  const mockContent = `# ${title}\n\n${description || ''}\n\n## Overview\n\nThis is a ${type || 'general'} document with the purpose of ${purpose || 'information'}.\n\n## Components\n\n${components.length > 0 ? components.map(comp => `- ${comp}`).join('\n') : '- No components specified'}\n\n## Details\n\nThis document was generated with mock data for testing purposes.\n`;
  
  setTimeout(() => {
    res.json({
      success: true,
      content: mockContent,
      generated: true
    });
  }, 500);
});

// Real AI-powered document generation endpoint
app.post('/api/documents/generate-with-ai', async (req, res) => {
  const { title, description, type, purpose, components = [] } = req.body;
  
  if (!title) {
    return res.status(400).json({
      success: false,
      error: "Title is required"
    });
  }
  
  console.log('Attempting AI-powered document generation for:', title);

  try {
    // Path to the AI service script - using absolute path
    const aiServiceScript = '/mnt/c/Users/angel/devloop/system-core/scripts/utils/ai_service.py';
    
    // Create a template-based prompt with relevant variables
    const promptData = {
      title,
      description: description || '',
      docType: type || 'general',
      docPurpose: purpose || 'information',
      components: Array.isArray(components) ? components : []
    };
    
    const promptJSON = JSON.stringify(promptData);
    
    // Read API key from .env file
    const fs = await import('fs');
    const envFile = fs.readFileSync('/mnt/c/Users/angel/devloop/.env', 'utf8');
    const apiKeyMatch = envFile.match(/CLAUDE_API_KEY=([^\n]+)/);
    const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : '';
    
    console.log(`Using Claude API key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    
    // Use the AI service with our enhanced document generation template
    const cmd = `CLAUDE_API_KEY="${apiKey}" python3 "${aiServiceScript}" "Generate a comprehensive dynamic document with XML and function calling support for ${title}" --template "document_generation" --vars '${promptJSON}'`;
    
    console.log('Executing AI service command with API key');
    
    const child_process = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(child_process.exec);
    
    const { stdout, stderr } = await execPromise(cmd, { maxBuffer: 1024 * 1024 });
    
    if (stderr) {
      console.warn('AI service warning:', stderr);
    }
    
    console.log('AI service response received. Processing...');
    
    // Parse the AI service response
    let aiResponse;
    try {
      aiResponse = JSON.parse(stdout);
    } catch (parseError) {
      console.error('Failed to parse AI service response:', parseError);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI service response',
        content: `# ${title}\n\n${description || ''}\n\nFailed to generate content due to parsing error.`
      });
    }
    
    // Extract the content from the AI response
    let generatedContent;
    if (aiResponse.success && aiResponse.result) {
      // If result is an object with text property, use that
      if (typeof aiResponse.result === 'object' && aiResponse.result.text) {
        generatedContent = aiResponse.result.text;
      } else {
        // Otherwise use the result directly (might be a string)
        generatedContent = typeof aiResponse.result === 'string' 
          ? aiResponse.result 
          : JSON.stringify(aiResponse.result, null, 2);
      }
    } else {
      // If AI service failed, create a basic document
      generatedContent = `# ${title}\n\n${description || ''}\n\n## Overview\n\nAI service was unable to generate content. Please fill in manually.`;
    }
    
    // Return the generated content
    return res.json({
      success: true,
      content: generatedContent,
      generated: true,
      ai_powered: true
    });
    
  } catch (error) {
    console.error('Error generating document with AI:', error);
    
    // Fallback to a template if AI service fails
    const fallbackContent = `# ${title}\n\n${description || ''}\n\n## Overview\n\nCould not generate AI content due to error: ${error.message}\n\n## Purpose\n\n${purpose || 'To document system functionality and architecture.'}\n\n## Components\n\n${components.length > 0 ? components.map(comp => `- ${comp}`).join('\n') : '- No components specified'}\n\n## Details\n\nThis document was generated with a fallback template since the AI service encountered an error.\n`;
    
    return res.json({
      success: true,
      content: fallbackContent,
      generated: false,
      error: error.message
    });
  }
});

// Real AI document generation endpoint with better error handling
app.post('/api/documents/generate-with-ai-v2', async (req, res) => {
  const { title, description, type, purpose, components = [] } = req.body;
  
  if (!title) {
    return res.status(400).json({
      success: false,
      error: "Title is required"
    });
  }
  
  console.log('Attempting AI-powered document generation for:', title);

  try {
    // Path to the AI service script - using absolute path
    const aiServiceScript = '/mnt/c/Users/angel/devloop/system-core/scripts/utils/ai_service.py';
    
    // Create a template-based prompt with relevant variables
    const promptData = {
      title,
      description: description || '',
      docType: type || 'general',
      docPurpose: purpose || 'information',
      components: Array.isArray(components) ? components : []
    };
    
    const promptJSON = JSON.stringify(promptData);
    
    // Read API key from .env file
    const fs = await import('fs');
    const envFile = fs.readFileSync('/mnt/c/Users/angel/devloop/.env', 'utf8');
    const apiKeyMatch = envFile.match(/CLAUDE_API_KEY=([^\n]+)/);
    const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : '';
    
    // Use the AI service with our enhanced document generation template
    const cmd = `CLAUDE_API_KEY="${apiKey}" python3 "${aiServiceScript}" "Generate a comprehensive dynamic document with XML and function calling support for ${title}" --template "document_generation" --vars '${promptJSON}'`;
    
    console.log('Executing AI service command with API key');
    
    const { exec } = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(exec);
    
    const { stdout, stderr } = await execPromise(cmd);
    
    if (stderr) {
      console.warn('AI service warning:', stderr);
    }
    
    console.log('AI service response received. Processing...');
    
    // Parse the AI service response
    let aiResponse;
    try {
      aiResponse = JSON.parse(stdout);
    } catch (parseError) {
      console.error('Failed to parse AI service response:', parseError);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI service response',
        content: `# ${title}\n\n${description || ''}\n\nFailed to generate content due to parsing error.`
      });
    }
    
    // Extract the content from the AI response
    let generatedContent;
    if (aiResponse.success && aiResponse.result) {
      // If result is an object with text property, use that
      if (typeof aiResponse.result === 'object' && aiResponse.result.text) {
        generatedContent = aiResponse.result.text;
      } else {
        // Otherwise use the result directly (might be a string)
        generatedContent = typeof aiResponse.result === 'string' 
          ? aiResponse.result 
          : JSON.stringify(aiResponse.result, null, 2);
      }
    } else {
      // If AI service failed, create a basic document
      generatedContent = `# ${title}\n\n${description || ''}\n\n## Overview\n\nAI service was unable to generate content. Please fill in manually.`;
    }
    
    // Return the generated content
    return res.json({
      success: true,
      content: generatedContent,
      generated: true,
      ai_powered: true
    });
    
  } catch (error) {
    console.error('Error generating document with AI:', error);
    
    // Fallback to a template if AI service fails
    const fallbackContent = `# ${title}\n\n${description || ''}\n\n## Overview\n\nCould not generate AI content due to error: ${error.message}\n\n## Purpose\n\n${purpose || 'To document system functionality and architecture.'}\n\n## Components\n\n${components.length > 0 ? components.map(comp => `- ${comp}`).join('\n') : '- No components specified'}\n\n## Details\n\nThis document was generated with a fallback template since the AI service encountered an error.\n`;
    
    return res.json({
      success: true,
      content: fallbackContent,
      generated: false,
      error: error.message
    });
  }
});

// Document chat assistance endpoint - debug WSL/Python execution
app.post('/api/documents/chat', async (req, res) => {
  const { message, documentContext } = req.body;
  
  if (!message) {
    return res.status(400).json({
      success: false,
      error: "Message is required"
    });
  }
  
  console.log('Processing document chat message:', { message, documentContext });
  console.log('======== DOCUMENT CHAT ENDPOINT CALLED ========');

  try {
    // STEP 1: Test basic Python execution with a simple command
    console.log('STEP 1: Testing basic Python execution...');
    
    const { exec } = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(exec);
    
    // Test with a simple Python print command
    const { stdout: basicStdout, stderr: basicStderr } = await execPromise('python3 -c "print(\'hello from python via node\')"');
    
    console.log('Basic Python test stdout:', basicStdout);
    if (basicStderr) {
      console.warn('Basic Python test stderr:', basicStderr);
    }
    
    // STEP 2: Test with a JSON response
    console.log('STEP 2: Testing Python JSON output...');
    
    const jsonCmd = 'python3 -c "import json; print(json.dumps({\'success\': True, \'result\': {\'text\': \'Test JSON response from Python\'}}));"';
    const { stdout: jsonStdout, stderr: jsonStderr } = await execPromise(jsonCmd);
    
    console.log('JSON Python test stdout:', jsonStdout);
    if (jsonStderr) {
      console.warn('JSON Python test stderr:', jsonStderr);
    }
    
    // STEP 3: Test with the actual AI service script path
    console.log('STEP 3: Testing AI service script path...');
    
    const scriptPath = '/mnt/c/Users/angel/devloop/system-core/scripts/utils/ai_service.py';
    const scriptCmd = `ls -la "${scriptPath}"`;
    
    try {
      const { stdout: lsStdout } = await execPromise(scriptCmd);
      console.log('Script exists check:', lsStdout);
    } catch (pathError) {
      console.error('Script path check failed:', pathError.message);
    }
    
    // STEP 4: Try to use the AI service directly with minimal arguments
    console.log('STEP 4: Testing AI service with minimal args...');
    
    const aiCmd = `python3 "${scriptPath}" "Test message"`;
    
    try {
      const { stdout: aiStdout, stderr: aiStderr } = await execPromise(aiCmd);
      console.log('AI service test stdout:', aiStdout.substring(0, 200) + '...');
      if (aiStderr) {
        console.warn('AI service test stderr:', aiStderr);
      }
    } catch (aiError) {
      console.error('AI service call failed:', aiError.message);
    }
    
    // Return diagnostic information
    return res.json({
      success: true,
      response: `Diagnostic tests executed - please check server logs for results. Your message was: "${message}"`,
      diagnostic_steps: [
        "Basic Python execution",
        "Python JSON output",
        "AI service script path check",
        "AI service minimal args test"
      ]
    });
    
  } catch (error) {
    console.error('Error in diagnostic process:', error);
    return res.json({
      success: false,
      response: "An error occurred during diagnostics. Check server logs for details.",
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Simple document server running on port ${PORT}`);
  console.log(`Try it at http://localhost:${PORT}/health`);
});