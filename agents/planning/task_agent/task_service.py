#!/usr/bin/env python3
"""
Task Service for the Task Agent

This module provides services for creating and managing tasks
from features in the knowledge graph.
"""

from typing import Dict, List, Any, Tuple
import os
import sys
import logging
from datetime import datetime

# Determine project root directory dynamically
current_dir = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(current_dir, '..', '..', '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Import knowledge graph connector
try:
    from agents.planning.feature_creation.knowledge_graph_connector import get_knowledge_graph_connector
except ImportError:
    from feature_creation.knowledge_graph_connector import get_knowledge_graph_connector

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(PROJECT_ROOT, 'logs', 'task_service.log'))
    ]
)
logger = logging.getLogger('task_service')

class TaskService:
    """Task service for creating and managing tasks"""
    
    def __init__(self):
        """Initialize the task service"""
        self.kg_connector = get_knowledge_graph_connector()
    
    def extract_tasks_from_feature(self, feature_id: str) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Extract tasks from a feature's requirements and user stories
        
        Args:
            feature_id: ID of the feature
            
        Returns:
            Tuple of success boolean and list of extracted tasks
        """
        try:
            # Get the feature from the knowledge graph
            feature_node = self.kg_connector.kg.get_node(feature_id)
            if not feature_node:
                return False, [{"error": f"Feature {feature_id} not found"}]
            
            properties = feature_node.get("properties", {})
            requirements = properties.get("requirements", [])
            user_stories = properties.get("user_stories", [])
            
            # Extract tasks from requirements
            tasks = []
            for i, req in enumerate(requirements):
                # Skip very short requirements
                if len(req) < 10:
                    continue
                
                task = {
                    "name": f"Implement: {req[:50]}{'...' if len(req) > 50 else ''}",
                    "description": f"Implementation task for requirement: {req}",
                    "status": "not-started",
                    "priority": properties.get("priority", "medium"),
                    "complexity": "medium",
                    "estimated_hours": 4  # Default estimate
                }
                tasks.append(task)
            
            # Extract tasks from user stories
            for i, story in enumerate(user_stories):
                # Skip very short stories
                if len(story) < 10:
                    continue
                
                task = {
                    "name": f"Implement story: {story[:50]}{'...' if len(story) > 50 else ''}",
                    "description": f"Implementation task for user story: {story}",
                    "status": "not-started",
                    "priority": properties.get("priority", "medium"),
                    "complexity": "medium",
                    "estimated_hours": 4  # Default estimate
                }
                tasks.append(task)
            
            return True, tasks
        
        except Exception as e:
            logger.error(f"Error extracting tasks from feature: {str(e)}")
            return False, [{"error": str(e)}]
    
    def create_tasks_for_feature(self, feature_id: str) -> Tuple[bool, List[str]]:
        """
        Create tasks for a feature based on its requirements and user stories
        
        Args:
            feature_id: ID of the feature
            
        Returns:
            Tuple of success boolean and list of created task IDs
        """
        try:
            # Extract tasks from feature
            success, tasks = self.extract_tasks_from_feature(feature_id)
            if not success:
                return False, [tasks[0].get("error")]
            
            if not tasks:
                return False, ["No tasks could be extracted from feature"]
            
            # Create each task in the knowledge graph
            created_task_ids = []
            for task in tasks:
                success, task_id = self.kg_connector.add_task_to_feature(feature_id, task)
                if success:
                    created_task_ids.append(task_id)
            
            return True, created_task_ids
        
        except Exception as e:
            logger.error(f"Error creating tasks for feature: {str(e)}")
            return False, [str(e)]
    
    def get_tasks_for_feature(self, feature_id: str) -> List[Dict[str, Any]]:
        """
        Get all tasks for a feature
        
        Args:
            feature_id: ID of the feature
            
        Returns:
            List of task dictionaries
        """
        return self.kg_connector.get_feature_tasks(feature_id)
    
    def update_task_status(self, task_id: str, status: str) -> Tuple[bool, str]:
        """
        Update a task's status
        
        Args:
            task_id: ID of the task
            status: New status
            
        Returns:
            Tuple of success boolean and message
        """
        return self.kg_connector.update_task(task_id, {"status": status})
    
    def generate_tasks_from_requirements(self, feature_id: str) -> Tuple[bool, List[str]]:
        """
        Generate tasks from feature requirements
        
        Args:
            feature_id: ID of the feature
            
        Returns:
            Tuple of success boolean and list of created task IDs
        """
        return self.kg_connector.generate_tasks_from_requirements(feature_id)
    
    def get_feature_completion_status(self, feature_id: str) -> Dict[str, Any]:
        """
        Get completion status of a feature based on task status
        
        Args:
            feature_id: ID of the feature
            
        Returns:
            Dictionary with completion statistics
        """
        tasks = self.get_tasks_for_feature(feature_id)
        
        if not tasks:
            return {
                "total_tasks": 0,
                "completed": 0,
                "in_progress": 0,
                "not_started": 0,
                "blocked": 0,
                "percent_complete": 0
            }
        
        # Count status
        status_counts = {
            "completed": 0,
            "in-progress": 0,
            "not-started": 0,
            "blocked": 0
        }
        
        for task in tasks:
            status = task.get("status", "not-started")
            if status in status_counts:
                status_counts[status] += 1
            else:
                status_counts["not-started"] += 1
        
        total = len(tasks)
        percent_complete = (status_counts["completed"] / total * 100) if total > 0 else 0
        
        return {
            "total_tasks": total,
            "completed": status_counts["completed"],
            "in_progress": status_counts["in-progress"],
            "not_started": status_counts["not-started"],
            "blocked": status_counts["blocked"],
            "percent_complete": round(percent_complete, 2)
        }

# Create singleton instance
_task_service_instance = None

def get_task_service() -> TaskService:
    """
    Get the singleton instance of the task service
    
    Returns:
        TaskService instance
    """
    global _task_service_instance
    if _task_service_instance is None:
        _task_service_instance = TaskService()
    return _task_service_instance