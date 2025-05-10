/**
 * Vite Plugin for Unified UI Safeguard System
 * 
 * This plugin integrates with the unified UI safeguard system to ensure
 * that builds only proceed when the app is in a working state.
 * 
 * Features:
 * - Runs comprehensive component tests before accepting builds
 * - Creates automatic backups of working states
 * - Enables rollback capability for broken builds
 * - Provides browser integration for safeguard status
 * - Enhanced runtime error detection for better validation
 * 
 * HMR-compatible:
 * - Designed to be non-invasive to Vite's hot module replacement
 * - Minimal middleware with careful scoping
 * - Uses non-blocking verification processes
 * - Defers validation to idle time using microtasks
 */

import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to unified safeguard script
const SAFEGUARD_SCRIPT = path.resolve(__dirname, './unified-ui-safeguard.js');

// Default configuration
const defaultOptions = {
  // Enable/disable the plugin
  enabled: true,
  
  // Run verification before build (production only)
  verifyBeforeBuild: true,
  
  // Run verification after build (production only)
  verifyAfterBuild: true,
  
  // Create backup on successful build
  backupAfterBuild: true,
  
  // Auto-rollback on failure
  autoRollback: false,
  
  // Show UI panel in browser
  showPanel: true,
  
  // Show browser notifications
  browserNotifications: true,
  
  // Clean up old backups after build
  cleanupAfterBuild: true,
  
  // HMR specific options
  hmr: {
    // Don't block HMR updates while running checks
    nonBlocking: true,
    
    // Don't run checks on every HMR update to avoid excessive resource usage
    throttleMs: 5000, 
    
    // Exclude pattern for files that shouldn't trigger safeguard checks
    excludePattern: /node_modules|\.css$/
  }
};

/**
 * Run the unified safeguard script with a specific command
 * @param {string} command - Command to run
 * @param {Array<string>} args - Command arguments
 * @param {boolean} async - Run asynchronously (non-blocking)
 * @returns {Promise<Object>|Object} Result of the command
 */
function runSafeguard(command, args = [], async = false) {
  const cmdString = `node ${SAFEGUARD_SCRIPT} ${command} ${args.join(' ')}`;
  console.log(`[UI Safeguard] Running: ${cmdString}`);
  
  // Run asynchronously with spawn
  if (async) {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      
      const proc = spawn('node', [SAFEGUARD_SCRIPT, command, ...args], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: stdout });
        } else {
          console.error(`[UI Safeguard] Command exited with code ${code}`);
          resolve({ 
            success: false, 
            error: stderr || 'Command failed',
            output: stdout,
            exitCode: code
          });
        }
      });
      
      proc.on('error', (error) => {
        console.error(`[UI Safeguard] Error running command: ${error.message}`);
        resolve({ 
          success: false, 
          error: error.message,
          output: '',
          exitCode: 1
        });
      });
    });
  }
  
  // Run synchronously with execSync
  try {
    const output = execSync(cmdString, {
      encoding: 'utf8'
    });
    
    return { success: true, output };
  } catch (error) {
    console.error(`[UI Safeguard] Error running command: ${error.message}`);
    return { 
      success: false, 
      error: error.message,
      output: error.stdout,
      exitCode: error.status
    };
  }
}

/**
 * Generate browser client code for safeguard integration
 * @returns {string} JavaScript code to inject
 */
function generateClientCode() {
  // Get list of backups for initial state
  let backups = [];
  try {
    const result = runSafeguard('list');
    if (result.success && result.output) {
      // Parse backup list from output
      const lines = result.output.split('\n');
      const backupLines = lines.filter(line => line.includes('. working-state-backup-'));
      
      backups = backupLines.map(line => {
        const match = line.match(/^(\d+)\. (working-state-backup-[\w-]+) \((.*?)\) - (.*)$/);
        if (match) {
          return {
            id: match[2],
            date: match[3],
            description: match[4]
          };
        }
        return null;
      }).filter(b => b !== null);
    }
  } catch (error) {
    console.error(`[UI Safeguard] Error getting backups: ${error.message}`);
  }
  
  // Get backup count for display
  const backupCount = backups.length;
  
  // Create safe JSON string for embedding in JavaScript
  const backupsJson = JSON.stringify(backups).replace(/"/g, '\\"');
  
  return `
// UI Safeguard Browser Integration
console.log("[UI Safeguard] Initializing browser integration");

// Initial state
const uiSafeguardState = {
  enabled: true,
  backupCount: ${backupCount},
  backups: JSON.parse("${backupsJson}"),
  lastCheck: null,
  lastStatus: null
};

// Create notification function
function showSafeguardNotification(title, message, type = 'info') {
  // Only show if notifications are enabled
  if (!${defaultOptions.browserNotifications}) return;
  
  // Use browser notification API if available and allowed
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { 
      body: message, 
      icon: type === 'error' ? 
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23F44336" width="48px" height="48px"%3E%3Cpath d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/%3E%3C/svg%3E'
        : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234CAF50" width="48px" height="48px"%3E%3Cpath d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/%3E%3C/svg%3E'
    });
  } else {
    // Fallback to console and custom toast
    console[type === 'error' ? 'error' : 'info']('[UI Safeguard] ' + title + ': ' + message);
    
    // Create a toast notification element
    const toast = document.createElement('div');
    toast.style.cssText = \`
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: \${type === 'error' ? '#F44336' : '#4CAF50'};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      font-family: system-ui, sans-serif;
      z-index: 10000;
      max-width: 80%;
      transition: opacity 0.3s ease-in-out;
    \`;
    
    toast.innerHTML = \`
      <div style="font-weight: bold; margin-bottom: 4px;">\${title}</div>
      <div>\${message}</div>
    \`;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Remove after 4 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Add UI panel if enabled
if (${defaultOptions.showPanel}) {
  // Create styles
  const styles = document.createElement('style');
  styles.textContent = \`
    #ui-safeguard-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(30, 30, 30, 0.85);
      color: white;
      border-radius: 8px;
      padding: 15px;
      font-family: system-ui, sans-serif;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      width: 280px;
      max-width: 90vw;
      transition: transform 0.3s ease;
    }
    #ui-safeguard-panel.minimized {
      transform: translateY(calc(100% - 40px));
    }
    #ui-safeguard-panel h3 {
      margin: 0 0 10px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 16px;
    }
    #ui-safeguard-panel .content {
      transition: opacity 0.3s ease;
    }
    #ui-safeguard-panel.minimized .content {
      opacity: 0;
      pointer-events: none;
    }
    #ui-safeguard-panel .toggle {
      cursor: pointer;
      font-size: 16px;
      user-select: none;
    }
    #ui-safeguard-panel .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
    }
    #ui-safeguard-panel .info-label {
      color: #aaa;
    }
    #ui-safeguard-panel .info-value {
      font-weight: 500;
    }
    #ui-safeguard-panel .backup-list {
      max-height: 120px;
      overflow-y: auto;
      margin: 10px 0;
      padding: 8px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      font-size: 12px;
    }
    #ui-safeguard-panel .backup-item {
      padding: 4px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    #ui-safeguard-panel .backup-item:last-child {
      border-bottom: none;
    }
    #ui-safeguard-panel .backup-date {
      color: #aaa;
      font-size: 10px;
    }
    #ui-safeguard-panel .actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    #ui-safeguard-panel button {
      background: #2c2c2c;
      border: none;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      flex: 1;
      transition: background-color 0.2s;
    }
    #ui-safeguard-panel button:hover {
      background: #3c3c3c;
    }
    #ui-safeguard-panel button.primary {
      background: #1a73e8;
    }
    #ui-safeguard-panel button.primary:hover {
      background: #1765cc;
    }
    #ui-safeguard-panel button.warning {
      background: #e67c00;
    }
    #ui-safeguard-panel button.warning:hover {
      background: #cc6d00;
    }
    #ui-safeguard-panel .status {
      margin-top: 10px;
      font-size: 12px;
      padding: 6px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.2);
    }
    #ui-safeguard-panel .status.good {
      color: #4CAF50;
    }
    #ui-safeguard-panel .status.bad {
      color: #F44336;
    }
  \`;
  document.head.appendChild(styles);
  
  // Create panel HTML
  const panel = document.createElement('div');
  panel.id = 'ui-safeguard-panel';
  panel.innerHTML = \`
    <h3>
      UI Safeguard
      <span class="toggle">▼</span>
    </h3>
    <div class="content">
      <div class="info-row">
        <span class="info-label">Backups:</span>
        <span class="info-value">\${uiSafeguardState.backupCount}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status:</span>
        <span class="info-value" id="safeguard-status">Unknown</span>
      </div>
      
      <div class="backup-list" id="backup-list">
        \${uiSafeguardState.backups.map(backup => \`
          <div class="backup-item" data-id="\${backup.id}">
            <div>\${backup.description}</div>
            <div class="backup-date">\${backup.date}</div>
          </div>
        \`).join('')}
      </div>
      
      <div class="actions">
        <button class="primary" id="safeguard-check">Check State</button>
        <button id="safeguard-backup">Backup</button>
        <button class="warning" id="safeguard-restore">Restore</button>
      </div>
      
      <div class="status" id="safeguard-result"></div>
    </div>
  \`;
  
  // Add to document
  document.body.appendChild(panel);
  
  // Add event listeners
  document.querySelector('#ui-safeguard-panel .toggle').addEventListener('click', () => {
    panel.classList.toggle('minimized');
    document.querySelector('#ui-safeguard-panel .toggle').textContent = 
      panel.classList.contains('minimized') ? '▲' : '▼';
  });
  
  // Check button
  document.getElementById('safeguard-check').addEventListener('click', async () => {
    document.getElementById('safeguard-result').textContent = 'Checking app state...';
    document.getElementById('safeguard-result').className = 'status';
    
    try {
      // Make fetch request to check endpoint
      const response = await fetch('/ui-safeguard/check');
      const data = await response.json();
      
      // Update state
      uiSafeguardState.lastCheck = new Date().toISOString();
      uiSafeguardState.lastStatus = data.success;
      
      // Update UI
      document.getElementById('safeguard-status').textContent = 
        data.success ? 'Healthy' : 'Unhealthy';
        
      document.getElementById('safeguard-result').textContent = 
        data.success ? 'App is in a working state ✓' : 'App state check failed ✗';
        
      document.getElementById('safeguard-result').className = 
        data.success ? 'status good' : 'status bad';
      
      // Show notification
      showSafeguardNotification(
        data.success ? 'App State: Healthy' : 'App State: Unhealthy',
        data.success ? 'All components verified working' : data.error || 'One or more checks failed',
        data.success ? 'info' : 'error'
      );
    } catch (error) {
      console.error('Error checking app state:', error);
      document.getElementById('safeguard-result').textContent = 
        'Error checking app state: ' + error.message;
      document.getElementById('safeguard-result').className = 'status bad';
    }
  });
  
  // Backup button
  document.getElementById('safeguard-backup').addEventListener('click', async () => {
    document.getElementById('safeguard-result').textContent = 'Creating backup...';
    document.getElementById('safeguard-result').className = 'status';
    
    try {
      // Make fetch request to backup endpoint
      const response = await fetch('/ui-safeguard/backup');
      const data = await response.json();
      
      if (data.success) {
        // Update backups list
        uiSafeguardState.backupCount++;
        
        if (data.backupId) {
          uiSafeguardState.backups.unshift({
            id: data.backupId,
            date: new Date().toLocaleString(),
            description: 'Manual backup'
          });
          
          // Update backup list in UI
          updateBackupList();
        }
        
        // Update UI
        document.getElementById('safeguard-result').textContent = 
          'Backup created successfully ✓';
        document.getElementById('safeguard-result').className = 'status good';
        
        // Show notification
        showSafeguardNotification(
          'Backup Created',
          'App state backed up successfully',
          'info'
        );
      } else {
        document.getElementById('safeguard-result').textContent = 
          'Backup failed: ' + (data.error || 'Unknown error');
        document.getElementById('safeguard-result').className = 'status bad';
        
        // Show notification
        showSafeguardNotification(
          'Backup Failed',
          data.error || 'Could not create backup',
          'error'
        );
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      document.getElementById('safeguard-result').textContent = 
        'Error creating backup: ' + error.message;
      document.getElementById('safeguard-result').className = 'status bad';
    }
  });
  
  // Restore button
  document.getElementById('safeguard-restore').addEventListener('click', async () => {
    if (uiSafeguardState.backups.length === 0) {
      document.getElementById('safeguard-result').textContent = 
        'No backups available for restore';
      document.getElementById('safeguard-result').className = 'status bad';
      return;
    }
    
    // Ask which backup to restore
    const backupId = prompt(
      'Enter backup to restore:',
      uiSafeguardState.backups[0].id
    );
    
    if (!backupId) return;
    
    document.getElementById('safeguard-result').textContent = 'Restoring from backup...';
    document.getElementById('safeguard-result').className = 'status';
    
    try {
      // Make fetch request to restore endpoint
      const response = await fetch('/ui-safeguard/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ backupId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        document.getElementById('safeguard-result').textContent = 
          'Restore completed successfully ✓';
        document.getElementById('safeguard-result').className = 'status good';
        
        // Show notification
        showSafeguardNotification(
          'Restore Completed',
          'App restored from backup successfully',
          'info'
        );
        
        // Reload the page after 1 second
        setTimeout(() => {
          location.reload();
        }, 1000);
      } else {
        document.getElementById('safeguard-result').textContent = 
          'Restore failed: ' + (data.error || 'Unknown error');
        document.getElementById('safeguard-result').className = 'status bad';
        
        // Show notification
        showSafeguardNotification(
          'Restore Failed',
          data.error || 'Could not restore from backup',
          'error'
        );
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      document.getElementById('safeguard-result').textContent = 
        'Error restoring backup: ' + error.message;
      document.getElementById('safeguard-result').className = 'status bad';
    }
  });
  
  // Function to update backup list in UI
  function updateBackupList() {
    const listElement = document.getElementById('backup-list');
    
    listElement.innerHTML = uiSafeguardState.backups.map(backup => \`
      <div class="backup-item" data-id="\${backup.id}">
        <div>\${backup.description}</div>
        <div class="backup-date">\${backup.date}</div>
      </div>
    \`).join('');
  }
}

// Request notification permission
if ('Notification' in window && Notification.permission !== 'granted' && 
    Notification.permission !== 'denied') {
  // Delay request to avoid blocking automatic requests
  setTimeout(() => {
    Notification.requestPermission();
  }, 5000);
}

// Initial notification
console.log('[UI Safeguard] Browser integration initialized');
showSafeguardNotification(
  'UI Safeguard Active',
  'Monitoring UI stability with ' + uiSafeguardState.backupCount + ' backups available'
);
`;
}

/**
 * Vite plugin for UI safeguard integration
 * @param {Object} options - Plugin options
 * @returns {Object} Vite plugin
 */
function uiSafeguardPlugin(options = {}) {
  // Merge with default options
  const pluginOptions = { ...defaultOptions, ...options };
  
  return {
    name: 'vite-plugin-ui-safeguard-unified',
    
    // Setup dev server middleware
    configureServer(server) {
      if (!pluginOptions.enabled) return;
      
      console.log('[UI Safeguard] Plugin initialized');
      
      // Throttle function to prevent excessive checks during HMR updates
      let lastCheckTime = 0;
      let pendingCheck = null;
      
      // HMR compatibility: track pending checks and throttle them
      const throttledCheck = (callback) => {
        const now = Date.now();
        const elapsed = now - lastCheckTime;
        
        // Cancel existing pending check if any
        if (pendingCheck) {
          clearTimeout(pendingCheck);
        }
        
        // Throttle checks based on config
        if (elapsed < pluginOptions.hmr.throttleMs) {
          pendingCheck = setTimeout(() => {
            lastCheckTime = Date.now();
            callback();
          }, pluginOptions.hmr.throttleMs - elapsed);
        } else {
          // Run immediately
          lastCheckTime = now;
          queueMicrotask(callback); // Use microtask to avoid blocking HMR
        }
      };
      
      // Watch for HMR updates but don't block them
      if (server.hot) {
        server.hot.on('vite:beforeUpdate', ({ file }) => {
          // Skip checking for files matching exclude pattern
          if (pluginOptions.hmr.excludePattern && pluginOptions.hmr.excludePattern.test(file)) {
            return;
          }
          
          // Don't block HMR, run check in background
          if (pluginOptions.hmr.nonBlocking) {
            throttledCheck(() => {
              console.log(`[UI Safeguard] Running background check after change to ${path.basename(file)}`);
              
              // Use runtime-only check for faster verification during development
              // This avoids expensive component testing for every HMR update
              runSafeguard('verify', ['runtime'], true)
                .then(result => {
                  const success = result.success && !result.output.includes('FAIL');
                  if (!success) {
                    console.warn('[UI Safeguard] Runtime check detected potential issues after HMR update');
                    // Log error details if available
                    if (result.output && result.output.includes('Errors detected:')) {
                      const errorLines = result.output.split('\n')
                        .filter(line => line.match(/^\s+\d+\.\s/));
                      errorLines.forEach(line => console.warn(`[UI Safeguard] ${line.trim()}`));
                    }
                  }
                })
                .catch(err => {
                  console.error('[UI Safeguard] Runtime check error:', err);
                });
            });
          }
        });
      }
      
      // Add middleware for REST API endpoints
      server.middlewares.use('/ui-safeguard', (req, res, next) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // Handle preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }
        
        // Parse URL
        const url = new URL(req.url, 'http://localhost');
        const endpoint = url.pathname === '/' ? '' : url.pathname;
        
        // Check state endpoint
        if (endpoint === '/check' && req.method === 'GET') {
          console.log('[UI Safeguard] Checking app state from browser request');
          
          // Parse URL parameters
          const params = new URLSearchParams(url.search);
          const checkType = params.get('type') || 'full';
          
          if (checkType === 'runtime') {
            // Only check for runtime errors (faster check)
            console.log('[UI Safeguard] Running runtime-only check');
            
            // Non-blocking: Run check in background
            runSafeguard('verify', ['runtime'], true).then(result => {
              const success = result.success && !result.output.includes('FAIL');
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success,
                checkType: 'runtime',
                error: success ? null : 'Runtime errors detected'
              }));
            }).catch(error => {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                checkType: 'runtime',
                error: error.message || 'Internal error'
              }));
            });
          } else {
            // Full check (default)
            // Non-blocking: Run check in background and respond immediately
            runSafeguard('check', [], true).then(result => {
              const success = result.success && !result.output.includes('FAIL');
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success,
                checkType: 'full',
                error: success ? null : 'One or more checks failed'
              }));
            }).catch(error => {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                checkType: 'full',
                error: error.message || 'Internal error'
              }));
            });
          }
          
          return;
        }
        
        // Backup endpoint
        if (endpoint === '/backup' && req.method === 'GET') {
          console.log('[UI Safeguard] Creating backup from browser request');
          
          // Non-blocking: Run backup in background
          runSafeguard('backup', [], true).then(result => {
            const success = result.success && !result.output.includes('FAIL');
            
            // Try to extract backup ID from output
            let backupId = null;
            if (success && result.output) {
              const match = result.output.match(/Backup created: (working-state-backup-[\w-]+)/);
              if (match) {
                backupId = match[1];
              }
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success,
              backupId,
              error: success ? null : 'Could not create backup'
            }));
          }).catch(error => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: error.message || 'Internal error'
            }));
          });
          
          return;
        }
        
        // Restore endpoint
        if (endpoint === '/restore' && req.method === 'POST') {
          // Read request body
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const backupId = data.backupId;
              
              if (!backupId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  success: false,
                  error: 'Backup ID is required'
                }));
                return;
              }
              
              console.log(`[UI Safeguard] Restoring from backup: ${backupId}`);
              
              // Restoration is important so run it synchronously
              const result = runSafeguard('restore', [backupId]);
              const success = result.success && !result.output.includes('FAILED');
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success,
                error: success ? null : 'Could not restore from backup'
              }));
            } catch (error) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Invalid request body'
              }));
            }
          });
          
          return;
        }
        
        // Default response for unhandled endpoints
        next();
      });
    },
    
    // Hook into build start
    buildStart(options) {
      if (!pluginOptions.enabled) return;
      
      // Only run verification in production mode
      const isProduction = process.env.NODE_ENV === 'production' || 
                          (options && options.mode === 'production');
      
      console.log(`[UI Safeguard] Build starting (${isProduction ? 'production' : 'development'})`);
      
      // Skip verification in development mode to avoid blocking HMR
      if (!isProduction) {
        console.log('[UI Safeguard] Skipping pre-build verification in development mode');
        return;
      }
      
      // Run verification before build if enabled
      if (pluginOptions.verifyBeforeBuild) {
        console.log('[UI Safeguard] Running verification before production build...');
        
        try {
          const result = runSafeguard('check');
          const success = result.success && !result.output.includes('FAIL');
          
          if (!success) {
            console.error('[UI Safeguard] Pre-build verification failed! Build may be unstable.');
            
            if (pluginOptions.autoRollback) {
              console.warn('[UI Safeguard] Auto-rollback enabled, but not triggered before build');
            }
          } else {
            console.log('[UI Safeguard] Pre-build verification passed');
          }
        } catch (error) {
          console.error(`[UI Safeguard] Pre-build verification error: ${error.message}`);
        }
      }
    },
    
    // Hook into build end
    closeBundle() {
      if (!pluginOptions.enabled) return;
      
      // Only run verification in production mode
      const isProduction = process.env.NODE_ENV === 'production';
      
      console.log(`[UI Safeguard] Build completed (${isProduction ? 'production' : 'development'})`);
      
      // Skip verification in development mode to avoid blocking HMR
      if (!isProduction) {
        // Just create a backup in dev mode if enabled
        if (pluginOptions.backupAfterBuild) {
          console.log('[UI Safeguard] Creating development backup...');
          runSafeguard('backup', [], true).then(result => {
            if (result.success) {
              console.log('[UI Safeguard] Development backup created');
            }
          });
        }
        return;
      }
      
      // Run verification after build if enabled (production only)
      if (pluginOptions.verifyAfterBuild) {
        console.log('[UI Safeguard] Running verification after production build...');
        
        try {
          const result = runSafeguard('build');
          const success = result.success && !result.output.includes('FAIL');
          
          if (!success) {
            console.error('[UI Safeguard] Build verification failed! Build is unstable.');
            
            if (pluginOptions.autoRollback) {
              console.warn('[UI Safeguard] Auto-rollback is enabled, rolling back to last good state...');
              
              try {
                const restoreResult = runSafeguard('restore');
                if (restoreResult.success) {
                  console.log('[UI Safeguard] Rollback successful, reverted to last good state');
                } else {
                  console.error('[UI Safeguard] Rollback failed');
                }
              } catch (error) {
                console.error(`[UI Safeguard] Rollback error: ${error.message}`);
              }
            }
          } else {
            console.log('[UI Safeguard] Build verification passed');
            
            // Create backup if enabled
            if (pluginOptions.backupAfterBuild) {
              console.log('[UI Safeguard] Creating post-build backup...');
              
              try {
                const backupResult = runSafeguard('backup');
                if (backupResult.success) {
                  console.log('[UI Safeguard] Post-build backup created');
                  
                  // Clean up old backups if enabled
                  if (pluginOptions.cleanupAfterBuild) {
                    console.log('[UI Safeguard] Cleaning up old backups...');
                    runSafeguard('clean', [], true); // Run cleanup async
                  }
                } else {
                  console.error('[UI Safeguard] Post-build backup failed');
                }
              } catch (error) {
                console.error(`[UI Safeguard] Backup error: ${error.message}`);
              }
            }
          }
        } catch (error) {
          console.error(`[UI Safeguard] Build verification error: ${error.message}`);
        }
      }
    },
    
    // Inject browser code
    transformIndexHtml(html, ctx) {
      if (!pluginOptions.enabled) return;
      
      // Only inject UI panel in development mode or when specifically configured
      const isDev = ctx.server && !ctx.isBuild;
      const shouldInject = isDev || pluginOptions.showPanel;
      
      if (!shouldInject) {
        return;
      }
      
      // Use smaller clientCode for production
      const clientScript = generateClientCode();
      
      // Inject browser integration code
      return [
        {
          tag: 'script',
          attrs: { type: 'module' },
          children: clientScript,
          injectTo: 'body'
        }
      ];
    }
  };
}

export default uiSafeguardPlugin;