/**
 * Restart the document server with enhanced template support
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execPromise = promisify(exec);

// Ensure our template is loaded properly
async function verifyTemplates() {
  console.log("Verifying document generation template...");
  
  const sourceTemplatePath = '/mnt/c/Users/angel/devloop/templates/ai/prompt-templates/document_generation.json';
  const targetTemplatePaths = [
    '/mnt/c/Users/angel/devloop/system-core/templates/ai/prompt-templates/document_generation.json',
    '/mnt/c/Users/angel/Devloop/system-core/templates/ai/prompt-templates/document_generation.json',
    '/mnt/c/Users/angel/Devloop/templates/ai/prompt-templates/document_generation.json'
  ];
  
  // Ensure template exists at source
  if (!fs.existsSync(sourceTemplatePath)) {
    console.error("Template not found at source path:", sourceTemplatePath);
    return false;
  }
  
  // Copy template to all possible locations
  const templateContent = fs.readFileSync(sourceTemplatePath, 'utf8');
  
  for (const targetPath of targetTemplatePaths) {
    // Create directory if it doesn't exist
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log("Created directory:", targetDir);
    }
    
    // Write the template file
    try {
      fs.writeFileSync(targetPath, templateContent);
      console.log("Template copied to:", targetPath);
    } catch (error) {
      console.error("Error copying template to", targetPath, ":", error.message);
    }
  }
  
  console.log("Template verification complete");
  return true;
}

async function restartServer() {
  try {
    // Verify templates first
    await verifyTemplates();
    
    // Kill existing server
    console.log("Stopping existing server...");
    await execPromise('pkill -f "node simple-server.js" || true');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start the server again
    console.log("Starting server...");
    const { stdout, stderr } = await execPromise('cd /mnt/c/Users/angel/devloop/system-core/ui-system/react-app/server && node simple-server.js &');
    
    console.log("Server restarted!");
    if (stdout) console.log("Output:", stdout);
    if (stderr) console.log("Errors:", stderr);
    
    console.log("\nNext steps:");
    console.log("1. Test document generation with the enhanced template");
    console.log("2. Use the /api/documents/generate-with-ai endpoint");
    console.log("3. Check for XML support and function calling in the output");
  } catch (error) {
    console.error("Error restarting server:", error);
  }
}

// Run the restart process
restartServer();