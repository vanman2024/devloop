#!/usr/bin/env node

/**
 * Modal Consolidation Script
 * 
 * This script helps consolidate modal components by:
 * 1. Identifying duplicate modal components
 * 2. Showing differences between duplicates
 * 3. Helping move selected components to the modals directory
 * 4. Updating imports in other files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../../');
const COMPONENTS_DIR = path.join(ROOT_DIR, 'src/components');
const MODALS_DIR = path.join(COMPONENTS_DIR, 'modals');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Ensure modals directory exists
if (!fs.existsSync(MODALS_DIR)) {
  console.log(`${colors.yellow}Creating modals directory...${colors.reset}`);
  fs.mkdirSync(MODALS_DIR, { recursive: true });
}

// Find modal components in root components directory
const findRootModalComponents = () => {
  console.log(`${colors.blue}Finding modal components in root directory...${colors.reset}`);
  
  const modalKeywords = ['modal', 'dialog', 'popup'];
  const rootFiles = fs.readdirSync(COMPONENTS_DIR);
  
  return rootFiles.filter(file => {
    if (!file.endsWith('.jsx') && !file.endsWith('.js')) return false;
    
    // Check if filename contains modal keywords
    const hasModalKeyword = modalKeywords.some(keyword => 
      file.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Check file content for modal-related code
    if (!hasModalKeyword) {
      const content = fs.readFileSync(path.join(COMPONENTS_DIR, file), 'utf8');
      return content.includes('modal') || 
             content.includes('dialog') || 
             content.includes('className="modal') ||
             content.includes('onClick={onClose}');
    }
    
    return true;
  });
};

// Find modal components in modals directory
const findModalsDirectoryComponents = () => {
  if (!fs.existsSync(MODALS_DIR)) return [];
  
  return fs.readdirSync(MODALS_DIR)
    .filter(file => file.endsWith('.jsx') || file.endsWith('.js'));
};

// Find duplicate modal components
const findDuplicateModals = (rootModals, modalsDir) => {
  console.log(`${colors.blue}Finding duplicate modal components...${colors.reset}`);
  
  const duplicates = [];
  
  rootModals.forEach(rootModal => {
    if (modalsDir.includes(rootModal)) {
      duplicates.push(rootModal);
    }
  });
  
  return duplicates;
};

// Show differences between duplicate implementations
const showDifferences = (modalName) => {
  console.log(`${colors.cyan}Showing differences for ${modalName}:${colors.reset}`);
  
  const rootPath = path.join(COMPONENTS_DIR, modalName);
  const modalsDirPath = path.join(MODALS_DIR, modalName);
  
  try {
    const diff = execSync(`diff -u "${rootPath}" "${modalsDirPath}"`).toString();
    console.log(diff || 'Files are identical');
  } catch (error) {
    console.log(error.stdout.toString());
  }
};

// Count imports of a component
const countImports = (componentName) => {
  try {
    // Use grep to find imports (adjust the pattern based on your codebase)
    const grepCmd = `grep -r "from '.*${componentName.replace('.jsx', '')}" ${ROOT_DIR}/src --include="*.js*"`;
    const result = execSync(grepCmd).toString();
    const lines = result.split('\n').filter(Boolean);
    return lines.length;
  } catch (error) {
    // If grep doesn't find anything, it returns non-zero status
    return 0;
  }
};

// Main function
const main = () => {
  console.log(`${colors.green}===== Modal Consolidation Helper =====\n${colors.reset}`);
  
  const rootModals = findRootModalComponents();
  console.log(`${colors.green}Found ${rootModals.length} potential modal components in root directory:${colors.reset}`);
  rootModals.forEach(modal => {
    const importCount = countImports(modal);
    console.log(`- ${modal} (imported in ${importCount} files)`);
  });
  console.log();
  
  const modalsDir = findModalsDirectoryComponents();
  console.log(`${colors.green}Found ${modalsDir.length} components in modals directory:${colors.reset}`);
  modalsDir.forEach(modal => {
    const importCount = countImports(modal);
    console.log(`- ${modal} (imported in ${importCount} files)`);
  });
  console.log();
  
  const duplicates = findDuplicateModals(rootModals, modalsDir);
  console.log(`${colors.green}Found ${duplicates.length} duplicate modal components:${colors.reset}`);
  duplicates.forEach(modal => {
    console.log(`- ${modal}`);
  });
  console.log();
  
  if (duplicates.length > 0) {
    console.log(`${colors.yellow}To see differences for a modal, run:${colors.reset}`);
    console.log(`node ${path.relative(ROOT_DIR, __filename)} diff ModalName.jsx`);
    console.log();
    
    console.log(`${colors.yellow}To consolidate a modal, run:${colors.reset}`);
    console.log(`node ${path.relative(ROOT_DIR, __filename)} consolidate ModalName.jsx [--use-modals|--use-root]`);
    console.log(`  --use-modals: Use the version in the modals directory`);
    console.log(`  --use-root: Use the version in the root directory (default)`);
  }
};

// Show differences between duplicate implementations
const showModalDiff = (modalName) => {
  if (!modalName.endsWith('.jsx') && !modalName.endsWith('.js')) {
    modalName += '.jsx';
  }
  
  const rootPath = path.join(COMPONENTS_DIR, modalName);
  const modalsDirPath = path.join(MODALS_DIR, modalName);
  
  if (!fs.existsSync(rootPath)) {
    console.log(`${colors.red}Error: Component does not exist in root directory: ${modalName}${colors.reset}`);
    return;
  }
  
  if (!fs.existsSync(modalsDirPath)) {
    console.log(`${colors.red}Error: Component does not exist in modals directory: ${modalName}${colors.reset}`);
    return;
  }
  
  showDifferences(modalName);
};

// Consolidate a modal component
const consolidateModal = (modalName, useModals = false) => {
  if (!modalName.endsWith('.jsx') && !modalName.endsWith('.js')) {
    modalName += '.jsx';
  }
  
  const rootPath = path.join(COMPONENTS_DIR, modalName);
  const modalsDirPath = path.join(MODALS_DIR, modalName);
  
  // Check if files exist
  const rootExists = fs.existsSync(rootPath);
  const modalsExists = fs.existsSync(modalsDirPath);
  
  if (!rootExists && !modalsExists) {
    console.log(`${colors.red}Error: Component does not exist in either location: ${modalName}${colors.reset}`);
    return;
  }
  
  if (!rootExists) {
    console.log(`${colors.red}Error: Component does not exist in root directory: ${modalName}${colors.reset}`);
    return;
  }
  
  if (!modalsExists) {
    console.log(`${colors.yellow}Component only exists in root directory. Moving to modals directory...${colors.reset}`);
    fs.copyFileSync(rootPath, modalsDirPath);
    console.log(`${colors.green}Component moved to modals directory.${colors.reset}`);
    return;
  }
  
  // Both files exist, need to consolidate
  if (useModals) {
    console.log(`${colors.yellow}Using modals directory version. Backing up root version...${colors.reset}`);
    fs.copyFileSync(rootPath, `${rootPath}.bak`);
    fs.unlinkSync(rootPath);
  } else {
    console.log(`${colors.yellow}Using root directory version. Backing up modals version...${colors.reset}`);
    fs.copyFileSync(modalsDirPath, `${modalsDirPath}.bak`);
    fs.copyFileSync(rootPath, modalsDirPath);
    fs.unlinkSync(rootPath);
  }
  
  console.log(`${colors.green}Component consolidated to modals directory.${colors.reset}`);
  console.log(`${colors.yellow}IMPORTANT: You need to update imports in all files that use this component.${colors.reset}`);
  
  // Find files that need import updates
  try {
    // Basic pattern for imports from root component directory
    const grepCmd = `grep -r "from '.*components/${modalName.replace('.jsx', '')}" ${ROOT_DIR}/src --include="*.js*"`;
    const result = execSync(grepCmd).toString();
    const lines = result.split('\n').filter(Boolean);
    
    if (lines.length > 0) {
      console.log(`${colors.cyan}Files that need import updates:${colors.reset}`);
      lines.forEach(line => {
        const filePath = line.split(':')[0];
        console.log(`- ${filePath}`);
      });
    }
  } catch (error) {
    // No imports found
  }
};

// Parse command line arguments
const [,, command, ...args] = process.argv;

if (!command) {
  main();
} else if (command === 'diff') {
  if (!args[0]) {
    console.log(`${colors.red}Error: Missing modal name${colors.reset}`);
    console.log(`Usage: node ${path.basename(__filename)} diff ModalName.jsx`);
    process.exit(1);
  }
  showModalDiff(args[0]);
} else if (command === 'consolidate') {
  if (!args[0]) {
    console.log(`${colors.red}Error: Missing modal name${colors.reset}`);
    console.log(`Usage: node ${path.basename(__filename)} consolidate ModalName.jsx [--use-modals|--use-root]`);
    process.exit(1);
  }
  
  const useModals = args.includes('--use-modals');
  consolidateModal(args[0], useModals);
} else {
  console.log(`${colors.red}Unknown command: ${command}${colors.reset}`);
  console.log(`Available commands: diff, consolidate`);
}