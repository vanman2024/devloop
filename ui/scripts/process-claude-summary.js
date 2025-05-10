/**
 * process-claude-summary.js
 * 
 * A CLI utility to manually process Claude summaries.
 * This is useful for saving summaries from existing conversations.
 * 
 * Usage:
 *   node process-claude-summary.js <input-file>
 *   cat summary.txt | node process-claude-summary.js
 */

const fs = require('fs');
const path = require('path');

// Set up mock browser environment for indexedDB
global.indexedDB = {
  open: () => ({ 
    onupgradeneeded: null,
    onsuccess: null, 
    onerror: null 
  })
};

global.localStorage = {
  _data: {},
  getItem(key) {
    return this._data[key];
  },
  setItem(key, value) {
    this._data[key] = value;
  },
  removeItem(key) {
    delete this._data[key];
  }
};

// Import the tracker module (CommonJS way)
function importESModule(modulePath) {
  // This is a hacky way to load an ES module in CommonJS
  const moduleCode = fs.readFileSync(modulePath, 'utf8');
  
  // Create a module definition that exports named functions
  const wrappedCode = `
    let module = { exports: {} };
    const exports = {};
    
    // Mock ES module imports that the module might need
    const saveContext = async (category, key, value) => {
      console.log(\`[Mock] Saving to category: \${category}, key: \${key}\`);
      fs.writeFileSync(
        path.join(__dirname, '../logs', \`\${category}_\${key}.json\`),
        JSON.stringify(value, null, 2)
      );
      return true;
    };
    
    const getContext = async () => null;
    const getCategoryContext = async () => ({});
    
    // Define the module
    ${moduleCode.replace(/import[\s\S]+?from\s+['"][^'"]+['"]/g, '')}
    
    module.exports = { 
      detectSummary,
      trackSummary,
      processClaudeResponse
    };
  `;
  
  // Create a function from this code and execute it
  return new Function('fs', 'path', 'require', 'console', wrappedCode)(fs, path, require, console);
}

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Main function
async function main() {
  try {
    console.log('Claude Summary Processor');
    console.log('=======================');
    
    // Load the tracker module
    const trackerModule = importESModule(path.join(__dirname, '../src/utils/ClaudeSummaryTracker.js'));
    const { detectSummary } = trackerModule;
    
    // Read input (either from file or stdin)
    let input = '';
    
    if (process.argv.length > 2) {
      // Read from file
      const inputFile = process.argv[2];
      console.log(`Reading from file: ${inputFile}`);
      input = fs.readFileSync(inputFile, 'utf8');
    } else {
      // Read from stdin
      console.log('Reading from stdin...');
      input = fs.readFileSync(0, 'utf8'); // 0 is stdin file descriptor
    }
    
    // Process the input
    console.log(`Input length: ${input.length} characters`);
    
    // Detect summary
    const summaryInfo = detectSummary(input);
    
    if (summaryInfo) {
      console.log('Summary detected!');
      console.log('Pattern used:', summaryInfo.pattern);
      console.log('Summary length:', summaryInfo.summary.length);
      console.log('\nSummary preview:');
      console.log('---------------');
      console.log(summaryInfo.summary.substring(0, 200) + '...');
      
      // Save to file
      const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
      const outputFile = path.join(logsDir, `claude_summary_${timestamp}.json`);
      
      // Create the summary object
      const summaryObj = {
        id: `summary_${timestamp}`,
        timestamp: new Date().toISOString(),
        summary: summaryInfo.summary,
        patternUsed: summaryInfo.pattern,
        conversationId: `manual_${Date.now()}`
      };
      
      fs.writeFileSync(outputFile, JSON.stringify(summaryObj, null, 2));
      console.log(`\nSummary saved to: ${outputFile}`);
    } else {
      console.log('No summary detected in the input.');
      console.log('Make sure the input contains a Claude conversation summary.');
    }
    
  } catch (error) {
    console.error('Error processing summary:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);