/**
 * Auto Backup Script
 * 
 * This script automatically backs up UI components that are about to be modified
 * It can be used as a pre-commit hook or integrated directly into the build process
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Critical components that should always be backed up before modification
const CRITICAL_COMPONENTS = [
  'src/App.jsx',
  'src/components/Header.jsx',
  'src/components/navigation/GlobalHeader.jsx',
  'src/components/Sidebar.jsx',
  'src/services/notificationService.js'
];

// Get the base directory of the project
const BASE_DIR = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(BASE_DIR, 'component-backups');
const HASH_FILE = path.join(BACKUP_DIR, 'file_hashes.json');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Load previously stored file hashes
let fileHashes = {};
if (fs.existsSync(HASH_FILE)) {
  try {
    fileHashes = JSON.parse(fs.readFileSync(HASH_FILE, 'utf8'));
  } catch (error) {
    console.warn('Failed to load file hashes:', error);
    fileHashes = {};
  }
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
    console.error(`Error reading file ${filePath}:`, error);
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
    console.warn(`File does not exist: ${fullPath}`);
    return;
  }
  
  try {
    // Use the rollback script for backup
    const output = execSync(`${BASE_DIR}/rollback.sh backup-file ${filePath}`, { encoding: 'utf8' });
    console.log(output);
    
    // Update the hash
    const newHash = getFileHash(fullPath);
    if (newHash) {
      fileHashes[filePath] = newHash;
      // Save updated hashes
      fs.writeFileSync(HASH_FILE, JSON.stringify(fileHashes, null, 2));
    }
  } catch (error) {
    console.error(`Error backing up file ${filePath}:`, error);
  }
}

/**
 * Check all critical components for changes and backup if needed
 */
function backupCriticalComponents() {
  console.log('Checking critical components for changes...');
  
  for (const component of CRITICAL_COMPONENTS) {
    const fullPath = path.join(BASE_DIR, component);
    
    if (!fs.existsSync(fullPath)) {
      continue;
    }
    
    const currentHash = getFileHash(fullPath);
    if (!currentHash) {
      continue;
    }
    
    // If hash changed or not previously recorded, create backup
    if (!fileHashes[component] || fileHashes[component] !== currentHash) {
      console.log(`Changes detected in ${component}, creating backup...`);
      backupFile(component);
    }
  }
}

/**
 * Register auto-backup as a pre-commit hook
 */
function setupPreCommitHook() {
  const gitHooksDir = path.join(BASE_DIR, '.git', 'hooks');
  const preCommitPath = path.join(gitHooksDir, 'pre-commit');
  
  if (!fs.existsSync(gitHooksDir)) {
    console.warn('Git hooks directory not found. Repository may not be initialized.');
    return;
  }
  
  const hookScript = `#!/bin/sh
# Auto-backup critical components before commit
node ${path.join(__dirname, 'auto-backup.js')}

# Exit with success (0) to allow the commit to proceed
exit 0
`;

  try {
    fs.writeFileSync(preCommitPath, hookScript);
    fs.chmodSync(preCommitPath, '755'); // Make executable
    console.log('Pre-commit hook set up successfully');
  } catch (error) {
    console.error('Failed to set up pre-commit hook:', error);
  }
}

/**
 * Run the auto-backup process
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'setup-hook') {
    setupPreCommitHook();
  } else if (command === 'check') {
    // Only check for changes, don't backup
    console.log('Checking for changes...');
    for (const component of CRITICAL_COMPONENTS) {
      const fullPath = path.join(BASE_DIR, component);
      
      if (!fs.existsSync(fullPath)) {
        continue;
      }
      
      const currentHash = getFileHash(fullPath);
      if (!currentHash) {
        continue;
      }
      
      if (!fileHashes[component]) {
        console.log(`${component}: No previous hash recorded`);
      } else if (fileHashes[component] !== currentHash) {
        console.log(`${component}: CHANGED`);
      } else {
        console.log(`${component}: unchanged`);
      }
    }
  } else {
    // Default: backup critical components
    backupCriticalComponents();
  }
}

// Run the script
main();