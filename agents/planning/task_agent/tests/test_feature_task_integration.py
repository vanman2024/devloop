#!/usr/bin/env python3
"""
Test the integration between Feature Creation and Task Agents
"""

import os
import sys
import json
import logging
from datetime import datetime

# Determine project root directory dynamically
current_dir = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(current_dir, '..', '..', '..', '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Import connectors and agents
try:
    from agents.planning.feature_creation.knowledge_graph_connector import get_knowledge_graph_connector
    from agents.planning.task_agent.task_agent import TaskAgent
except ImportError:
    sys.path.append(os.path.normpath(os.path.join(current_dir, '..')))
    from agents.planning.feature_creation.knowledge_graph_connector import get_knowledge_graph_connector
    from task_agent import TaskAgent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('test_integration')

def test_feature_task_integration():
    """Test the integration between feature creation and task agents"""
    
    # Get the knowledge graph connector
    kg_connector = get_knowledge_graph_connector()
    
    # Initialize task agent
    task_agent = TaskAgent()
    
    # Create a test feature
    feature_id = f"feature-test-{int(datetime.now().timestamp())}"
    feature_data = {
        "id": feature_id,
        "name": "Test Feature with Tasks",
        "description": "This is a test feature to validate task integration between the Feature Creation Agent and Task Agent.",
        "milestone": "milestone-test",
        "phase": "phase-01",
        "module": "test-module",
        "domain": "testing",
        "purpose": "testing",
        "tags": ["test", "integration", "task"],
        "requirements": [
            "The system must create tasks from feature requirements",
            "The system must associate tasks with features in the knowledge graph",
            "The system must update task status in the knowledge graph",
            "The system must analyze task dependencies",
            "The system must generate task summaries"
        ],
        "user_stories": [
            "As a developer, I want to break down features into tasks, so that I can track implementation progress",
            "As a project manager, I want to see tasks associated with features, so that I can monitor progress",
            "As a team lead, I want to see task dependencies, so that I can plan the implementation sequence"
        ],
        "priority": "high",
        "effort_estimate": "medium",
        "risk_level": "low",
        "test_coverage": 90,
        "version": "1.0.0",
        "stakeholders": ["testing-team", "developers"]
    }
    
    # Add the feature to the knowledge graph
    logger.info(f"Creating test feature {feature_id}")
    success, result = kg_connector.add_feature(feature_data)
    
    if not success:
        logger.error(f"Failed to create feature: {result}")
        return False
    
    logger.info(f"Feature created successfully: {result}")
    
    # Process the feature with the task agent
    logger.info(f"Processing feature with Task Agent")
    task_result = task_agent.process_feature(feature_id)
    
    if not task_result.get("success", False):
        logger.error(f"Failed to process feature with Task Agent: {task_result.get('message')}")
        return False
    
    logger.info(f"Feature processed successfully, created {len(task_result.get('tasks', []))} tasks")
    
    # Print task summary
    logger.info(task_result.get("summary", "No summary generated"))
    
    # Test updating a task status
    tasks = task_result.get("tasks", [])
    if tasks:
        task_id = tasks[0]["id"]
        logger.info(f"Updating status of task {task_id} to 'in-progress'")
        update_result = task_agent.update_task(task_id, "in-progress")
        if not update_result.get("success", False):
            logger.error(f"Failed to update task status: {update_result.get('message')}")
        else:
            logger.info(f"Task status updated: {update_result.get('message')}")
    
    # Get tasks and completion status
    feature_tasks = task_agent.get_feature_tasks(feature_id)
    logger.info(f"Feature has {feature_tasks.get('task_count', 0)} tasks")
    logger.info(f"Completion status: {json.dumps(feature_tasks.get('completion_status', {}), indent=2)}")
    
    # Print agent thoughts
    logger.info("Agent thoughts:")
    for thought in feature_tasks.get("agent_thoughts", []):
        logger.info(f" - {thought.get('thought')}")
    
    return True

if __name__ == "__main__":
    if test_feature_task_integration():
        logger.info("Integration test completed successfully")
    else:
        logger.error("Integration test failed")