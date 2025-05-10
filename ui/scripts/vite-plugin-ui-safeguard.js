/**
 * Vite Plugin UI Safeguard
 * 
 * This plugin integrates the UI Safeguard Agent directly into the Vite development flow.
 * It provides automatic snapshot creation, verification, and rollback capabilities
 * directly integrated with the build process.
 * 
 * Features:
 * - Take automatic snapshots on successful builds
 * - Verify UI component integrity during development
 * - Show notifications in the browser
 * - Auto-rollback on critical failures
 * - Display storage usage and snapshot information
 */

import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AGENT_PATH = path.resolve(__dirname, '../../../../agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py');
const STORAGE_MANAGER_PATH = path.resolve(__dirname, '../../../../agents/system-health-agent/child-agents/ui-safeguard-agent/storage_manager.py');

// Default plugin options
const defaultOptions = {
  // Enable/disable the plugin
  enabled: true,
  // Take snapshot on successful build
  snapshotOnBuild: true,
  // Components to snapshot (all or specific components)
  components: 'all',
  // Enable browser notifications
  browserNotifications: true,
  // Show UI Safeguard panel in browser
  showPanel: true,
  // Auto-verify after build
  verifyAfterBuild: true,
  // Auto-rollback on critical failure
  autoRollback: false,
  // Storage options
  storage: {
    // Clean up storage after build
    cleanupAfterBuild: true
  }
};

// Run agent command
function runAgent(command, args = []) {
  try {
    const fullCommand = `python3 ${AGENT_PATH} ${command} ${args.join(' ')}`;
    console.log(`[UI Safeguard] Running: ${fullCommand}`);
    const output = execSync(fullCommand, { encoding: 'utf8' });
    return { success: true, output };
  } catch (error) {
    console.error(`[UI Safeguard] Error running agent:`, error.message);
    return { success: false, error };
  }
}

// Run storage manager command
function runStorageManager(command, args = []) {
  try {
    const fullCommand = `python3 ${STORAGE_MANAGER_PATH} ${command} ${args.join(' ')}`;
    console.log(`[UI Safeguard Storage] Running: ${fullCommand}`);
    const output = execSync(fullCommand, { encoding: 'utf8' });
    return { success: true, output };
  } catch (error) {
    console.error(`[UI Safeguard Storage] Error:`, error.message);
    return { success: false, error };
  }
}

// Take a snapshot
function takeSnapshot(component = 'all', description = null) {
  const args = [component];
  if (description) {
    args.push('--description', `"${description}"`);
  }
  
  return runAgent('snapshot', args);
}

// Get storage statistics
function getStorageStats() {
  const result = runStorageManager('stats');
  
  if (result.success) {
    // Parse stats from output
    const output = result.output;
    const stats = {
      snapshotCount: 0,
      storageUsageMB: 0,
      logicalSizeMB: 0,
      spaceRatio: 0,
      savings: {
        deduplicationMB: 0,
        compressionMB: 0,
        incrementalMB: 0
      }
    };
    
    // Regex to extract values
    const snapshotCountMatch = output.match(/Snapshots: (\d+)/);
    const storageUsageMatch = output.match(/Storage usage: ([0-9.]+)MB/);
    const logicalSizeMatch = output.match(/Logical size: ([0-9.]+)MB/);
    const spaceRatioMatch = output.match(/Space saving ratio: ([0-9.]+)x/);
    const dedupMatch = output.match(/Deduplication: ([0-9.]+)MB/);
    const compressMatch = output.match(/Compression: ([0-9.]+)MB/);
    const incrementalMatch = output.match(/Incremental: ([0-9.]+)MB/);
    
    // Update stats
    if (snapshotCountMatch) stats.snapshotCount = parseInt(snapshotCountMatch[1]);
    if (storageUsageMatch) stats.storageUsageMB = parseFloat(storageUsageMatch[1]);
    if (logicalSizeMatch) stats.logicalSizeMB = parseFloat(logicalSizeMatch[1]);
    if (spaceRatioMatch) stats.spaceRatio = parseFloat(spaceRatioMatch[1]);
    if (dedupMatch) stats.savings.deduplicationMB = parseFloat(dedupMatch[1]);
    if (compressMatch) stats.savings.compressionMB = parseFloat(compressMatch[1]);
    if (incrementalMatch) stats.savings.incrementalMB = parseFloat(incrementalMatch[1]);
    
    return stats;
  }
  
  return null;
}

// Generate client code for browser integration
function generateClientCode() {
  // Get snapshot count and storage stats
  const storageStats = getStorageStats();
  const snapshotCount = storageStats ? storageStats.snapshotCount : 0;
  
  // Get latest snapshot ID
  const listResult = runAgent('list');
  let latestSnapshot = '';
  if (listResult.success && listResult.output) {
    const match = listResult.output.match(/✅ (snapshot_[0-9_]+)/);
    if (match) {
      latestSnapshot = match[1];
    }
  }
  
  // Safely stringify for embedding in JavaScript
  const safeJsonStorageStats = JSON.stringify(storageStats || {}).replace(/"/g, '\\"');
  
  // Generate code with template string
  return `// UI Safeguard Browser Integration
console.log("[UI Safeguard] Initializing browser integration");

const uiSafeguardData = {
  snapshotCount: ${snapshotCount},
  latestSnapshot: "${latestSnapshot}",
  storageStats: JSON.parse("${safeJsonStorageStats}"),
  enabled: true
};

// Add UI panel if enabled
if (${defaultOptions.showPanel}) {
  const panelStyles = document.createElement('style');
  panelStyles.textContent = \`
    #ui-safeguard-panel {
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(30, 30, 30, 0.9);
      color: white;
      border-radius: 5px;
      padding: 10px;
      font-family: system-ui, sans-serif;
      font-size: 12px;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      opacity: 0.7;
      transition: opacity 0.3s;
      max-width: 300px;
    }
    #ui-safeguard-panel:hover {
      opacity: 1;
    }
    #ui-safeguard-panel h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #ui-safeguard-panel button {
      background: #3a3a3a;
      border: none;
      border-radius: 3px;
      color: white;
      padding: 3px 8px;
      margin-left: 5px;
      cursor: pointer;
      font-size: 11px;
    }
    #ui-safeguard-panel button:hover {
      background: #4a4a4a;
    }
    #ui-safeguard-panel .stat {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    #ui-safeguard-panel .buttons {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
    }
    #ui-safeguard-panel .settings {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #555;
    }
    #ui-safeguard-panel .settings label {
      display: flex;
      align-items: center;
      margin-bottom: 4px;
    }
    #ui-safeguard-panel .settings input {
      margin-right: 5px;
    }
    #ui-safeguard-panel .toggle {
      position: absolute;
      top: 10px;
      right: 10px;
      cursor: pointer;
      font-size: 14px;
    }
    #ui-safeguard-panel.collapsed .content {
      display: none;
    }
  \`;
  document.head.appendChild(panelStyles);
  
  const panel = document.createElement('div');
  panel.id = 'ui-safeguard-panel';
  panel.innerHTML = \`
    <h3>
      UI Safeguard
      <div>
        <span class="toggle">-</span>
      </div>
    </h3>
    <div class="content">
      <div class="stat">
        <span>Snapshots:</span>
        <span>\${uiSafeguardData.snapshotCount}</span>
      </div>
      <div class="stat">
        <span>Latest:</span>
        <span>\${uiSafeguardData.latestSnapshot}</span>
      </div>
      <div class="stat">
        <span>Storage:</span>
        <span>\${uiSafeguardData.storageStats?.storageUsageMB?.toFixed(1) || 0} MB</span>
      </div>
      <div class="stat">
        <span>Space Ratio:</span>
        <span>\${uiSafeguardData.storageStats?.spaceRatio?.toFixed(1) || 0}x</span>
      </div>
      
      <div class="buttons">
        <button id="ui-safeguard-take-snapshot">Take Snapshot</button>
        <button id="ui-safeguard-restore">Restore</button>
      </div>
      
      <div class="settings">
        <label>
          <input type="checkbox" id="ui-safeguard-enabled" \${uiSafeguardData.enabled ? 'checked' : ''}>
          Enabled
        </label>
      </div>
    </div>
  \`;
  document.body.appendChild(panel);
  
  // Panel interactions
  document.querySelector('#ui-safeguard-panel .toggle').addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    document.querySelector('#ui-safeguard-panel .toggle').textContent = 
      panel.classList.contains('collapsed') ? '+' : '-';
  });
  
  // Take snapshot button
  document.querySelector('#ui-safeguard-take-snapshot').addEventListener('click', () => {
    console.log('[UI Safeguard] Taking snapshot requested');
    
    // Show a "working" notification
    showNotification('Taking Snapshot', 'Creating snapshot of all components...');
    
    // Use the full URL to ensure it works regardless of base path
    const serverUrl = window.location.origin;
    
    // Make the snapshot request with proper headers
    fetch(serverUrl + '/ui-safeguard/snapshot', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Server returned ' + response.status + ': ' + response.statusText);
        }
        return response.json();
      })
      .then(data => {
        console.log('[UI Safeguard] Snapshot created:', data);
        showNotification('Snapshot Created', 'Snapshot ' + data.snapshotId + ' created successfully');
        
        // Update the panel data
        uiSafeguardData.snapshotCount++;
        uiSafeguardData.latestSnapshot = data.snapshotId;
        
        // Update the display
        document.querySelectorAll('.stat').forEach(stat => {
          const label = stat.querySelector('span:first-child').textContent;
          if (label === 'Snapshots:') {
            stat.querySelector('span:last-child').textContent = uiSafeguardData.snapshotCount;
          } else if (label === 'Latest:') {
            stat.querySelector('span:last-child').textContent = uiSafeguardData.latestSnapshot;
          }
        });
      })
      .catch(error => {
        console.error('[UI Safeguard] Error taking snapshot:', error);
        showNotification('Snapshot Failed', 'Error: ' + error.message, 'error');
      });
  });
  
  // Restore button
  document.querySelector('#ui-safeguard-restore').addEventListener('click', () => {
    const snapshotId = prompt('Enter snapshot ID to restore:', uiSafeguardData.latestSnapshot);
    if (snapshotId) {
      console.log('[UI Safeguard] Restore requested for snapshot:', snapshotId);
      
      // Show a "working" notification
      showNotification('Restoring Snapshot', 'Restoring to snapshot ' + snapshotId + '...');
      
      // Use the full URL to ensure it works regardless of base path
      const serverUrl = window.location.origin;
      
      // Make the restore request with proper headers
      fetch(serverUrl + '/ui-safeguard/restore/' + snapshotId, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Server returned ' + response.status + ': ' + response.statusText);
          }
          return response.json();
        })
        .then(data => {
          console.log('[UI Safeguard] Restore result:', data);
          if (data.success) {
            showNotification('Restore Successful', 'Snapshot ' + snapshotId + ' restored successfully');
            // Reload the page to show the restored version
            setTimeout(() => window.location.reload(), 1000);
          } else {
            showNotification('Restore Failed', data.error || 'Unknown error', 'error');
          }
        })
        .catch(error => {
          console.error('[UI Safeguard] Error restoring snapshot:', error);
          showNotification('Restore Failed', 'Error: ' + error.message, 'error');
        });
    }
  });
  
  // Toggle enabled checkbox
  document.querySelector('#ui-safeguard-enabled').addEventListener('change', (event) => {
    uiSafeguardData.enabled = event.target.checked;
    console.log('[UI Safeguard] Enabled state changed:', uiSafeguardData.enabled);
    // This would connect to the server via WebSocket or fetch to update enabled state
    fetch('/ui-safeguard/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: uiSafeguardData.enabled })
    });
  });
}

// Browser notification function
function showNotification(title, message, type = 'info') {
  if (!${defaultOptions.browserNotifications}) return;
  
  // Use browser notification API if available and allowed
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { 
      body: message, 
      icon: type === 'error' ? 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23F44336" width="48px" height="48px"%3E%3Cpath d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/%3E%3C/svg%3E'
        : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234CAF50" width="48px" height="48px"%3E%3Cpath d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/%3E%3C/svg%3E'
    });
  } else {
    // Fallback to console
    console[type === 'error' ? 'error' : 'info']('[UI Safeguard] ' + title + ': ' + message);
    
    // Custom toast notification
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:60px;right:10px;background:' + 
      (type === 'error' ? '#F44336' : '#4CAF50') + 
      ';color:white;padding:10px 20px;border-radius:4px;font-family:system-ui,sans-serif;' +
      'box-shadow:0 2px 5px rgba(0,0,0,0.3);z-index:10000;transition:opacity 0.5s;';
    toast.innerHTML = '<strong>' + title + '</strong><div>' + message + '</div>';
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }
}

// Request notification permission
if ('Notification' in window && Notification.permission !== 'granted' && 
    Notification.permission !== 'denied') {
  // Delay request to avoid browser blocking automatic permission requests
  setTimeout(() => {
    Notification.requestPermission();
  }, 3000);
}

// Event listener for build complete
document.addEventListener('vite:buildComplete', (event) => {
  console.log('[UI Safeguard] Build completed:', event.detail);
  showNotification('Build complete', 'Application build completed successfully');
});

// Initial notification
console.log('[UI Safeguard] Browser integration initialized');
showNotification('UI Safeguard Active', 'Monitoring ' + uiSafeguardData.snapshotCount + ' snapshots');
`;
}

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
        // Log all requests to help with debugging
        console.log(`[UI Safeguard] Received ${req.method} request to ${req.url}`);
        
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
        
        // Snapshot endpoint
        if ((req.url === '/snapshot' || req.url === '/snapshot/') && req.method === 'POST') {
          console.log('[UI Safeguard] Taking snapshot from browser request');
          const result = takeSnapshot('all', 'Snapshot taken from browser');
          
          if (result.success) {
            // Extract snapshot ID from output
            const match = result.output.match(/Snapshot\s+(\S+)\s+created/);
            const snapshotId = match ? match[1] : 'unknown';
            
            console.log(`[UI Safeguard] Created snapshot: ${snapshotId}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, snapshotId }));
          } else {
            console.error('[UI Safeguard] Failed to create snapshot:', result.error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Failed to create snapshot' }));
          }
          return;
        }
        
        // Restore endpoint
        if (req.url.startsWith('/restore/') && req.method === 'POST') {
          const snapshotId = req.url.slice('/restore/'.length);
          console.log(`[UI Safeguard] Restoring snapshot: ${snapshotId}`);
          
          const result = runAgent('restore', [snapshotId]);
          
          if (result.success) {
            console.log(`[UI Safeguard] Successfully restored snapshot: ${snapshotId}`);
          } else {
            console.error(`[UI Safeguard] Failed to restore snapshot: ${snapshotId}`);
          }
          
          res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: result.success,
            error: result.success ? null : 'Failed to restore snapshot'
          }));
          return;
        }
        
        // Config endpoint
        if (req.url === '/config' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', () => {
            try {
              const config = JSON.parse(body);
              // Update plugin options
              if (config.hasOwnProperty('enabled')) {
                pluginOptions.enabled = config.enabled;
                console.log(`[UI Safeguard] Plugin ${pluginOptions.enabled ? 'enabled' : 'disabled'}`);
              }
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Invalid config' }));
            }
          });
          return;
        }
        
        // Stats endpoint
        if (req.url === '/stats' && req.method === 'GET') {
          const stats = getStorageStats();
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true,
            stats: stats || {}
          }));
          return;
        }
        
        next();
      });
      
      // Handle HMR
      if (server.hot) {
        server.hot.on('vite:beforeFullReload', () => {
          console.log('[UI Safeguard] Full reload detected');
          
          // Take snapshot if configured
          if (pluginOptions.snapshotOnBuild) {
            console.log('[UI Safeguard] Taking snapshot before reload...');
            takeSnapshot('all', 'Auto snapshot before reload');
          }
        });
      }
    },
    
    // Called on build start
    buildStart() {
      // Skip if disabled
      if (!pluginOptions.enabled) return;
      
      console.log('[UI Safeguard] Build started');
      
      // Take snapshot if configured
      if (pluginOptions.snapshotOnBuild) {
        console.log('[UI Safeguard] Taking snapshot before build...');
        takeSnapshot('all', 'Auto snapshot before build');
      }
    },
    
    // Called on build end
    closeBundle() {
      // Skip if disabled
      if (!pluginOptions.enabled) return;
      
      console.log('[UI Safeguard] Build completed');
      
      // Take snapshot if configured
      if (pluginOptions.snapshotOnBuild) {
        console.log('[UI Safeguard] Taking snapshot after build...');
        takeSnapshot('all', 'Auto snapshot after build');
      }
      
      // Verify if configured
      if (pluginOptions.verifyAfterBuild) {
        console.log('[UI Safeguard] Verifying UI components...');
        const result = runAgent('verify');
        if (result.success) {
          console.log('[UI Safeguard] Verification result:', result.success);
        }
      }
      
      // Cleanup storage if configured
      if (pluginOptions.storage.cleanupAfterBuild) {
        console.log('[UI Safeguard] Cleaning up storage...');
        runStorageManager('cleanup');
      }
    },
    
    // Transform hook to inject client code
    transformIndexHtml() {
      // Skip if disabled
      if (!pluginOptions.enabled) return;
      
      // Inject UI Safeguard browser code
      return [
        {
          tag: 'script',
          attrs: { type: 'module' },
          children: generateClientCode(),
          injectTo: 'body'
        }
      ];
    }
  };
}

export default uiSafeguardPlugin;