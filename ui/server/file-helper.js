/**
 * File Helper Module
 * 
 * Provides file system operations for the Claude integration
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Base paths to search in
const BASE_PATHS = [
  '/mnt/c/Users/angel/devloop/',  // WSL path to Windows files
  './',                          // Current directory
];

/**
 * Handles special commands in the user's message
 * 
 * @param {string} message - The user's message
 * @returns {Promise<object>} - Result with command results and modified message
 */
export async function handleSpecialCommands(message) {
  // Initialize result
  const result = {
    originalMessage: message,
    modifiedMessage: message,
    fileContents: [],
    commandResults: [],
    hasCommands: false
  };
  
  // Patterns for different command styles:
  // 1. !command style: !read file.txt
  // 2. /command style: /read file.txt
  // 3. @command style: @read file.txt
  
  // Check for file reading commands (all styles)
  const fileMatches = message.match(/(?:!|\/|@)read\s+([^\n]+)/g);
  if (fileMatches) {
    result.hasCommands = true;
    
    for (const match of fileMatches) {
      const filePath = match.replace(/(?:!|\/|@)read\s+/, '').trim();
      try {
        const content = await readFile(filePath);
        result.fileContents.push({
          path: filePath,
          content: content
        });
        
        // Replace command with a reference
        result.modifiedMessage = result.modifiedMessage.replace(
          match, 
          `[File: ${filePath}]`
        );
      } catch (error) {
        result.commandResults.push({
          command: match,
          error: `Error reading file: ${error.message}`
        });
      }
    }
  }
  
  // Check for search commands (all styles)
  const searchMatches = message.match(/(?:!|\/|@)search\s+([^\n]+)/g);
  if (searchMatches) {
    result.hasCommands = true;
    
    for (const match of searchMatches) {
      const searchTerm = match.replace(/(?:!|\/|@)search\s+/, '').trim();
      try {
        const searchResults = await searchFiles(searchTerm);
        result.commandResults.push({
          command: match,
          result: searchResults
        });
        
        // Replace command with search results
        const searchSummary = formatSearchResults(searchResults);
        result.modifiedMessage = result.modifiedMessage.replace(
          match, 
          `[Search results for "${searchTerm}":\n${searchSummary}]`
        );
      } catch (error) {
        result.commandResults.push({
          command: match,
          error: `Error searching files: ${error.message}`
        });
      }
    }
  }
  
  // Check for list directory commands (all styles)
  const listMatches = message.match(/(?:!|\/|@)(?:ls|list|dir)\s+([^\n]+)/g);
  if (listMatches) {
    result.hasCommands = true;
    
    for (const match of listMatches) {
      const dirPath = match.replace(/(?:!|\/|@)(?:ls|list|dir)\s+/, '').trim();
      try {
        const files = await listDirectory(dirPath);
        result.commandResults.push({
          command: match,
          result: files
        });
        
        // Replace command with directory listing
        const filesList = files.join('\n');
        result.modifiedMessage = result.modifiedMessage.replace(
          match, 
          `[Directory listing for "${dirPath}":\n${filesList}]`
        );
      } catch (error) {
        result.commandResults.push({
          command: match,
          error: `Error listing directory: ${error.message}`
        });
      }
    }
  }
  
  return result;
}

/**
 * Reads a file from the file system
 * 
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - File contents
 */
async function readFile(filePath) {
  // Try to find the file in various base paths
  for (const basePath of BASE_PATHS) {
    const fullPath = path.resolve(basePath, filePath);
    try {
      // Check if file exists
      await fs.promises.access(fullPath, fs.constants.R_OK);
      
      // File exists, read it
      const content = await fs.promises.readFile(fullPath, 'utf8');
      return content;
    } catch (error) {
      // File not found in this base path, try next one
      continue;
    }
  }
  
  // If we get here, file wasn't found in any base path
  throw new Error(`File not found: ${filePath}`);
}

/**
 * Searches for files containing the specified term
 * 
 * @param {string} searchTerm - Term to search for
 * @returns {Promise<Array>} - Search results
 */
async function searchFiles(searchTerm) {
  try {
    // Use grep to search for files in the devloop directory
    const { stdout } = await execPromise(
      `grep -r "${searchTerm.replace(/"/g, '\\"')}" --include="*.{py,js,jsx,ts,tsx,json,md}" /mnt/c/Users/angel/devloop/ | head -n 20`
    );
    
    return stdout.split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        const [file, ...rest] = line.split(':');
        const content = rest.join(':');
        return { file, content };
      });
  } catch (error) {
    // If grep exits with non-zero status (e.g., no matches), handle it
    if (error.code > 1) {  // Exit code 1 just means no matches
      throw error;
    }
    return [];
  }
}

/**
 * Lists files in a directory
 * 
 * @param {string} dirPath - Path to the directory
 * @returns {Promise<Array<string>>} - List of files
 */
async function listDirectory(dirPath) {
  // Try to find the directory in various base paths
  for (const basePath of BASE_PATHS) {
    const fullPath = path.resolve(basePath, dirPath);
    try {
      // Check if directory exists
      await fs.promises.access(fullPath, fs.constants.R_OK);
      
      // Directory exists, list files
      const files = await fs.promises.readdir(fullPath);
      return files;
    } catch (error) {
      // Directory not found in this base path, try next one
      continue;
    }
  }
  
  // If we get here, directory wasn't found in any base path
  throw new Error(`Directory not found: ${dirPath}`);
}

/**
 * Formats search results into a readable string
 * 
 * @param {Array} results - Search results
 * @returns {string} - Formatted string
 */
function formatSearchResults(results) {
  if (results.length === 0) {
    return "No results found";
  }
  
  return results
    .map(({ file, content }) => `${file}: ${content.trim()}`)
    .join('\n');
}