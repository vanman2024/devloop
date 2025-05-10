/**
 * Knowledge Graph Connector
 * 
 * This module provides connectivity between the UI components and the
 * system Knowledge Graph through the agent architecture.
 */

// Configuration for connecting to the backend
// Use a default value for development
const AGENT_API_ENDPOINT = '/api/v1/agents';
const SYSTEM_HEALTH_ENDPOINT = `${AGENT_API_ENDPOINT}/system-health-agent`;
const FILE_ORGANIZATION_ENDPOINT = `${SYSTEM_HEALTH_ENDPOINT}/child-agents/file-organization-agent`;

/**
 * Connect to the knowledge graph via the agent API
 * @returns {Object} Knowledge graph connector object
 */
export const createKnowledgeGraphConnector = () => {
  // Check if we can connect to the backend
  const checkConnection = async () => {
    try {
      const response = await fetch(`${SYSTEM_HEALTH_ENDPOINT}/status`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      return response.ok;
    } catch (error) {
      console.warn('Knowledge Graph API not available:', error.message);
      return false;
    }
  };

  /**
   * Run validation and register results in the knowledge graph
   * @param {Object} options Validation options
   * @returns {Object} Validation results or null if failed
   */
  const runValidation = async (options = {}) => {
    try {
      const connected = await checkConnection();
      
      if (!connected) {
        console.warn('Knowledge Graph not available, returning mock data');
        return null;
      }
      
      const response = await fetch(`${FILE_ORGANIZATION_ENDPOINT}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detailed: options.detailed !== false,
          include_orphaned: options.includeOrphaned !== false,
          include_duplicates: options.includeDuplicates !== false,
          include_references: options.includeReferences !== false,
          include_organization: options.includeOrganization !== false,
          register_in_kg: true // Ensure results are registered in KG
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error running validation:', error);
      return null;
    }
  };
  
  /**
   * Fix a specific issue and update the knowledge graph
   * @param {string} category Issue category
   * @param {string} issueId Issue ID to fix
   * @param {string} action Action to take
   * @returns {Object} Fix result or null if failed
   */
  const fixIssue = async (category, issueId, action) => {
    try {
      const connected = await checkConnection();
      
      if (!connected) {
        console.warn('Knowledge Graph not available for issue fixing');
        return null;
      }
      
      const response = await fetch(`${FILE_ORGANIZATION_ENDPOINT}/fix-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          issueId,
          action,
          update_kg: true // Update knowledge graph
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fixing issue:', error);
      return null;
    }
  };
  
  /**
   * Fix all issues of a particular type
   * @param {Array<string>} categories Categories to fix
   * @returns {Object} Fix result or null if failed
   */
  const fixAllIssues = async (categories = [
    "duplicateScripts", 
    "orphanedScripts", 
    "poorlyReferencedScripts",
    "scriptOrganizationIssues"
  ]) => {
    try {
      const connected = await checkConnection();
      
      if (!connected) {
        console.warn('Knowledge Graph not available for fixing all issues');
        return null;
      }
      
      const response = await fetch(`${FILE_ORGANIZATION_ENDPOINT}/fix-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories,
          auto_backup: true,
          update_kg: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fixing all issues:', error);
      return null;
    }
  };
  
  /**
   * Get roadmap relationships for an issue
   * @param {string} issueId Issue ID
   * @returns {Array} Roadmap relationships
   */
  const getRoadmapRelationships = async (issueId) => {
    try {
      const connected = await checkConnection();
      
      if (!connected) {
        console.warn('Knowledge Graph not available for roadmap relationships');
        return [];
      }
      
      const response = await fetch(`${SYSTEM_HEALTH_ENDPOINT}/kg/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: issueId,
          direction: "both",
          relation_type: "affects"
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.relationships || [];
    } catch (error) {
      console.error('Error getting roadmap relationships:', error);
      return [];
    }
  };
  
  // Return the connector object
  return {
    runValidation,
    fixIssue,
    fixAllIssues,
    getRoadmapRelationships,
    isAvailable: checkConnection
  };
};

// Default connector instance
export default createKnowledgeGraphConnector();