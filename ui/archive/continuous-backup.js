/**
 * Continuous Backup Watcher
 * 
 * This script continuously monitors critical UI components and automatically
 * backs them up when changes are detected.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';
import chokidar from 'chokidar';
import { fileURLToPath } from 'url';

// Critical components that should always be backed up before modification
const CRITICAL_COMPONENTS = [
  'src/App.jsx',
  'src/components/Header.jsx',
  'src/components/navigation/GlobalHeader.jsx',
  'src/components/Sidebar.jsx',
  'src/services/notificationService.js'
];

// Get the base directory of the project
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(BASE_DIR, 'component-backups');
const HASH_FILE = path.join(BACKUP_DIR, 'file_hashes.json');
const LOG_FILE = path.join(BASE_DIR, 'logs', 'continuous-backup.log');

// Ensure backup and logs directories exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
if (!fs.existsSync(path.join(BASE_DIR, 'logs'))) {
  fs.mkdirSync(path.join(BASE_DIR, 'logs'), { recursive: true });
}

// Load previously stored file hashes
let fileHashes = {};
if (fs.existsSync(HASH_FILE)) {
  try {
    fileHashes = JSON.parse(fs.readFileSync(HASH_FILE, 'utf8'));
  } catch (error) {
    logMessage(`Failed to load file hashes: ${error.message}`);
    fileHashes = {};
  }
}

// Debounce map to avoid multiple backups of the same file in quick succession
const debounceMap = new Map();
const DEBOUNCE_DELAY = 2000; // 2 seconds

/**
 * Log a message to both console and log file
 * @param {string} message Message to log
 */
function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  console.log(message);
  fs.appendFileSync(LOG_FILE, logEntry);
}

/**
 * Calculate hash of a file
 * @param {string} filePath Path to the file
 * @returns {string} SHA-256 hash of the file
 */
function getFileHash(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileContent).digest('hex');
  } catch (error) {
    logMessage(`Error reading file ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Backup a file using the rollback script
 * @param {string} filePath Path to the file relative to project root
 */
function backupFile(filePath) {
  const fullPath = path.join(BASE_DIR, filePath);
  
  if (!fs.existsSync(fullPath)) {
    logMessage(`File does not exist: ${fullPath}`);
    return;
  }
  
  try {
    // Use the rollback script for backup
    const output = execSync(`${BASE_DIR}/rollback.sh backup-file ${filePath}`, { encoding: 'utf8' });
    logMessage(`Backed up ${filePath}`);
    
    // Update the hash
    const newHash = getFileHash(fullPath);
    if (newHash) {
      fileHashes[filePath] = newHash;
      // Save updated hashes
      fs.writeFileSync(HASH_FILE, JSON.stringify(fileHashes, null, 2));
    }
  } catch (error) {
    logMessage(`Error backing up file ${filePath}: ${error.message}`);
  }
}

/**
 * Verify if code is in a working state before backup
 * @returns {boolean} True if the app is in a working state
 */
function verifyAppFunctional() {
  try {
    // Basic syntax verification for critical JSX files
    for (const component of CRITICAL_COMPONENTS) {
      if (component.endsWith('.jsx') || component.endsWith('.js')) {
        const fullPath = path.join(BASE_DIR, component);
        
        if (!fs.existsSync(fullPath)) continue;
        
        // Run a basic syntax check using Node's require
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Very basic JSX syntax check (incomplete but catches obvious errors)
          const openTags = (content.match(/<[A-Za-z][^>]*>/g) || []).length;
          const closeTags = (content.match(/<\/[A-Za-z][^>]*>/g) || []).length;
          const selfClosing = (content.match(/<[A-Za-z][^>]*\/>/g) || []).length;
          
          // If mismatch in tags, likely syntax error
          if ((openTags - closeTags) !== selfClosing) {
            logMessage(`Potential syntax error in ${component} - tags don't balance`);
            return false;
          }
          
          // Check for unclosed brackets/parentheses
          const openBraces = (content.match(/{/g) || []).length;
          const closeBraces = (content.match(/}/g) || []).length;
          if (openBraces !== closeBraces) {
            logMessage(`Potential syntax error in ${component} - braces don't balance`);
            return false;
          }
          
          // Run ESLint if available (simplified check here)
          try {
            execSync(`npx eslint --quiet ${fullPath}`, { stdio: 'pipe' });
          } catch (eslintError) {
            logMessage(`ESLint errors in ${component} - component may not be functional`);
            return false;
          }
        } catch (syntaxError) {
          logMessage(`Syntax error in ${component}: ${syntaxError.message}`);
          return false;
        }
      }
    }
    
    // All checks passed
    return true;
  } catch (error) {
    logMessage(`Error verifying app functionality: ${error.message}`);
    return false;
  }
}

/**
 * Handler for file change events
 * @param {string} filePath Path to the file that changed
 */
function handleFileChange(filePath) {
  // Get relative path
  const relPath = path.relative(BASE_DIR, filePath).replace(/\\/g, '/');
  
  // Check if this is a critical component
  if (!CRITICAL_COMPONENTS.includes(relPath)) {
    return;
  }
  
  // Implement debouncing to avoid multiple backups during rapid changes
  if (debounceMap.has(relPath)) {
    clearTimeout(debounceMap.get(relPath));
  }
  
  debounceMap.set(relPath, setTimeout(() => {
    logMessage(`Change detected in ${relPath}`);
    
    const currentHash = getFileHash(filePath);
    if (!currentHash) return;
    
    // Only backup if the hash changed AND the app is in a functional state
    if ((!fileHashes[relPath] || fileHashes[relPath] !== currentHash) && verifyAppFunctional()) {
      logMessage(`Component ${relPath} passed functionality check - creating backup`);
      backupFile(relPath);
    } else {
      logMessage(`Component ${relPath} skipped backup - either unchanged or failed functionality check`);
    }
    
    debounceMap.delete(relPath);
  }, DEBOUNCE_DELAY));
}

/**
 * Start watching critical components for changes
 */
function startWatcher() {
  // Convert critical component paths to absolute paths
  const watchPaths = CRITICAL_COMPONENTS.map(comp => path.join(BASE_DIR, comp));
  
  // Initialize watcher
  const watcher = chokidar.watch(watchPaths, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 100
    }
  });
  
  // Set up event handlers
  watcher
    .on('change', handleFileChange)
    .on('ready', () => {
      logMessage('Continuous backup watcher started');
      logMessage(`Watching: ${CRITICAL_COMPONENTS.join(', ')}`);
    })
    .on('error', error => logMessage(`Watcher error: ${error.message}`));
  
  // Handle process termination
  process.on('SIGINT', () => {
    logMessage('Continuous backup watcher stopping...');
    watcher.close().then(() => process.exit(0));
  });
}

// Start the watcher
logMessage('Starting continuous backup watcher...');
try {
  startWatcher();
} catch (error) {
  logMessage(`Failed to start watcher: ${error.message}`);
  process.exit(1);
}