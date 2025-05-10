# Relationship Agent Integration

This document provides a detailed example of how to integrate a new Relationship Agent into the existing agentic architecture. The Relationship Agent analyzes relationships between features and tasks, suggesting dependencies and integration points.

## Table of Contents

- [Agent Overview](#agent-overview)
- [Implementation](#implementation)
- [API Integration](#api-integration)
- [UI Integration](#ui-integration)
- [Workflow Examples](#workflow-examples)

## Agent Overview

### Purpose

The Relationship Agent analyzes relationships between features and tasks to identify dependencies, integration points, and potential conflicts. It helps ensure that features are implemented in the correct order and that all dependencies are properly managed.

### Responsibilities

- Identify dependencies between features
- Suggest optimal implementation order
- Detect potential conflicts between features
- Analyze task dependencies within and across features
- Track dependency status (satisfied/unsatisfied)
- Provide dependency visualizations

### Integration Points

- **Feature Creation Agent**: Receives new features for dependency analysis
- **Task Agent**: Receives new tasks and updates task dependencies
- **Knowledge Graph**: Stores and retrieves relationship data

## Implementation

### Core Agent Structure

```python
#!/usr/bin/env python3
"""
Relationship Agent

This agent analyzes relationships between features and tasks,
identifying dependencies and integration points.
"""

import os
import sys
import json
import logging
from typing import Dict, List, Any, Optional

# Add project root to path
PROJECT_ROOT = '/mnt/c/Users/angel/Devloop'
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(PROJECT_ROOT, 'logs', 'relationship_agent.log'))
    ]
)
logger = logging.getLogger('relationship_agent')

# Import knowledge graph connector
from agents.planning.feature_creation.knowledge_graph_connector import get_knowledge_graph_connector

# Import agent communication service
from agents.utils.agent_communication import AgentCommunicationService, AgentMessage

class RelationshipAgent:
    """
    Agent responsible for analyzing relationships between features and tasks,
    identifying dependencies and integration points.
    """
    
    def __init__(self):
        """Initialize the Relationship Agent"""
        self.agent_id = "relationship_agent"
        self.agent_name = "Relationship Agent"
        self.version = "1.0.0"
        
        # Initialize tools and services
        self.kg_connector = get_knowledge_graph_connector()
        self.communication_service = AgentCommunicationService()
        
        logger.info(f"Initialized {self.agent_name} v{self.version}")
    
    def analyze_feature_dependencies(self, feature_id: str) -> Dict[str, Any]:
        """
        Analyze a feature to identify dependencies
        
        Args:
            feature_id: ID of the feature to analyze
            
        Returns:
            Dictionary with dependency analysis results
        """
        logger.info(f"Analyzing dependencies for feature {feature_id}")
        
        try:
            # Get the feature from the knowledge graph
            feature = self.kg_connector.kg.get_node(feature_id)
            if not feature:
                return {
                    "success": False,
                    "message": f"Feature {feature_id} not found"
                }
            
            # Extract feature properties
            properties = feature.get("properties", {})
            name = properties.get("name", "")
            description = properties.get("description", "")
            requirements = properties.get("requirements", [])
            domain = properties.get("domain", "")
            
            # Get all features to check for dependencies
            all_features = self.kg_connector.kg.get_nodes_by_type("feature")
            
            # Identify potential dependencies
            dependencies = []
            for other_feature in all_features:
                if other_feature.get("id") == feature_id:
                    continue  # Skip the feature itself
                
                # Calculate potential dependency based on keyword matching, domain, etc.
                dependency_score = self._calculate_dependency_score(
                    feature, other_feature
                )
                
                if dependency_score > 0.5:  # Threshold for dependency suggestion
                    dependencies.append({
                        "feature_id": other_feature.get("id"),
                        "feature_name": other_feature.get("properties", {}).get("name", ""),
                        "dependency_type": "requires" if dependency_score > 0.8 else "may_require",
                        "confidence": dependency_score
                    })
            
            # Create dependency relationships in the knowledge graph
            for dependency in dependencies:
                if dependency["dependency_type"] == "requires":
                    # Feature requires the dependency
                    self.kg_connector.kg.add_edge(
                        source=feature_id,
                        target=dependency["feature_id"],
                        edge_type="feature_depends_on",
                        properties={
                            "dependency_type": "requires",
                            "confidence": dependency["confidence"]
                        }
                    )
            
            return {
                "success": True,
                "feature_id": feature_id,
                "feature_name": name,
                "dependencies": dependencies,
                "suggested_implementation_order": self._suggest_implementation_order(
                    feature_id, dependencies
                )
            }
        
        except Exception as e:
            logger.error(f"Error analyzing dependencies: {str(e)}")
            return {
                "success": False,
                "message": f"Error analyzing dependencies: {str(e)}"
            }
    
    def analyze_task_dependencies(self, feature_id: str, tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze tasks to identify dependencies between them
        
        Args:
            feature_id: ID of the feature
            tasks: List of tasks
            
        Returns:
            Dictionary with task dependency analysis results
        """
        logger.info(f"Analyzing task dependencies for feature {feature_id}")
        
        try:
            # Get the feature from the knowledge graph
            feature = self.kg_connector.kg.get_node(feature_id)
            if not feature:
                return {
                    "success": False,
                    "message": f"Feature {feature_id} not found"
                }
            
            # Identify task dependencies
            task_dependencies = []
            for i, task in enumerate(tasks):
                for j, other_task in enumerate(tasks):
                    if i == j:
                        continue  # Skip self-dependency
                    
                    # Calculate dependency score between tasks
                    dependency_score = self._calculate_task_dependency_score(
                        task, other_task
                    )
                    
                    if dependency_score > 0.6:  # Threshold for task dependency
                        task_dependencies.append({
                            "source_task_id": task.get("id"),
                            "target_task_id": other_task.get("id"),
                            "confidence": dependency_score
                        })
            
            # Create task dependency relationships in the knowledge graph
            for dependency in task_dependencies:
                self.kg_connector.kg.add_edge(
                    source=dependency["source_task_id"],
                    target=dependency["target_task_id"],
                    edge_type="task_depends_on",
                    properties={
                        "confidence": dependency["confidence"]
                    }
                )
            
            # Suggest optimal task order
            task_order = self._suggest_task_order(tasks, task_dependencies)
            
            return {
                "success": True,
                "feature_id": feature_id,
                "task_dependencies": task_dependencies,
                "suggested_task_order": task_order
            }
        
        except Exception as e:
            logger.error(f"Error analyzing task dependencies: {str(e)}")
            return {
                "success": False,
                "message": f"Error analyzing task dependencies: {str(e)}"
            }
    
    def handle_agent_message(self, message: AgentMessage) -> Dict[str, Any]:
        """
        Handle a message from another agent
        
        Args:
            message: The agent message
            
        Returns:
            Dictionary with handling result
        """
        logger.info(f"Received message from {message.sender}: {message.action}")
        
        try:
            if message.action == "analyze_dependencies":
                feature_id = message.data.get("feature_id")
                tasks = message.data.get("tasks", [])
                
                # Analyze feature dependencies
                feature_deps = self.analyze_feature_dependencies(feature_id)
                
                # Analyze task dependencies if tasks are provided
                task_deps = None
                if tasks:
                    task_deps = self.analyze_task_dependencies(feature_id, tasks)
                
                return {
                    "success": True,
                    "feature_dependencies": feature_deps,
                    "task_dependencies": task_deps
                }
            
            elif message.action == "feature_completed":
                feature_id = message.data.get("feature_id")
                
                # Update dependency status for features that depend on this one
                self._update_dependency_status(feature_id)
                
                return {
                    "success": True,
                    "message": f"Updated dependency status for feature {feature_id}"
                }
            
            else:
                return {
                    "success": False,
                    "message": f"Unknown action: {message.action}"
                }
        
        except Exception as e:
            logger.error(f"Error handling agent message: {str(e)}")
            return {
                "success": False,
                "message": f"Error handling agent message: {str(e)}"
            }
    
    def _calculate_dependency_score(self, feature: Dict[str, Any], other_feature: Dict[str, Any]) -> float:
        """
        Calculate a dependency score between two features
        
        Args:
            feature: The feature being analyzed
            other_feature: Another feature to check for dependency
            
        Returns:
            Dependency score between 0 and 1
        """
        # This is a simplified implementation
        # A real implementation would use NLP and more sophisticated analysis
        
        score = 0.0
        
        # Extract properties
        f_props = feature.get("properties", {})
        o_props = other_feature.get("properties", {})
        
        # Check if domains match
        if f_props.get("domain") == o_props.get("domain"):
            score += 0.2
        
        # Check for keyword matches in name and description
        f_text = f"{f_props.get('name', '')} {f_props.get('description', '')}".lower()
        o_name = o_props.get('name', '').lower()
        
        if o_name in f_text:
            score += 0.5
        
        # Check requirements for mentions of the other feature
        for req in f_props.get("requirements", []):
            if o_name in req.lower():
                score += 0.3
                break
        
        # Cap score at 1.0
        return min(score, 1.0)
    
    def _calculate_task_dependency_score(self, task: Dict[str, Any], other_task: Dict[str, Any]) -> float:
        """
        Calculate a dependency score between two tasks
        
        Args:
            task: The task being analyzed
            other_task: Another task to check for dependency
            
        Returns:
            Dependency score between 0 and 1
        """
        # This is a simplified implementation
        # A real implementation would use task analysis patterns
        
        score = 0.0
        
        # Check task types - design tasks typically come before implementation
        task_name = task.get("name", "").lower()
        other_task_name = other_task.get("name", "").lower()
        
        # Design tasks should come before implementation
        if "design" in task_name and "implement" in other_task_name:
            score += 0.7
        
        # Implementation before testing
        if "implement" in task_name and "test" in other_task_name:
            score += 0.7
        
        # Documentation usually comes last
        if "document" in other_task_name:
            score += 0.5
        
        # Generic keywords that might indicate dependency
        dependency_keywords = ["first", "before", "prerequisite", "depends", "required"]
        for keyword in dependency_keywords:
            if keyword in task.get("description", "").lower():
                score += 0.3
                break
        
        # Cap score at 1.0
        return min(score, 1.0)
    
    def _suggest_implementation_order(self, feature_id: str, dependencies: List[Dict[str, Any]]) -> List[str]:
        """
        Suggest an optimal implementation order based on dependencies
        
        Args:
            feature_id: ID of the feature
            dependencies: List of dependencies
            
        Returns:
            List of feature IDs in suggested implementation order
        """
        # Start with required dependencies
        required_deps = [
            dep["feature_id"] for dep in dependencies 
            if dep["dependency_type"] == "requires"
        ]
        
        # Add the feature itself
        order = required_deps + [feature_id]
        
        # Add potential dependencies after
        potential_deps = [
            dep["feature_id"] for dep in dependencies 
            if dep["dependency_type"] == "may_require" and dep["feature_id"] not in order
        ]
        
        return order + potential_deps
    
    def _suggest_task_order(self, tasks: List[Dict[str, Any]], dependencies: List[Dict[str, Any]]) -> List[str]:
        """
        Suggest an optimal task order based on dependencies
        
        Args:
            tasks: List of tasks
            dependencies: List of task dependencies
            
        Returns:
            List of task IDs in suggested implementation order
        """
        # Simple topological sort
        # In a real implementation, this would be more sophisticated
        
        # Create dependency graph
        graph = {}
        for task in tasks:
            task_id = task.get("id")
            graph[task_id] = []
        
        for dep in dependencies:
            source = dep["source_task_id"]
            target = dep["target_task_id"]
            if source in graph:
                graph[source].append(target)
        
        # Perform topological sort
        visited = set()
        temp = set()
        order = []
        
        def visit(node):
            if node in temp:
                return  # Cycle detected, skip
            if node in visited:
                return
            
            temp.add(node)
            
            for neighbor in graph.get(node, []):
                visit(neighbor)
            
            temp.remove(node)
            visited.add(node)
            order.append(node)
        
        for node in graph:
            if node not in visited:
                visit(node)
        
        # Reverse the order
        return order[::-1]
    
    def _update_dependency_status(self, feature_id: str) -> None:
        """
        Update dependency status for features that depend on this one
        
        Args:
            feature_id: ID of the completed feature
        """
        # Get features that depend on this one
        dependent_edges = self.kg_connector.kg.get_edges_by_type(
            "feature_depends_on", target=feature_id
        )
        
        for edge in dependent_edges:
            source_id = edge.get("source")
            
            # Update the dependency status
            edge_properties = edge.get("properties", {})
            edge_properties["status"] = "satisfied"
            edge_properties["satisfied_at"] = datetime.now().isoformat()
            
            # Update the edge in the knowledge graph
            self.kg_connector.kg.update_edge(
                source=source_id,
                target=feature_id,
                edge_type="feature_depends_on",
                properties=edge_properties
            )
            
            logger.info(f"Updated dependency status for feature {source_id} -> {feature_id}")


def main():
    """Main function for command-line usage"""
    import argparse
    from datetime import datetime
    
    parser = argparse.ArgumentParser(description="Relationship Agent")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Analyze feature dependencies command
    analyze_parser = subparsers.add_parser("analyze", help="Analyze feature dependencies")
    analyze_parser.add_argument("feature_id", help="ID of the feature")
    
    # Analyze task dependencies command
    task_parser = subparsers.add_parser("tasks", help="Analyze task dependencies")
    task_parser.add_argument("feature_id", help="ID of the feature")
    task_parser.add_argument("tasks_file", help="JSON file containing tasks")
    
    # Handle message command
    message_parser = subparsers.add_parser("message", help="Handle a message from another agent")
    message_parser.add_argument("message_file", help="JSON file containing the message")
    
    args = parser.parse_args()
    
    # Initialize the agent
    agent = RelationshipAgent()
    
    # Process command
    if args.command == "analyze":
        result = agent.analyze_feature_dependencies(args.feature_id)
        print(json.dumps(result, indent=2))
    
    elif args.command == "tasks":
        with open(args.tasks_file, 'r') as f:
            tasks = json.load(f)
        
        result = agent.analyze_task_dependencies(args.feature_id, tasks)
        print(json.dumps(result, indent=2))
    
    elif args.command == "message":
        with open(args.message_file, 'r') as f:
            message_data = json.load(f)
        
        # Convert to AgentMessage
        message = AgentMessage(
            sender=message_data.get("sender"),
            action=message_data.get("action"),
            data=message_data.get("data", {}),
            timestamp=message_data.get("timestamp", datetime.now().isoformat())
        )
        
        result = agent.handle_agent_message(message)
        print(json.dumps(result, indent=2))
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
```

## API Integration

### Add Relationship Agent Routes

Create a file at `/api/routes/relationship-agent-routes.js`:

```javascript
/**
 * Relationship Agent Routes
 * 
 * This module provides API routes for the Relationship Agent.
 * It allows for analyzing relationships between features and tasks.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Constants
const PROJECT_ROOT = '/mnt/c/Users/angel/Devloop';
const AGENT_DIR = path.join(PROJECT_ROOT, 'agents', 'planning', 'relationship_agent');
const AGENT_SCRIPT = path.join(AGENT_DIR, 'relationship_agent.py');

// Configure routes with broadcast capability
const configureRoutes = (broadcastFn, eventTypes) => {
  // Analyze feature dependencies
  router.post('/analyze-feature', async (req, res) => {
    try {
      const { featureId } = req.body;
      
      if (!featureId) {
        return res.status(400).json({
          success: false,
          error: 'Feature ID is required'
        });
      }
      
      // Execute the relationship agent to analyze feature dependencies
      const process = spawn('python3', [
        AGENT_SCRIPT,
        'analyze',
        featureId
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        // Parse the output if possible
        let result;
        
        try {
          result = JSON.parse(stdout);
        } catch (error) {
          result = {
            success: code === 0,
            output: stdout,
            error: stderr
          };
        }
        
        // Broadcast dependency analysis event
        if (result.success) {
          broadcastFn(eventTypes.DEPENDENCY_ANALYZED, {
            feature_id: featureId,
            timestamp: new Date().toISOString()
          }, 'relationships');
        }
        
        res.status(code === 0 ? 200 : 500).json(result);
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Error analyzing feature dependencies: ${error.message}`
      });
    }
  });
  
  // Analyze task dependencies
  router.post('/analyze-tasks', async (req, res) => {
    try {
      const { featureId, tasks } = req.body;
      
      if (!featureId) {
        return res.status(400).json({
          success: false,
          error: 'Feature ID is required'
        });
      }
      
      if (!tasks || !Array.isArray(tasks)) {
        return res.status(400).json({
          success: false,
          error: 'Tasks array is required'
        });
      }
      
      // Create a temporary file for the tasks
      const requestId = uuidv4();
      const tasksPath = path.join(AGENT_DIR, `tasks-${requestId}.json`);
      await fs.writeFile(tasksPath, JSON.stringify(tasks));
      
      // Execute the relationship agent to analyze task dependencies
      const process = spawn('python3', [
        AGENT_SCRIPT,
        'tasks',
        featureId,
        tasksPath
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', async (code) => {
        // Clean up tasks file
        try {
          await fs.unlink(tasksPath);
        } catch (e) {
          console.error(`Error deleting tasks file: ${e.message}`);
        }
        
        // Parse the output if possible
        let result;
        
        try {
          result = JSON.parse(stdout);
        } catch (error) {
          result = {
            success: code === 0,
            output: stdout,
            error: stderr
          };
        }
        
        // Broadcast task dependency analysis event
        if (result.success) {
          broadcastFn(eventTypes.TASK_DEPENDENCIES_ANALYZED, {
            feature_id: featureId,
            task_count: tasks.length,
            timestamp: new Date().toISOString()
          }, 'relationships');
        }
        
        res.status(code === 0 ? 200 : 500).json(result);
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Error analyzing task dependencies: ${error.message}`
      });
    }
  });
  
  // Send message to relationship agent
  router.post('/message', async (req, res) => {
    try {
      const message = req.body;
      
      if (!message || !message.action) {
        return res.status(400).json({
          success: false,
          error: 'Message with action is required'
        });
      }
      
      // Create a temporary file for the message
      const requestId = uuidv4();
      const messagePath = path.join(AGENT_DIR, `message-${requestId}.json`);
      await fs.writeFile(messagePath, JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      }));
      
      // Execute the relationship agent to handle the message
      const process = spawn('python3', [
        AGENT_SCRIPT,
        'message',
        messagePath
      ]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', async (code) => {
        // Clean up message file
        try {
          await fs.unlink(messagePath);
        } catch (e) {
          console.error(`Error deleting message file: ${e.message}`);
        }
        
        // Parse the output if possible
        let result;
        
        try {
          result = JSON.parse(stdout);
        } catch (error) {
          result = {
            success: code === 0,
            output: stdout,
            error: stderr
          };
        }
        
        res.status(code === 0 ? 200 : 500).json(result);
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Error sending message to relationship agent: ${error.message}`
      });
    }
  });
  
  return router;
};

module.exports = {
  configureRoutes
};
```

### Integrate Routes with API Server

Update the server.js file to include the relationship agent routes:

```javascript
// Import relationship agent routes
const relationshipAgentRoutes = require('./routes/relationship-agent-routes');

// Add to routes configuration
app.use('/api/relationship-agent', relationshipAgentRoutes.configureRoutes(broadcastEvent, eventTypes));
```

## UI Integration

### Create Relationship Agent Service

Create a file at `/ui/src/services/relationshipAgentService.js`:

```javascript
/**
 * Relationship Agent Service
 * 
 * Provides methods for interacting with the Relationship Agent API.
 * This service allows the UI to use the Relationship Agent to analyze
 * dependencies between features and tasks.
 */

// Base API URL
const API_BASE_URL = 'http://localhost:8000/api';
const RELATIONSHIP_AGENT_API_URL = `${API_BASE_URL}/relationship-agent`;

/**
 * Analyze dependencies for a feature
 * @param {string} featureId - The ID of the feature to analyze
 * @returns {Promise<Object>} The dependency analysis results
 */
export const analyzeFeatureDependencies = async (featureId) => {
  try {
    // Call the Relationship Agent API
    const response = await fetch(`${RELATIONSHIP_AGENT_API_URL}/analyze-feature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        featureId
      }),
    });

    if (!response.ok) {
      throw new Error(`Error analyzing feature dependencies: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error in analyzeFeatureDependencies for ${featureId}:`, error);
    
    // Return a basic error response
    return {
      success: false,
      message: error.message,
      feature_id: featureId,
      dependencies: []
    };
  }
};

/**
 * Analyze dependencies between tasks
 * @param {string} featureId - The ID of the feature
 * @param {Array} tasks - The tasks to analyze
 * @returns {Promise<Object>} The task dependency analysis results
 */
export const analyzeTaskDependencies = async (featureId, tasks) => {
  try {
    // Call the Relationship Agent API
    const response = await fetch(`${RELATIONSHIP_AGENT_API_URL}/analyze-tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        featureId,
        tasks
      }),
    });

    if (!response.ok) {
      throw new Error(`Error analyzing task dependencies: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error in analyzeTaskDependencies for ${featureId}:`, error);
    
    // Return a basic error response
    return {
      success: false,
      message: error.message,
      feature_id: featureId,
      task_dependencies: []
    };
  }
};

/**
 * Send a message to the Relationship Agent
 * @param {string} senderId - The ID of the sender
 * @param {string} action - The action to perform
 * @param {Object} data - The data for the action
 * @returns {Promise<Object>} The result of the message handling
 */
export const sendAgentMessage = async (senderId, action, data) => {
  try {
    // Call the Relationship Agent API
    const response = await fetch(`${RELATIONSHIP_AGENT_API_URL}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: senderId,
        action,
        data
      }),
    });

    if (!response.ok) {
      throw new Error(`Error sending message to relationship agent: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error in sendAgentMessage:`, error);
    
    // Return a basic error response
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Check if the Relationship Agent is available
 * @returns {Promise<boolean>} Whether the agent is available
 */
export const isRelationshipAgentAvailable = async () => {
  try {
    // Try to send a simple message to check availability
    const response = await fetch(`${RELATIONSHIP_AGENT_API_URL}/analyze-feature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        featureId: 'test-availability'
      }),
    });

    // If we get any response (even an error), the agent is available
    return true;
  } catch (error) {
    console.error('Error checking relationship agent availability:', error);
    return false;
  }
};

export default {
  analyzeFeatureDependencies,
  analyzeTaskDependencies,
  sendAgentMessage,
  isRelationshipAgentAvailable
};
```

### Enhance Feature Agent Service

Update the Feature Agent Service to integrate with the Relationship Agent:

```javascript
// Import relationship agent service
import relationshipAgentService from './relationshipAgentService';

/**
 * Process a feature with all agents
 * @param {Object} featureData - The feature data to process
 * @param {boolean} [generateTasks=true] - Whether to generate tasks
 * @param {boolean} [analyzeDependencies=true] - Whether to analyze dependencies
 * @returns {Promise<Object>} The combined result
 */
export const createFeatureWithAgents = async (
  featureData, 
  generateTasks = true,
  analyzeDependencies = true
) => {
  try {
    // Step 1: Process with Feature Creation Agent
    const featureResult = await processFeature(featureData);
    
    if (!featureResult.success || !featureResult.feature) {
      return {
        success: false,
        message: featureResult.message || 'Failed to create feature',
        feature: null,
        tasks: [],
        dependencies: []
      };
    }
    
    // Track the results
    const result = {
      success: true,
      feature: featureResult.feature,
      tasks: [],
      dependencies: [],
      taskResult: null,
      dependencyResult: null
    };
    
    // Step 2: Generate tasks if requested
    if (generateTasks) {
      try {
        const taskResult = await taskAgentService.processFeatureWithAgent(
          featureResult.feature.id
        );
        
        result.taskResult = taskResult;
        if (taskResult.success) {
          result.tasks = taskResult.tasks || [];
        }
      } catch (taskError) {
        console.error('Error generating tasks:', taskError);
      }
    }
    
    // Step 3: Analyze dependencies if requested
    if (analyzeDependencies) {
      try {
        const dependencyResult = await relationshipAgentService.analyzeFeatureDependencies(
          featureResult.feature.id
        );
        
        result.dependencyResult = dependencyResult;
        if (dependencyResult.success) {
          result.dependencies = dependencyResult.dependencies || [];
        }
        
        // If we have tasks, analyze task dependencies as well
        if (result.tasks.length > 0) {
          const taskDependencyResult = await relationshipAgentService.analyzeTaskDependencies(
            featureResult.feature.id,
            result.tasks
          );
          
          if (taskDependencyResult.success) {
            result.taskDependencies = taskDependencyResult.task_dependencies || [];
          }
        }
      } catch (dependencyError) {
        console.error('Error analyzing dependencies:', dependencyError);
      }
    }
    
    // Build a comprehensive message
    let message = 'Feature created successfully';
    if (result.tasks.length > 0) {
      message += `, generated ${result.tasks.length} tasks`;
    }
    if (result.dependencies.length > 0) {
      message += `, identified ${result.dependencies.length} dependencies`;
    }
    
    result.message = message;
    return result;
  } catch (error) {
    console.error('Error in unified agent processing:', error);
    throw error;
  }
};
```

### Create Dependency Visualization Component

Create a file at `/ui/src/components/features/DependencyGraph.jsx`:

```jsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

/**
 * DependencyGraph Component
 * 
 * Displays a visualization of feature and task dependencies
 * using D3.js for interactive graph rendering.
 */
const DependencyGraph = ({ 
  feature,
  dependencies,
  tasks,
  taskDependencies,
  width = 600,
  height = 400
}) => {
  const svgRef = useRef(null);
  
  useEffect(() => {
    if (!feature || !svgRef.current) return;
    
    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Create nodes and links data structures
    const nodes = [];
    const links = [];
    
    // Add the main feature
    nodes.push({
      id: feature.id,
      name: feature.name,
      type: 'main-feature',
      radius: 25
    });
    
    // Add dependencies
    dependencies.forEach(dep => {
      nodes.push({
        id: dep.feature_id,
        name: dep.feature_name,
        type: 'dependency',
        confidence: dep.confidence,
        radius: 20
      });
      
      links.push({
        source: feature.id,
        target: dep.feature_id,
        type: dep.dependency_type,
        confidence: dep.confidence
      });
    });
    
    // Add tasks if available
    if (tasks && tasks.length > 0) {
      tasks.forEach(task => {
        nodes.push({
          id: task.id,
          name: task.name,
          type: 'task',
          status: task.status,
          radius: 15
        });
        
        // Link tasks to feature
        links.push({
          source: feature.id,
          target: task.id,
          type: 'has-task',
          confidence: 1.0
        });
      });
      
      // Add task dependencies
      if (taskDependencies && taskDependencies.length > 0) {
        taskDependencies.forEach(dep => {
          links.push({
            source: dep.source_task_id,
            target: dep.target_task_id,
            type: 'task-dependency',
            confidence: dep.confidence
          });
        });
      }
    }
    
    // Create the D3 force simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => d.radius + 5));
    
    // Create the SVG elements
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);
    
    // Define arrow marker for links
    svg.append("defs").selectAll("marker")
      .data(["dependency", "requires", "may-require", "task-dependency"])
      .enter().append("marker")
      .attr("id", d => `arrow-${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", d => {
        if (d === "requires") return "#ff5555";
        if (d === "may-require") return "#ffaa00";
        return "#999";
      })
      .attr("d", "M0,-5L10,0L0,5");
    
    // Create links
    const link = svg.append("g")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", d => {
        if (d.type === "requires") return "#ff5555";
        if (d.type === "may-require") return "#ffaa00";
        if (d.type === "task-dependency") return "#5555ff";
        return "#999";
      })
      .attr("stroke-width", d => Math.max(1, d.confidence * 3))
      .attr("marker-end", d => `url(#arrow-${d.type === "requires" ? "requires" : 
                                             d.type === "may-require" ? "may-require" : 
                                             d.type === "task-dependency" ? "task-dependency" : "dependency"})`);
    
    // Create nodes
    const node = svg.append("g")
      .selectAll(".node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
    
    // Add circles for nodes
    node.append("circle")
      .attr("r", d => d.radius)
      .attr("fill", d => {
        if (d.type === "main-feature") return "#4299e1";
        if (d.type === "dependency") return "#ed8936";
        
        // Color tasks by status
        if (d.type === "task") {
          if (d.status === "completed") return "#48bb78";
          if (d.status === "in-progress") return "#ecc94b";
          return "#a0aec0";
        }
        
        return "#a0aec0";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);
    
    // Add labels
    node.append("text")
      .attr("dx", d => d.radius + 5)
      .attr("dy", ".35em")
      .text(d => d.name)
      .style("font-size", "10px")
      .style("fill", "#fff")
      .style("stroke-width", 0);
    
    // Add title for tooltip
    node.append("title")
      .text(d => `${d.name} (${d.id})`);
    
    // Update positions during simulation
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Clean up
    return () => {
      simulation.stop();
    };
  }, [feature, dependencies, tasks, taskDependencies, width, height]);
  
  return (
    <div className="bg-gray-800 p-4 rounded-md">
      <h3 className="text-lg font-semibold text-white mb-4">Dependency Graph</h3>
      <div className="overflow-auto">
        <svg ref={svgRef} className="mx-auto"></svg>
      </div>
    </div>
  );
};

export default DependencyGraph;
```

### Update Feature Details Modal

Enhance the `FeatureDetailsModal.jsx` to include dependency information:

```jsx
import React, { useState, useEffect } from 'react';
import { analyzeFeatureDependencies } from '../../services/relationshipAgentService';
import DependencyGraph from './DependencyGraph';

// In the component:
const [dependencies, setDependencies] = useState([]);
const [isAnalyzingDeps, setIsAnalyzingDeps] = useState(false);

// Add a function to load dependencies
const loadDependencies = async () => {
  if (!feature || !feature.id) return;
  
  setIsAnalyzingDeps(true);
  try {
    const result = await analyzeFeatureDependencies(feature.id);
    if (result.success) {
      setDependencies(result.dependencies || []);
    }
  } catch (error) {
    console.error('Error loading dependencies:', error);
  } finally {
    setIsAnalyzingDeps(false);
  }
};

// Add a button to analyze dependencies
<button
  onClick={loadDependencies}
  disabled={isAnalyzingDeps}
  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md"
>
  {isAnalyzingDeps ? 'Analyzing...' : 'Analyze Dependencies'}
</button>

// Add the dependency section
{dependencies.length > 0 && (
  <div className="mt-6">
    <h3 className="text-lg font-semibold mb-2">Dependencies</h3>
    <DependencyGraph
      feature={feature}
      dependencies={dependencies}
      tasks={tasks}
      taskDependencies={taskDependencies}
    />
    
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      {dependencies.map(dep => (
        <div key={dep.feature_id} className="bg-gray-700 p-3 rounded-md">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium">{dep.feature_name}</h4>
              <div className="text-sm text-gray-400">{dep.feature_id}</div>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs ${
              dep.dependency_type === 'requires' 
                ? 'bg-red-900 text-red-200' 
                : 'bg-yellow-900 text-yellow-200'
            }`}>
              {dep.dependency_type}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-sm">Confidence: {Math.round(dep.confidence * 100)}%</div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

## Workflow Examples

### 1. Creating a Feature with Dependencies

```javascript
// In the Feature Creator component
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  
  try {
    // Process feature with all agents
    const result = await featureAgentService.createFeatureWithAgents(
      formData,
      true,  // Generate tasks
      true   // Analyze dependencies
    );
    
    if (result.success) {
      // Display success message with task and dependency counts
      setResult({
        success: true,
        message: result.message,
        feature: result.feature,
        taskCount: result.tasks.length,
        dependencyCount: result.dependencies.length
      });
    } else {
      setError(result.message || 'Failed to create feature');
    }
  } catch (error) {
    setError(error.message);
  } finally {
    setIsSubmitting(false);
  }
};
```

### 2. Analyzing Dependencies for Existing Features

```javascript
// In the Roadmap component
const handleAnalyzeDependencies = async (feature) => {
  setIsAnalyzing(true);
  
  try {
    // Analyze dependencies for the feature
    const result = await relationshipAgentService.analyzeFeatureDependencies(feature.id);
    
    if (result.success) {
      // Open the feature details modal with dependencies
      setSelectedFeature({
        ...feature,
        dependencies: result.dependencies
      });
      setShowFeatureModal(true);
    } else {
      setError(result.message || 'Failed to analyze dependencies');
    }
  } catch (error) {
    setError(error.message);
  } finally {
    setIsAnalyzing(false);
  }
};
```

### 3. Task Dependency Management

```javascript
// In the Tasks Tab component
const handleAnalyzeTaskDependencies = async () => {
  if (!feature || !feature.id || tasks.length === 0) return;
  
  setAnalyzingTasks(true);
  
  try {
    // Analyze task dependencies
    const result = await relationshipAgentService.analyzeTaskDependencies(
      feature.id,
      tasks
    );
    
    if (result.success) {
      // Update the task list with dependency information
      setTaskDependencies(result.task_dependencies || []);
      setShowDependencyGraph(true);
    } else {
      setError(result.message || 'Failed to analyze task dependencies');
    }
  } catch (error) {
    setError(error.message);
  } finally {
    setAnalyzingTasks(false);
  }
};
```

This integration example demonstrates how to extend the agentic architecture with a new Relationship Agent that analyzes dependencies between features and tasks, suggesting optimal implementation order and providing visualizations.

By following a similar pattern, you can integrate additional agents into the architecture to provide specialized functionality while maintaining a cohesive system design.