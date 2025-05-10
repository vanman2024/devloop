/**
 * Restart the simple server with updated AI endpoint
 */
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function restartServer() {
  try {
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
  } catch (error) {
    console.error("Error restarting server:", error);
  }
}

restartServer();