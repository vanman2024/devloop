/**
 * Standalone UI Safeguard System
 * 
 * This is a standalone implementation of the UI Safeguard system that works
 * alongside Vite without integrating as a plugin. It offers snapshot, restore,
 * and verification capabilities in a separate process.
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

// Get the current file's directory (ES module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  port: 8090, // Different from Vite's port
  componentsDir: path.resolve(process.cwd(), 'src/components'),
  snapshotsDir: path.resolve(process.cwd(), '../../agents/system-health-agent/child-agents/ui-safeguard-agent/snapshots'),
  maxSnapshots: 50,
  snapshotOnChange: true,
  autoVerify: true
};

// Create directories if they don't exist
if (!fs.existsSync(config.snapshotsDir)) {
  fs.mkdirSync(config.snapshotsDir, { recursive: true });
}

// Promisify exec
const execAsync = promisify(exec);

// Helper: List all files in a directory recursively
function listFilesRecursive(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Helper: Copy directory recursively
function copyDirectoryRecursive(source, destination, excludes = []) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }
  
  const entries = fs.readdirSync(source, { withFileTypes: true });
  
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    
    // Skip excluded files/directories
    if (excludes.includes(entry.name)) continue;
    
    if (entry.isDirectory()) {
      copyDirectoryRecursive(sourcePath, destPath, excludes);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

// Create a snapshot
async function createSnapshot(description = '') {
  try {
    if (!fs.existsSync(config.componentsDir)) {
      return { success: false, error: 'Components directory not found' };
    }
    
    // Generate snapshot ID
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotId = `snapshot_${timestamp}`;
    const snapshotDir = path.join(config.snapshotsDir, snapshotId);
    
    // Create snapshot directory
    fs.mkdirSync(snapshotDir, { recursive: true });
    
    // Copy components to snapshot
    copyDirectoryRecursive(config.componentsDir, snapshotDir);
    
    // Write metadata
    const metadata = {
      id: snapshotId,
      timestamp: new Date().toISOString(),
      description,
      componentsPath: config.componentsDir
    };
    
    fs.writeFileSync(
      path.join(snapshotDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    // Manage snapshots
    manageSnapshots();
    
    console.log(`[UI Safeguard] Created snapshot: ${snapshotId}`);
    return { success: true, snapshotId };
  } catch (error) {
    console.error('[UI Safeguard] Error creating snapshot:', error);
    return { success: false, error: error.message };
  }
}

// Restore from a snapshot
async function restoreSnapshot(snapshotId) {
  try {
    const snapshotDir = path.join(config.snapshotsDir, snapshotId);
    
    // Check if snapshot exists
    if (!fs.existsSync(snapshotDir)) {
      return { success: false, error: `Snapshot ${snapshotId} not found` };
    }
    
    // Create backup of current state
    const backupId = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const backupDir = path.join(config.snapshotsDir, backupId);
    
    if (fs.existsSync(config.componentsDir)) {
      // Backup current components
      fs.mkdirSync(backupDir, { recursive: true });
      copyDirectoryRecursive(config.componentsDir, backupDir);
      
      // Write backup metadata
      const metadata = {
        id: backupId,
        timestamp: new Date().toISOString(),
        description: 'Auto backup before restore',
        componentsPath: config.componentsDir
      };
      
      fs.writeFileSync(
        path.join(backupDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
    }
    
    // Ensure components directory exists
    if (!fs.existsSync(config.componentsDir)) {
      fs.mkdirSync(config.componentsDir, { recursive: true });
    } else {
      // Clear components directory
      const files = fs.readdirSync(config.componentsDir);
      for (const file of files) {
        const filePath = path.join(config.componentsDir, file);
        try {
          if (fs.lstatSync(filePath).isDirectory()) {
            fs.rmSync(filePath, { recursive: true });
          } else {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error(`[UI Safeguard] Error removing ${filePath}:`, err);
        }
      }
    }
    
    // Copy snapshot to components directory (excluding metadata.json)
    const files = fs.readdirSync(snapshotDir);
    for (const file of files) {
      if (file === 'metadata.json') continue;
      
      const sourcePath = path.join(snapshotDir, file);
      const destPath = path.join(config.componentsDir, file);
      
      if (fs.lstatSync(sourcePath).isDirectory()) {
        copyDirectoryRecursive(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
    
    console.log(`[UI Safeguard] Restored from snapshot: ${snapshotId}`);
    console.log(`[UI Safeguard] Created backup: ${backupId}`);
    
    return { 
      success: true, 
      snapshotId,
      backupId
    };
  } catch (error) {
    console.error('[UI Safeguard] Error restoring snapshot:', error);
    return { success: false, error: error.message };
  }
}

// List available snapshots
async function listSnapshots() {
  try {
    if (!fs.existsSync(config.snapshotsDir)) {
      return { success: true, snapshots: [] };
    }
    
    const snapshots = [];
    const dirs = fs.readdirSync(config.snapshotsDir);
    
    for (const dir of dirs) {
      if (dir.startsWith('snapshot_')) {
        const metadataPath = path.join(config.snapshotsDir, dir, 'metadata.json');
        
        if (fs.existsSync(metadataPath)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
            snapshots.push(metadata);
          } catch (err) {
            console.error(`[UI Safeguard] Error reading metadata for ${dir}:`, err);
            // Add basic info if metadata is corrupted
            snapshots.push({
              id: dir,
              timestamp: dir.replace('snapshot_', '').replace(/-/g, ':'),
              description: 'Metadata unavailable'
            });
          }
        } else {
          // Add basic info if metadata is missing
          snapshots.push({
            id: dir,
            timestamp: dir.replace('snapshot_', '').replace(/-/g, ':'),
            description: 'No metadata'
          });
        }
      }
    }
    
    // Sort by timestamp, newest first
    snapshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return { success: true, snapshots };
  } catch (error) {
    console.error('[UI Safeguard] Error listing snapshots:', error);
    return { success: false, error: error.message };
  }
}

// Verify UI components
async function verifyComponents() {
  try {
    if (!fs.existsSync(config.componentsDir)) {
      return { success: false, error: 'Components directory not found' };
    }
    
    // Get list of component files
    const files = listFilesRecursive(config.componentsDir)
      .filter(file => file.endsWith('.jsx') || file.endsWith('.tsx'));
    
    if (files.length === 0) {
      return { success: false, error: 'No component files found' };
    }
    
    // Basic verification: check for React imports
    const issues = [];
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Check if file contains React import
      const hasReactImport = content.includes('import React') || 
                            content.includes('from "react"') || 
                            content.includes("from 'react'");
                            
      // Check if file has a component definition
      const hasComponentDef = content.includes('function ') && 
                             (content.includes('return (') || content.includes('return <'));
      
      if (!hasReactImport || !hasComponentDef) {
        issues.push({
          file: path.relative(process.cwd(), file),
          issues: [
            ...(!hasReactImport ? ['Missing React import'] : []),
            ...(!hasComponentDef ? ['No component definition found'] : [])
          ]
        });
      }
    }
    
    return {
      success: issues.length === 0,
      totalComponents: files.length,
      issueCount: issues.length,
      issues
    };
  } catch (error) {
    console.error('[UI Safeguard] Error verifying components:', error);
    return { success: false, error: error.message };
  }
}

// Manage snapshots (rotate out old ones)
function manageSnapshots() {
  try {
    if (!fs.existsSync(config.snapshotsDir)) return;
    
    const dirs = fs.readdirSync(config.snapshotsDir)
      .filter(dir => dir.startsWith('snapshot_'))
      .map(dir => {
        const metadataPath = path.join(config.snapshotsDir, dir, 'metadata.json');
        let timestamp;
        
        if (fs.existsSync(metadataPath)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
            timestamp = new Date(metadata.timestamp);
          } catch (e) {
            // If metadata is corrupted, use the directory name
            timestamp = new Date(dir.replace('snapshot_', '').replace(/-/g, ':'));
          }
        } else {
          // If metadata is missing, use the directory name
          timestamp = new Date(dir.replace('snapshot_', '').replace(/-/g, ':'));
        }
        
        return { dir, timestamp };
      });
    
    // Sort by timestamp (oldest first)
    dirs.sort((a, b) => a.timestamp - b.timestamp);
    
    // Delete excess snapshots
    if (dirs.length > config.maxSnapshots) {
      const toDelete = dirs.slice(0, dirs.length - config.maxSnapshots);
      
      for (const { dir } of toDelete) {
        const snapshotDir = path.join(config.snapshotsDir, dir);
        fs.rmSync(snapshotDir, { recursive: true, force: true });
        console.log(`[UI Safeguard] Removed old snapshot: ${dir}`);
      }
    }
  } catch (error) {
    console.error('[UI Safeguard] Error managing snapshots:', error);
  }
}

// Watch for file changes
function watchComponents() {
  if (!config.snapshotOnChange) return;
  
  try {
    if (!fs.existsSync(config.componentsDir)) {
      fs.mkdirSync(config.componentsDir, { recursive: true });
    }
    
    // Use native fs.watch for simplicity
    const watcher = fs.watch(config.componentsDir, { recursive: true }, async (eventType, filename) => {
      if (!filename) return;
      
      // Only snapshot on real file changes (not deletions)
      if (eventType === 'change' && 
          (filename.endsWith('.jsx') || filename.endsWith('.tsx') || filename.endsWith('.js'))) {
        console.log(`[UI Safeguard] File changed: ${filename}`);
        await createSnapshot(`Auto snapshot on file change: ${filename}`);
        
        if (config.autoVerify) {
          const verifyResult = await verifyComponents();
          if (!verifyResult.success) {
            console.warn('[UI Safeguard] Verification failed after file change:', verifyResult.issues);
          }
        }
      }
    });
    
    // Handle watcher errors
    watcher.on('error', error => {
      console.error('[UI Safeguard] Watch error:', error);
    });
    
    console.log(`[UI Safeguard] Watching for changes in: ${config.componentsDir}`);
    return watcher;
  } catch (error) {
    console.error('[UI Safeguard] Error setting up file watcher:', error);
    return null;
  }
}

// Start HTTP server for API
function startServer() {
  const server = http.createServer(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    // Helper for JSON responses
    const sendJSON = (data, statusCode = 200) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };
    
    // Extract path and query
    const url = new URL(req.url, `http://localhost:${config.port}`);
    const path = url.pathname;
    
    try {
      // Handle different endpoints
      if (path === '/snapshot' && req.method === 'POST') {
        // Handle request body
        let body = '';
        req.on('data', chunk => { body += chunk; });
        
        req.on('end', async () => {
          try {
            const data = body ? JSON.parse(body) : {};
            const result = await createSnapshot(data.description || 'Manual snapshot');
            sendJSON(result);
          } catch (error) {
            sendJSON({ success: false, error: error.message }, 400);
          }
        });
        
        return;
      }
      
      if (path.startsWith('/restore/') && req.method === 'POST') {
        const snapshotId = path.slice('/restore/'.length);
        const result = await restoreSnapshot(snapshotId);
        sendJSON(result);
        return;
      }
      
      if (path === '/list' && req.method === 'GET') {
        const result = await listSnapshots();
        sendJSON(result);
        return;
      }
      
      if (path === '/verify' && req.method === 'GET') {
        const result = await verifyComponents();
        sendJSON(result);
        return;
      }
      
      if (path === '/status' || path === '/') {
        const result = {
          system: 'UI Safeguard',
          status: 'active',
          config: {
            ...config,
            // Don't expose full paths in status response
            componentsDir: config.componentsDir,
            snapshotsDir: config.snapshotsDir
          },
          snapshots: (await listSnapshots()).snapshots?.length || 0
        };
        
        sendJSON(result);
        return;
      }
      
      // Route not found
      sendJSON({ error: 'Not Found' }, 404);
    } catch (error) {
      console.error('[UI Safeguard] Server error:', error);
      sendJSON({ error: 'Internal Server Error' }, 500);
    }
  });
  
  server.listen(config.port, () => {
    console.log(`[UI Safeguard] Server running at http://localhost:${config.port}`);
  });
  
  server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[UI Safeguard] Port ${config.port} is already in use.`);
      process.exit(1);
    } else {
      console.error('[UI Safeguard] Server error:', error);
    }
  });
  
  return server;
}

// Generate HTML for UI Safeguard Panel
function generateUIPanel() {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>UI Safeguard Panel</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
      color: #333;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    header {
      background: #4b5563;
      color: white;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    h1 {
      margin: 0;
      font-size: 24px;
    }
    
    main {
      padding: 20px;
    }
    
    .card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 20px;
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .card-title {
      font-size: 18px;
      font-weight: bold;
      margin: 0;
    }
    
    button {
      background: #4b5563;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    
    button:hover {
      background: #374151;
    }
    
    .green-button {
      background: #10b981;
    }
    
    .green-button:hover {
      background: #059669;
    }
    
    .snapshot-list {
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      max-height: 300px;
      overflow-y: auto;
    }
    
    .snapshot-item {
      padding: 10px 15px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .snapshot-item:last-child {
      border-bottom: none;
    }
    
    .snapshot-info {
      flex: 1;
    }
    
    .snapshot-title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .snapshot-date {
      font-size: 12px;
      color: #6b7280;
    }
    
    .snapshot-description {
      font-size: 14px;
      color: #4b5563;
    }
    
    .snapshot-actions {
      display: flex;
      gap: 5px;
    }
    
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: bold;
    }
    
    .success {
      background: #d1fae5;
      color: #065f46;
    }
    
    .warning {
      background: #fef3c7;
      color: #92400e;
    }
    
    .error {
      background: #fee2e2;
      color: #b91c1c;
    }
    
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #6b7280;
    }
    
    #status {
      text-align: right;
      font-size: 14px;
      margin-top: 10px;
    }
    
    .timestamp {
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Devloop UI Safeguard Panel</h1>
      <span id="status-badge" class="badge success">System Active</span>
    </header>
    
    <main>
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Snapshots</h2>
          <button id="take-snapshot" class="green-button">Take Snapshot</button>
        </div>
        
        <div id="snapshots" class="snapshot-list">
          <div class="snapshot-item">
            <div class="snapshot-info">
              <div class="snapshot-title">Loading snapshots...</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Component Verification</h2>
          <button id="verify-components">Verify Components</button>
        </div>
        
        <div id="verification-result">
          No verification has been run yet.
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">System Status</h2>
        </div>
        
        <div id="system-info">
          Loading system information...
        </div>
      </div>
    </main>
    
    <div class="footer">
      UI Safeguard System • <span id="current-time"></span>
    </div>
  </div>
  
  <script>
    // API endpoints
    const API_URL = 'http://localhost:${config.port}';
    
    // Update timestamp
    function updateTimestamp() {
      document.getElementById('current-time').textContent = new Date().toLocaleString();
    }
    
    // Format date
    function formatDate(dateString) {
      return new Date(dateString).toLocaleString();
    }
    
    // Load snapshots
    async function loadSnapshots() {
      try {
        const response = await fetch(\`\${API_URL}/list\`);
        const data = await response.json();
        
        if (data.success && data.snapshots) {
          const snapshotsContainer = document.getElementById('snapshots');
          
          if (data.snapshots.length === 0) {
            snapshotsContainer.innerHTML = \`
              <div class="snapshot-item">
                <div class="snapshot-info">
                  <div class="snapshot-title">No snapshots available</div>
                  <div class="snapshot-description">Create your first snapshot using the button above</div>
                </div>
              </div>
            \`;
            return;
          }
          
          snapshotsContainer.innerHTML = data.snapshots.map(snapshot => \`
            <div class="snapshot-item">
              <div class="snapshot-info">
                <div class="snapshot-title">\${snapshot.id}</div>
                <div class="snapshot-date">\${formatDate(snapshot.timestamp)}</div>
                <div class="snapshot-description">\${snapshot.description || 'No description'}</div>
              </div>
              <div class="snapshot-actions">
                <button class="restore-button" data-id="\${snapshot.id}">Restore</button>
              </div>
            </div>
          \`).join('');
          
          // Add event listeners to restore buttons
          document.querySelectorAll('.restore-button').forEach(button => {
            button.addEventListener('click', () => restoreSnapshot(button.dataset.id));
          });
        } else {
          console.error('Failed to load snapshots:', data.error);
        }
      } catch (error) {
        console.error('Error loading snapshots:', error);
      }
    }
    
    // Create snapshot
    async function takeSnapshot() {
      try {
        const description = prompt('Enter a description for this snapshot:');
        if (description === null) return; // User cancelled
        
        const response = await fetch(\`\${API_URL}/snapshot\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ description })
        });
        
        const data = await response.json();
        
        if (data.success) {
          alert(\`Snapshot created: \${data.snapshotId}\`);
          loadSnapshots();
        } else {
          alert(\`Failed to create snapshot: \${data.error}\`);
        }
      } catch (error) {
        console.error('Error taking snapshot:', error);
        alert(\`Error: \${error.message}\`);
      }
    }
    
    // Restore snapshot
    async function restoreSnapshot(snapshotId) {
      try {
        if (!confirm(\`Are you sure you want to restore snapshot \${snapshotId}? This will overwrite current components.\`)) {
          return;
        }
        
        const response = await fetch(\`\${API_URL}/restore/\${snapshotId}\`, {
          method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
          alert(\`Snapshot \${snapshotId} restored successfully!\nBackup created: \${data.backupId}\nRefresh the page to see changes.\`);
          window.location.reload();
        } else {
          alert(\`Failed to restore snapshot: \${data.error}\`);
        }
      } catch (error) {
        console.error('Error restoring snapshot:', error);
        alert(\`Error: \${error.message}\`);
      }
    }
    
    // Verify components
    async function verifyComponents() {
      try {
        const verifyResult = document.getElementById('verification-result');
        verifyResult.innerHTML = 'Verifying components...';
        
        const response = await fetch(\`\${API_URL}/verify\`);
        const data = await response.json();
        
        if (data.success) {
          verifyResult.innerHTML = \`
            <div class="badge success">All \${data.totalComponents} components passed verification</div>
            <div class="timestamp">Verified at \${new Date().toLocaleString()}</div>
          \`;
        } else if (data.error) {
          verifyResult.innerHTML = \`
            <div class="badge error">Verification failed: \${data.error}</div>
            <div class="timestamp">Verified at \${new Date().toLocaleString()}</div>
          \`;
        } else {
          const issueList = data.issues.map(issue => \`
            <div>
              <strong>\${issue.file}</strong>
              <ul>
                \${issue.issues.map(i => \`<li>\${i}</li>\`).join('')}
              </ul>
            </div>
          \`).join('');
          
          verifyResult.innerHTML = \`
            <div class="badge error">\${data.issueCount} of \${data.totalComponents} components have issues</div>
            <div class="timestamp">Verified at \${new Date().toLocaleString()}</div>
            <div style="margin-top: 10px;">\${issueList}</div>
          \`;
        }
      } catch (error) {
        console.error('Error verifying components:', error);
        document.getElementById('verification-result').innerHTML = \`
          <div class="badge error">Error: \${error.message}</div>
        \`;
      }
    }
    
    // Load system info
    async function loadSystemInfo() {
      try {
        const response = await fetch(\`\${API_URL}/status\`);
        const data = await response.json();
        
        document.getElementById('system-info').innerHTML = \`
          <dl style="display: grid; grid-template-columns: 1fr 2fr; gap: 10px;">
            <dt>Status:</dt>
            <dd>\${data.status}</dd>
            <dt>Components Directory:</dt>
            <dd>\${data.config.componentsDir}</dd>
            <dt>Snapshots Directory:</dt>
            <dd>\${data.config.snapshotsDir}</dd>
            <dt>Snapshots Count:</dt>
            <dd>\${data.snapshots}</dd>
            <dt>Auto-snapshot on change:</dt>
            <dd>\${data.config.snapshotOnChange ? 'Enabled' : 'Disabled'}</dd>
            <dt>Auto-verify:</dt>
            <dd>\${data.config.autoVerify ? 'Enabled' : 'Disabled'}</dd>
          </dl>
        \`;
      } catch (error) {
        console.error('Error loading system info:', error);
        document.getElementById('system-info').innerHTML = \`
          <div class="badge error">Error: \${error.message}</div>
        \`;
        
        document.getElementById('status-badge').className = 'badge error';
        document.getElementById('status-badge').textContent = 'System Error';
      }
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      // Update timestamp
      updateTimestamp();
      setInterval(updateTimestamp, 1000);
      
      // Load initial data
      loadSnapshots();
      loadSystemInfo();
      
      // Add event listeners
      document.getElementById('take-snapshot').addEventListener('click', takeSnapshot);
      document.getElementById('verify-components').addEventListener('click', verifyComponents);
      
      // Set up periodic refresh
      setInterval(loadSnapshots, 30000);
      setInterval(loadSystemInfo, 30000);
    });
  </script>
</body>
</html>
  `;
}

// Create UI Panel HTML file - disabled as we're using the React component instead
function createUIPanel() {
  // Skip creating the HTML panel since we're using the React component
  console.log(`[UI Safeguard] Using React-based SafeguardPanel component instead of HTML panel`);
  return null;
}

// Main function to start everything
async function main() {
  console.log(`
┌─────────────────────────────────────┐
│     Standalone UI Safeguard System  │
│               v1.0.0                │
└─────────────────────────────────────┘
`);
  
  // Create initial snapshot if none exist
  const snapshots = await listSnapshots();
  if (!snapshots.snapshots || snapshots.snapshots.length === 0) {
    console.log('[UI Safeguard] Creating initial snapshot...');
    await createSnapshot('Initial snapshot');
  } else {
    console.log(`[UI Safeguard] Found ${snapshots.snapshots.length} existing snapshots`);
  }
  
  // Start file watcher
  const watcher = watchComponents();
  
  // Create UI panel
  const panelPath = createUIPanel();
  
  // Start server
  const server = startServer();
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n[UI Safeguard] Shutting down...');
    server.close();
    if (watcher) watcher.close();
    process.exit(0);
  });
  
  console.log('\n[UI Safeguard] System running! Press Ctrl+C to stop.');
}

// Start the system
main().catch(error => {
  console.error('[UI Safeguard] Fatal error:', error);
  process.exit(1);
});