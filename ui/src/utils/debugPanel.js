/**
 * Debug Panel Component
 * 
 * This module creates a debug panel that can be toggled to show system health,
 * logs, and provide debugging tools.
 */
import { getAllLogs, clearLogs, LogLevel, configure } from './debugLogger';

let isInitialized = false;
let isVisible = false;
const PANEL_ID = 'devloop-debug-panel';
const LOG_CONTAINER_ID = 'devloop-debug-logs';

// Create styles
const createStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    #${PANEL_ID} {
      position: fixed;
      top: 0;
      right: 0;
      width: 80%;
      height: 60%;
      background: rgba(0, 0, 0, 0.9);
      color: #fff;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      overflow: hidden;
      z-index: 10000;
      border-left: 1px solid #444;
      border-bottom: 1px solid #444;
      display: flex;
      flex-direction: column;
      transform: translateY(-100%);
      transition: transform 0.3s ease-in-out;
    }
    #${PANEL_ID}.visible {
      transform: translateY(0);
    }
    #${PANEL_ID} .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid #444;
      margin-bottom: 10px;
    }
    #${PANEL_ID} .header h3 {
      margin: 0;
      font-size: 14px;
    }
    #${PANEL_ID} .tab-buttons {
      display: flex;
      border-bottom: 1px solid #333;
      margin-bottom: 10px;
    }
    #${PANEL_ID} .tab-button {
      padding: 4px 12px;
      cursor: pointer;
      background: transparent;
      border: none;
      color: #888;
      border-bottom: 2px solid transparent;
      font-family: monospace;
    }
    #${PANEL_ID} .tab-button.active {
      color: #fff;
      border-bottom: 2px solid #4a9eff;
    }
    #${PANEL_ID} .tab-content {
      display: none;
      flex: 1;
      overflow: auto;
    }
    #${PANEL_ID} .tab-content.active {
      display: block;
    }
    #${PANEL_ID} #${LOG_CONTAINER_ID} {
      height: 100%;
      overflow: auto;
    }
    #${PANEL_ID} .log-entry {
      padding: 3px 0;
      border-bottom: 1px solid #333;
    }
    #${PANEL_ID} .log-error { color: #ff5555; }
    #${PANEL_ID} .log-warn { color: #ffaa00; }
    #${PANEL_ID} .log-info { color: #55aaff; }
    #${PANEL_ID} .log-debug { color: #aaaaaa; }
    #${PANEL_ID} .log-trace { color: #777777; }
    #${PANEL_ID} .log-time { opacity: 0.7; margin-right: 5px; }
    #${PANEL_ID} .log-level { font-weight: bold; margin-right: 5px; }
    #${PANEL_ID} .log-source { margin-right: 5px; }
    #${PANEL_ID} .log-error-details { 
      margin-top: 5px;
      padding-left: 20px;
      font-size: 11px;
      white-space: pre-wrap;
      color: #ff7777;
    }
    #${PANEL_ID} pre {
      margin: 5px 0;
      padding: 5px;
      background: rgba(0,0,0,0.3);
      max-height: 100px;
      overflow: auto;
      white-space: pre-wrap;
    }
    #${PANEL_ID} .tools-container {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    #${PANEL_ID} .tools-container button {
      background: #333;
      border: none;
      color: white;
      padding: 8px;
      border-radius: 4px;
      cursor: pointer;
    }
    #${PANEL_ID} .tools-container button:hover {
      background: #444;
    }
    #${PANEL_ID} .status-container {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    #${PANEL_ID} .status-item {
      background: #222;
      padding: 8px;
      border-radius: 4px;
    }
    #${PANEL_ID} .status-label {
      font-size: 10px;
      color: #888;
      margin-bottom: 4px;
    }
    #${PANEL_ID} .status-value {
      font-size: 14px;
    }
    #debug-panel-toggle {
      position: fixed;
      top: 0;
      right: 20px;
      background: #333;
      color: white;
      border: none;
      padding: 3px 8px;
      cursor: pointer;
      z-index: 10001;
      font-family: monospace;
      font-size: 12px;
      border-bottom-left-radius: 4px;
      border-bottom-right-radius: 4px;
    }
  `;
  document.head.appendChild(style);
};

// Create the debug panel
const createPanel = () => {
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  
  panel.innerHTML = `
    <div class="header">
      <h3>Devloop Debug Panel</h3>
      <button id="close-debug-panel">Close</button>
    </div>
    
    <div class="tab-buttons">
      <button class="tab-button active" data-tab="logs">Logs</button>
      <button class="tab-button" data-tab="status">Status</button>
      <button class="tab-button" data-tab="tools">Tools</button>
      <button class="tab-button" data-tab="routes">Routes</button>
    </div>
    
    <div class="tab-content active" data-tab="logs">
      <div class="log-controls">
        <select id="log-level-filter">
          <option value="4">All (TRACE)</option>
          <option value="3" selected>DEBUG</option>
          <option value="2">INFO</option>
          <option value="1">WARNING</option>
          <option value="0">ERROR</option>
        </select>
        <input type="text" id="log-filter" placeholder="Filter logs..." />
        <button id="clear-logs">Clear</button>
      </div>
      <div id="${LOG_CONTAINER_ID}"></div>
    </div>
    
    <div class="tab-content" data-tab="status">
      <div class="status-container">
        <div class="status-item">
          <div class="status-label">React Version</div>
          <div class="status-value" id="react-version">Loading...</div>
        </div>
        <div class="status-item">
          <div class="status-label">Current Route</div>
          <div class="status-value" id="current-route">Loading...</div>
        </div>
        <div class="status-item">
          <div class="status-label">Components Loaded</div>
          <div class="status-value" id="components-loaded">Loading...</div>
        </div>
        <div class="status-item">
          <div class="status-label">Error Count</div>
          <div class="status-value" id="error-count">Loading...</div>
        </div>
        <div class="status-item">
          <div class="status-label">Memory Usage</div>
          <div class="status-value" id="memory-usage">Loading...</div>
        </div>
        <div class="status-item">
          <div class="status-label">Page Load Time</div>
          <div class="status-value" id="page-load-time">Loading...</div>
        </div>
      </div>
    </div>
    
    <div class="tab-content" data-tab="tools">
      <div class="tools-container">
        <button id="debug-trigger-error">Trigger Test Error</button>
        <button id="debug-log-network">Log Network Requests</button>
        <button id="debug-analyze-components">Analyze Components</button>
        <button id="debug-reload-page">Reload Page</button>
        <button id="debug-reload-styles">Reload Styles</button>
        <button id="debug-check-bootstrap">Check Bootstrap</button>
      </div>
    </div>
    
    <div class="tab-content" data-tab="routes">
      <h4>Available Routes</h4>
      <ul id="routes-list">Loading...</ul>
    </div>
  `;
  
  document.body.appendChild(panel);
  
  // Create toggle button
  const toggleButton = document.createElement('button');
  toggleButton.id = 'debug-panel-toggle';
  toggleButton.textContent = '🛠️ Debug';
  toggleButton.addEventListener('click', togglePanel);
  document.body.appendChild(toggleButton);
  
  // Set up event listeners
  document.getElementById('close-debug-panel').addEventListener('click', togglePanel);
  document.getElementById('clear-logs').addEventListener('click', clearLogs);
  document.getElementById('log-level-filter').addEventListener('change', e => {
    configure({ logLevel: parseInt(e.target.value) });
  });
  
  // Test error button
  document.getElementById('debug-trigger-error').addEventListener('click', () => {
    if (window.triggerTestError) {
      window.triggerTestError();
    } else {
      try {
        throw new Error('Debug panel test error');
      } catch (err) {
        console.error('Test error triggered from debug panel', err);
      }
    }
  });
  
  // Log network requests
  document.getElementById('debug-log-network').addEventListener('click', () => {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      console.log('Network request:', args[0]);
      return originalFetch.apply(this, args);
    };
    console.log('Network request logging enabled');
  });
  
  // Bootstrap check
  document.getElementById('debug-check-bootstrap').addEventListener('click', () => {
    const hasBootstrap = typeof window.bootstrap !== 'undefined' || 
                          document.querySelector('link[href*="bootstrap"]') !== null;
    console.log('Bootstrap loaded:', hasBootstrap);
    alert(`Bootstrap loaded: ${hasBootstrap ? 'Yes' : 'No'}`);
  });
  
  // Tab switching
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', e => {
      const tabName = e.target.getAttribute('data-tab');
      
      // Update active tab button
      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
      });
      e.target.classList.add('active');
      
      // Show active tab content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.querySelector(`.tab-content[data-tab="${tabName}"]`).classList.add('active');
    });
  });
  
  // Initial status updates
  updateStatus();
};

/**
 * Toggle the visibility of the debug panel
 */
function togglePanel() {
  const panel = document.getElementById(PANEL_ID);
  if (panel) {
    isVisible = !isVisible;
    panel.classList.toggle('visible', isVisible);
    updateLogDisplay();
    updateStatus();
  }
}

/**
 * Update the log display with current logs
 */
function updateLogDisplay() {
  const container = document.getElementById(LOG_CONTAINER_ID);
  if (!container || !isVisible) return;

  const logs = getAllLogs();
  const filterText = document.getElementById('log-filter')?.value?.toLowerCase() || '';
  const level = parseInt(document.getElementById('log-level-filter')?.value || '3');
  
  // Filter the logs based on current filters
  const filteredLogs = logs.filter(log => {
    // Filter by level
    if (log.level > level) return false;
    
    // Filter by text
    if (filterText) {
      return (
        log.message.toLowerCase().includes(filterText) ||
        log.source.toLowerCase().includes(filterText) ||
        (log.data && JSON.stringify(log.data).toLowerCase().includes(filterText))
      );
    }
    return true;
  });
  
  // Create log content (latest 100 entries)
  const logHTML = filteredLogs.slice(-100).map(entry => {
    let className = 'log-entry';
    switch (entry.level) {
      case LogLevel.ERROR: className += ' log-error'; break;
      case LogLevel.WARN: className += ' log-warn'; break;
      case LogLevel.INFO: className += ' log-info'; break;
      case LogLevel.DEBUG: className += ' log-debug'; break;
      case LogLevel.TRACE: className += ' log-trace'; break;
    }

    const dataDisplay = entry.data ? 
      `<pre>${JSON.stringify(entry.data, null, 2)}</pre>` : '';
    
    const errorDisplay = entry.error ? 
      `<div class="log-error-details">${entry.error.message}<br>${entry.error.stack}</div>` : '';

    return `
      <div class="${className}">
        <span class="log-time">${entry.timestamp}</span>
        <span class="log-level">[${entry.levelName}]</span>
        <span class="log-source">[${entry.source}]</span>
        <span class="log-message">${entry.message}</span>
        ${dataDisplay}
        ${errorDisplay}
      </div>
    `;
  }).join('');

  container.innerHTML = logHTML;
  
  // Auto-scroll to bottom
  container.scrollTop = container.scrollHeight;
}

/**
 * Update status information in the panel
 */
function updateStatus() {
  if (!isVisible) return;
  
  // React version
  try {
    const reactVersion = React?.version || 'Unknown';
    document.getElementById('react-version').textContent = reactVersion;
  } catch (e) {
    document.getElementById('react-version').textContent = 'Error detecting';
  }
  
  // Current route
  try {
    const pathname = window.location.pathname;
    document.getElementById('current-route').textContent = pathname;
  } catch (e) {
    document.getElementById('current-route').textContent = 'Error detecting';
  }
  
  // Error count
  try {
    const logs = getAllLogs();
    const errorCount = logs.filter(log => log.level === 0).length;
    document.getElementById('error-count').textContent = errorCount;
  } catch (e) {
    document.getElementById('error-count').textContent = 'Error counting';
  }
  
  // Memory usage
  try {
    if (window.performance && window.performance.memory) {
      const memory = window.performance.memory;
      const usedHeapMB = Math.round(memory.usedJSHeapSize / (1024 * 1024));
      const totalHeapMB = Math.round(memory.totalJSHeapSize / (1024 * 1024));
      document.getElementById('memory-usage').textContent = `${usedHeapMB}MB / ${totalHeapMB}MB`;
    } else {
      document.getElementById('memory-usage').textContent = 'Not available';
    }
  } catch (e) {
    document.getElementById('memory-usage').textContent = 'Error measuring';
  }
  
  // Page load time
  try {
    if (window.performance) {
      const pageLoad = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
      document.getElementById('page-load-time').textContent = `${pageLoad}ms`;
    } else {
      document.getElementById('page-load-time').textContent = 'Not available';
    }
  } catch (e) {
    document.getElementById('page-load-time').textContent = 'Error measuring';
  }
  
  // Routes list
  try {
    // This is a naive approach - in a real app you'd want to get this from your router
    const knownRoutes = ['/', '/features', '/integration-sync', '/system-health', 
      '/ai-integration', '/pm', '/dev', '/ai-assistant', '/easy-code', 
      '/overview', '/docs', '/roadmap', '/test'];
    
    const routesList = knownRoutes.map(route => 
      `<li><a href="${route}" style="color: #aaf;">${route}</a></li>`
    ).join('');
    
    document.getElementById('routes-list').innerHTML = routesList;
  } catch (e) {
    document.getElementById('routes-list').innerHTML = '<li>Error listing routes</li>';
  }
}

/**
 * Initialize the debug panel
 */
function initDebugPanel() {
  if (isInitialized) return;
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDebugPanel);
    return;
  }
  
  createStyles();
  createPanel();
  
  // Set up periodic updates
  setInterval(() => {
    updateLogDisplay();
    updateStatus();
  }, 1000); // Update every second
  
  isInitialized = true;
  
  // Setup hotkey for toggling (Ctrl+Shift+D)
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      togglePanel();
      e.preventDefault();
    }
  });
}

export { initDebugPanel, togglePanel };