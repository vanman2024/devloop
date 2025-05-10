/**
 * ClaudeSummaryTracker.js
 * 
 * A utility for detecting and storing Claude's conversation summaries
 * that are created during context compression.
 */

import { saveContext, getContext, getCategoryContext } from './DatabaseHelper.js';

// Constants
const SUMMARY_CATEGORY = 'claude_summaries';
const SUMMARY_INDEX_KEY = 'summary_index';

// Regex patterns to detect Claude summaries
const SUMMARY_PATTERNS = [
  /<summary>([\s\S]*?)<\/summary>/i,
  /<analysis>([\s\S]*?)<\/analysis>/i,
  /This session is being continued from a previous conversation that ran out of context\. The conversation is\s+summarized below:\s+<([^>]+)>([\s\S]+?)<\/\1>/i,
  /To save space in the context window, I'll summarize our conversation so far:([\s\S]+?)(?=\n\nHuman:|$)/i,
  /I'll briefly summarize our conversation to save context space:([\s\S]+?)(?=\n\nHuman:|$)/i
];

/**
 * Detect if text contains a Claude summary
 * 
 * @param {string} text - The text to check for summaries
 * @returns {Object|null} Object with summary content and pattern used, or null if no summary
 */
export const detectSummary = (text) => {
  if (!text) return null;
  
  for (const pattern of SUMMARY_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      // Different patterns have the summary in different capture groups
      const summary = match[1] || match[2] || match[0];
      return {
        summary: summary.trim(),
        pattern: pattern.toString()
      };
    }
  }
  
  return null;
};

/**
 * Track a Claude conversation summary
 * 
 * @param {string} text - The full text to check for summaries
 * @param {string} conversationId - Optional conversation ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<string|null>} The ID of the stored summary or null if no summary found
 */
export const trackSummary = async (text, conversationId = null, metadata = {}) => {
  const detected = detectSummary(text);
  
  if (!detected) {
    console.log('No Claude summary detected in the text');
    return null;
  }
  
  try {
    // Generate a unique ID for this summary
    const timestamp = new Date().toISOString();
    const id = `summary_${timestamp.replace(/[:.-]/g, '_')}`;
    
    // Create the summary object
    const summaryObj = {
      id,
      timestamp,
      summary: detected.summary,
      patternUsed: detected.pattern,
      fullText: text,
      conversationId: conversationId || `conv_${Date.now()}`,
      ...metadata
    };
    
    // Store in database
    await saveContext(SUMMARY_CATEGORY, id, summaryObj);
    
    // Also update the index of summaries
    await updateSummaryIndex(id);
    
    console.log(`Claude summary tracked with ID: ${id}`);
    return id;
  } catch (error) {
    console.error('Error tracking Claude summary:', error);
    return null;
  }
};

/**
 * Process Claude's response to check for summaries
 * 
 * @param {string} claudeResponse - Claude's response text
 * @returns {Promise<string|null>} Summary ID if found and tracked
 */
export const processClaudeResponse = async (claudeResponse) => {
  return await trackSummary(claudeResponse);
};

/**
 * Update the index of summaries
 * 
 * @param {string} newSummaryId - The ID of the new summary to add to the index
 */
const updateSummaryIndex = async (newSummaryId) => {
  try {
    // Get existing index
    const index = await getContext(SUMMARY_CATEGORY, SUMMARY_INDEX_KEY) || { summaries: [] };
    
    // Add the new summary ID
    index.summaries.push(newSummaryId);
    
    // Update last updated timestamp
    index.lastUpdated = new Date().toISOString();
    
    // Save back to database
    await saveContext(SUMMARY_CATEGORY, SUMMARY_INDEX_KEY, index);
  } catch (error) {
    console.error('Error updating summary index:', error);
  }
};

/**
 * Get all stored Claude summaries
 * 
 * @returns {Promise<Array>} Array of summary objects
 */
export const getAllSummaries = async () => {
  try {
    // Get all summaries from the category
    const allContexts = await getCategoryContext(SUMMARY_CATEGORY);
    
    // Filter out the index
    const summaries = Object.entries(allContexts)
      .filter(([key]) => key !== SUMMARY_INDEX_KEY)
      .map(([_, value]) => value)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return summaries;
  } catch (error) {
    console.error('Error getting Claude summaries:', error);
    return [];
  }
};

/**
 * Get a specific summary by ID
 * 
 * @param {string} summaryId - The ID of the summary to retrieve
 * @returns {Promise<Object|null>} The summary object or null if not found
 */
export const getSummaryById = async (summaryId) => {
  try {
    return await getContext(SUMMARY_CATEGORY, summaryId);
  } catch (error) {
    console.error(`Error getting summary ${summaryId}:`, error);
    return null;
  }
};

// Export a test function that can be used in browser console
if (typeof window !== 'undefined') {
  window.testClaudeSummaryDetection = (text) => {
    const result = detectSummary(text);
    console.log('Detection result:', result);
    return result;
  };
}

export default {
  detectSummary,
  trackSummary,
  processClaudeResponse,
  getAllSummaries,
  getSummaryById,
  SUMMARY_CATEGORY
};