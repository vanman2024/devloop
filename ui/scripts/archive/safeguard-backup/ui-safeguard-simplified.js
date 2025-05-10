/**
 * Simplified UI Safeguard Plugin
 * Basic version without template literals for compatibility
 */

import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default configuration
const defaultOptions = {
  enabled: true,
  snapshotOnBuild: true,
  components: 'all',
  browserNotifications: true,
  showPanel: false, // Disabled for simplicity
  verifyAfterBuild: true,
  autoRollback: false,
  storage: {
    cleanupAfterBuild: true
  }
};

// Vite plugin
function uiSafeguardPlugin(options = {}) {
  // Merge options with defaults
  const pluginOptions = { ...defaultOptions, ...options };
  
  return {
    name: 'vite-plugin-ui-safeguard',
    
    // Called when the server is configuring its middleware.
    configureServer(server) {
      // Skip if disabled
      if (!pluginOptions.enabled) return;
      
      console.log('[UI Safeguard] Plugin initialized');
      
      // Add server middleware for API endpoints
      server.middlewares.use('/ui-safeguard', (req, res, next) => {
        // Log all requests
        console.log('[UI Safeguard] Request: ' + req.method + ' ' + req.url);
        
        // Enable CORS for browser requests
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // Handle OPTIONS preflight requests
        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }
        
        // Simple response for any endpoint to avoid errors
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true,
          message: 'UI Safeguard temp endpoint',
          timestamp: new Date().toISOString()
        }));
      });
    },
    
    // Called on build start
    buildStart() {
      // Skip if disabled
      if (!pluginOptions.enabled) return;
      console.log('[UI Safeguard] Build started');
    },
    
    // Called on build end
    closeBundle() {
      // Skip if disabled
      if (!pluginOptions.enabled) return;
      console.log('[UI Safeguard] Build completed');
    },
    
    // Transform hook to inject client code
    transformIndexHtml() {
      // Skip if disabled
      if (!pluginOptions.enabled) return;
      
      // Inject minimal UI Safeguard browser code
      return [
        {
          tag: 'script',
          attrs: { type: 'module' },
          children: 'console.log("[UI Safeguard] Simplified version initialized");',
          injectTo: 'body'
        }
      ];
    }
  };
}

export default uiSafeguardPlugin;