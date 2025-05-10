#!/usr/bin/env python3
"""
Task Agent for Devloop

This module implements the Task Agent which is responsible for creating and managing
tasks from features in the knowledge graph using AI-powered task extraction,
planning, and management.
"""

import os
import sys
import json
import logging
import argparse
import time
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

# Determine project root directory dynamically
current_dir = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(current_dir, '..', '..', '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Import task service
from task_service import get_task_service

# Import LLM connector and agent utilities
try:
    from agents.planning.feature_creation.llm_connector import LLMConnector
except ImportError:
    try:
        from agents.sdk.utils.ai_service.core import AIServiceConnector as LLMConnector
    except ImportError:
        from agents.utils.ai_service.core import AIServiceConnector as LLMConnector

# Try to import the agent communication service
try:
    from agents.utils.agent_communication import AgentCommunicationService, AgentMessage
    AGENT_COMMUNICATION_AVAILABLE = True
except ImportError:
    AGENT_COMMUNICATION_AVAILABLE = False
    # Create a basic implementation
    class AgentMessage:
        def __init__(self, sender, recipient, content, message_type="task"):
            self.sender = sender
            self.recipient = recipient
            self.content = content
            self.message_type = message_type
            self.timestamp = datetime.now().isoformat()
            
    class AgentCommunicationService:
        def __init__(self):
            self.messages = []
            
        def send_message(self, message):
            self.messages.append(message)
            return True, "Message sent"
            
        def get_messages(self, recipient, limit=10):
            return [m for m in self.messages if m.recipient == recipient][-limit:]

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(PROJECT_ROOT, 'logs', 'task_agent.log'))
    ]
)
logger = logging.getLogger('task_agent')

class TaskAgent:
    """AI-powered Task Agent for creating and managing tasks"""
    
    def __init__(self):
        """Initialize the task agent with AI capabilities"""
        self.task_service = get_task_service()
        self.llm = LLMConnector()
        
        # Agent communication for handoffs
        if AGENT_COMMUNICATION_AVAILABLE:
            self.communication_service = AgentCommunicationService()
        else:
            self.communication_service = AgentCommunicationService()
            
        self.agent_id = "task_agent"
        
        # Initialize memory for agent reasoning
        self.memory = {
            "processed_features": {},
            "task_history": [],
            "agent_thoughts": []
        }
        
        # Task templates for generation
        self.templates = self._load_templates()
        
        logger.info("Task Agent initialized with AI capabilities")
    
    def _load_templates(self) -> Dict[str, Any]:
        """Load task templates based on domain and purpose"""
        templates_path = os.path.join(os.path.dirname(__file__), "templates", "task_templates.json")
        
        # Use default templates if file doesn't exist
        if not os.path.exists(templates_path):
            logger.warning(f"Templates file not found at {templates_path}, using defaults")
            return {
                "ui": [
                    "Create UI component design",
                    "Implement component skeleton",
                    "Add styling and layout",
                    "Implement component behavior",
                    "Connect to data sources",
                    "Add error handling",
                    "Write unit tests",
                    "Document component usage"
                ],
                "api": [
                    "Define API endpoints",
                    "Implement route handlers",
                    "Add request validation",
                    "Implement business logic",
                    "Connect to data sources",
                    "Add error handling",
                    "Implement authentication/authorization",
                    "Write API tests",
                    "Document API endpoints"
                ],
                "default": [
                    "Analyze requirements",
                    "Create design document",
                    "Implement core functionality",
                    "Add error handling",
                    "Write tests",
                    "Document usage"
                ]
            }
            
        # Load templates from file
        try:
            with open(templates_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading templates: {e}")
            return {"default": ["Implement functionality", "Write tests", "Document usage"]}
    
    def _save_agent_thought(self, thought: str, feature_id: str = None):
        """Save an agent thought to memory"""
        thought_entry = {
            "timestamp": datetime.now().isoformat(),
            "thought": thought,
            "feature_id": feature_id
        }
        self.memory["agent_thoughts"].append(thought_entry)
        logger.info(f"Agent thought: {thought}")
    
    def _extract_tasks_with_llm(self, feature_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Use LLM to extract tasks from feature data
        
        Args:
            feature_data: Feature data dictionary
            
        Returns:
            List of extracted tasks
        """
        # Log agent thought process
        self._save_agent_thought(
            f"Analyzing feature '{feature_data.get('name')}' to extract meaningful tasks",
            feature_data.get('id')
        )
        
        # Prepare the prompt
        prompt = f"""
        You are a task planning expert. Given a feature description, extract well-defined tasks
        that would be needed to implement this feature. Focus on creating practical, 
        actionable tasks with clear scope.
        
        Feature Information:
        - Name: {feature_data.get('name', 'Unnamed Feature')}
        - Description: {feature_data.get('description', 'No description provided')}
        - Domain: {feature_data.get('domain', 'unknown')}
        - Purpose: {feature_data.get('purpose', 'enhancement')}
        
        Requirements:
        {json.dumps(feature_data.get('requirements', []), indent=2)}
        
        User Stories:
        {json.dumps(feature_data.get('user_stories', []), indent=2)}
        
        Based on this information, please generate a list of tasks needed to implement this feature.
        For each task, provide:
        - A clear name (task title)
        - A detailed description
        - Appropriate priority (high, medium, low)
        - Complexity estimate (high, medium, low)
        - Estimated hours to complete
        
        Format your response as a JSON array of task objects, like this:
        ```json
        [
          {{
            "name": "Task name",
            "description": "Detailed task description",
            "priority": "medium",
            "complexity": "medium",
            "estimated_hours": 4
          }},
          ...
        ]
        ```
        Include at least 3-7 tasks, depending on the feature complexity.
        """
        
        # Get LLM response
        try:
            response = self.llm.generate(prompt)
            
            # Extract JSON from response
            try:
                # Find JSON part in the response
                json_start = response.find('[')
                json_end = response.rfind(']') + 1
                
                if json_start >= 0 and json_end > json_start:
                    tasks_json = response[json_start:json_end]
                    tasks = json.loads(tasks_json)
                    
                    # Validate tasks
                    validated_tasks = []
                    for task in tasks:
                        if isinstance(task, dict) and "name" in task and "description" in task:
                            # Ensure all required fields exist
                            task["priority"] = task.get("priority", "medium")
                            task["complexity"] = task.get("complexity", "medium")
                            task["estimated_hours"] = task.get("estimated_hours", 4)
                            validated_tasks.append(task)
                    
                    self._save_agent_thought(
                        f"Extracted {len(validated_tasks)} tasks using AI task analysis",
                        feature_data.get('id')
                    )
                    return validated_tasks
                else:
                    logger.error("Could not find JSON array in LLM response")
            except json.JSONDecodeError as e:
                logger.error(f"Error decoding JSON from LLM response: {e}")
        except Exception as e:
            logger.error(f"Error generating tasks with LLM: {e}")
        
        # Fallback to template-based extraction
        self._save_agent_thought(
            "LLM task extraction failed, falling back to template-based extraction",
            feature_data.get('id')
        )
        return self._extract_tasks_from_templates(feature_data)
    
    def _extract_tasks_from_templates(self, feature_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract tasks using templates based on feature domain
        
        Args:
            feature_data: Feature data dictionary
            
        Returns:
            List of extracted tasks
        """
        domain = feature_data.get("domain", "unknown")
        templates = self.templates.get(domain, self.templates.get("default", []))
        
        tasks = []
        for template in templates:
            task = {
                "name": f"{template} for {feature_data.get('name', 'feature')}",
                "description": f"{template} required to implement {feature_data.get('name', 'the feature')}",
                "priority": feature_data.get("priority", "medium"),
                "complexity": "medium",
                "estimated_hours": 4  # Default estimate
            }
            tasks.append(task)
        
        return tasks
    
    def _analyze_task_dependencies(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Analyze dependencies between tasks
        
        Args:
            tasks: List of tasks
            
        Returns:
            List of tasks with dependencies
        """
        # This would ideally use LLM to analyze dependencies
        # For now, we'll use a simple heuristic approach
        
        # Sort tasks by their natural sequence
        tasks_with_deps = []
        
        # Common task orders by keyword matching
        design_tasks = []
        implementation_tasks = []
        testing_tasks = []
        documentation_tasks = []
        
        for task in tasks:
            name = task.get("name", "").lower()
            
            if any(kw in name for kw in ["design", "plan", "architect", "sketch"]):
                design_tasks.append(task)
            elif any(kw in name for kw in ["test", "validate", "verify"]):
                testing_tasks.append(task)
            elif any(kw in name for kw in ["document", "docs"]):
                documentation_tasks.append(task)
            else:
                implementation_tasks.append(task)
        
        # Add tasks in sequence with dependencies
        prev_task_id = None
        
        # Process tasks in logical order: design -> implementation -> testing -> documentation
        for task_list in [design_tasks, implementation_tasks, testing_tasks, documentation_tasks]:
            for task in task_list:
                # If we have a previous task, add it as a dependency
                if prev_task_id:
                    task["depends_on"] = [prev_task_id]
                
                task_id = task.get("id")
                if task_id:
                    prev_task_id = task_id
                
                tasks_with_deps.append(task)
        
        return tasks_with_deps
    
    def process_feature(self, feature_id: str, use_llm: bool = True) -> Dict[str, Any]:
        """
        Process a feature to generate tasks with AI assistance
        
        Args:
            feature_id: ID of the feature
            use_llm: Whether to use LLM for task extraction
            
        Returns:
            Dictionary with processing results
        """
        self._save_agent_thought(f"Processing feature {feature_id}", feature_id)
        
        # Get the feature from the knowledge graph
        try:
            feature_node = self.task_service.kg_connector.kg.get_node(feature_id)
            if not feature_node:
                self._save_agent_thought(f"Feature {feature_id} not found", feature_id)
                return {
                    "success": False,
                    "message": f"Feature {feature_id} not found",
                    "tasks": []
                }
            
            # Get feature data
            properties = feature_node.get("properties", {})
            metadata = feature_node.get("metadata", {})
            
            feature_data = {
                "id": feature_id,
                "name": properties.get("name", ""),
                "description": properties.get("description", ""),
                "status": properties.get("status", "not-started"),
                "tags": properties.get("tags", []),
                "domain": properties.get("domain", "unknown"),
                "purpose": properties.get("purpose", "enhancement"),
                "requirements": properties.get("requirements", []),
                "user_stories": properties.get("user_stories", []),
                "priority": properties.get("priority", "medium"),
                "effort_estimate": properties.get("effort_estimate", "medium"),
                "risk_level": properties.get("risk_level", "medium"),
                "milestone": metadata.get("milestone", ""),
                "phase": metadata.get("phase", ""),
                "module": metadata.get("module", "")
            }
            
            # Extract tasks using LLM or templates
            extracted_tasks = []
            if use_llm:
                extracted_tasks = self._extract_tasks_with_llm(feature_data)
            else:
                extracted_tasks = self._extract_tasks_from_templates(feature_data)
            
            if not extracted_tasks:
                self._save_agent_thought(f"No tasks could be extracted for feature {feature_id}", feature_id)
                return {
                    "success": False,
                    "message": "No tasks could be extracted",
                    "tasks": []
                }
            
            # Analyze dependencies between tasks
            tasks_with_deps = self._analyze_task_dependencies(extracted_tasks)
            
            # Create tasks in the knowledge graph
            created_task_ids = []
            for task in tasks_with_deps:
                success, task_id = self.task_service.kg_connector.add_task_to_feature(feature_id, task)
                if success:
                    created_task_ids.append(task_id)
                    # Add the ID to the task for reference
                    task["id"] = task_id
            
            # Get the created tasks
            tasks = self.task_service.get_tasks_for_feature(feature_id)
            
            # Generate summary for handoff
            summary = self._generate_task_summary(feature_data, tasks)
            
            # Save to memory
            self.memory["processed_features"][feature_id] = {
                "timestamp": datetime.now().isoformat(),
                "feature_data": feature_data,
                "tasks": tasks,
                "summary": summary
            }
            
            # Perform handoff to relationship agent if available
            self._handoff_to_relationship_agent(feature_id, feature_data, tasks)
            
            return {
                "success": True,
                "message": f"Created {len(created_task_ids)} tasks",
                "task_ids": created_task_ids,
                "tasks": tasks,
                "summary": summary
            }
            
        except Exception as e:
            error_msg = f"Error processing feature: {str(e)}"
            self._save_agent_thought(error_msg, feature_id)
            logger.error(error_msg)
            return {
                "success": False,
                "message": error_msg,
                "tasks": []
            }
    
    def _generate_task_summary(self, feature_data: Dict[str, Any], tasks: List[Dict[str, Any]]) -> str:
        """
        Generate a summary of the created tasks
        
        Args:
            feature_data: Feature data
            tasks: List of tasks
            
        Returns:
            Summary text
        """
        # Calculate metrics
        total_hours = sum(task.get("estimated_hours", 0) for task in tasks)
        high_priority = sum(1 for task in tasks if task.get("priority") == "high")
        
        # Generate summary
        summary = f"""
Task Agent has processed feature '{feature_data.get('name')}' and created {len(tasks)} tasks.

Summary:
- Total estimated hours: {total_hours}
- High priority tasks: {high_priority}
- Domain: {feature_data.get('domain', 'unknown')}
- Priority: {feature_data.get('priority', 'medium')}

Tasks created:
"""
        
        for task in tasks:
            summary += f"- {task.get('name')} ({task.get('priority')}, {task.get('estimated_hours')}h)\n"
        
        return summary
    
    def _handoff_to_relationship_agent(self, feature_id: str, feature_data: Dict[str, Any], 
                                      tasks: List[Dict[str, Any]]):
        """
        Handoff to relationship agent for dependency mapping
        
        Args:
            feature_id: ID of the feature
            feature_data: Feature data dictionary
            tasks: List of tasks
        """
        if not AGENT_COMMUNICATION_AVAILABLE:
            self._save_agent_thought("Agent communication not available, skipping handoff", feature_id)
            return
        
        try:
            # Create handoff message
            message_content = {
                "action": "analyze_dependencies",
                "feature_id": feature_id,
                "feature_name": feature_data.get("name", ""),
                "feature_domain": feature_data.get("domain", "unknown"),
                "feature_purpose": feature_data.get("purpose", "enhancement"),
                "task_count": len(tasks),
                "tasks": [{"id": task.get("id"), "name": task.get("name")} for task in tasks],
                "requires_response": True,
                "timestamp": datetime.now().isoformat()
            }
            
            # Create and send message
            message = AgentMessage(
                sender=self.agent_id,
                recipient="relationship_agent",
                content=message_content,
                message_type="handoff"
            )
            
            success, result = self.communication_service.send_message(message)
            
            if success:
                self._save_agent_thought(
                    f"Handed off feature {feature_id} to relationship agent for dependency analysis",
                    feature_id
                )
            else:
                self._save_agent_thought(
                    f"Failed to hand off to relationship agent: {result}",
                    feature_id
                )
        
        except Exception as e:
            self._save_agent_thought(
                f"Error in handoff to relationship agent: {str(e)}",
                feature_id
            )
    
    def process_feature_batch(self, feature_ids: List[str], use_llm: bool = True) -> Dict[str, Any]:
        """
        Process multiple features to generate tasks
        
        Args:
            feature_ids: List of feature IDs
            use_llm: Whether to use LLM for task extraction
            
        Returns:
            Dictionary with processing results
        """
        self._save_agent_thought(f"Processing batch of {len(feature_ids)} features")
        
        results = {
            "success": True,
            "features": {},
            "summary": {
                "total_features": len(feature_ids),
                "successful": 0,
                "failed": 0,
                "total_tasks": 0
            }
        }
        
        for feature_id in feature_ids:
            feature_result = self.process_feature(feature_id, use_llm)
            results["features"][feature_id] = feature_result
            
            if feature_result["success"]:
                results["summary"]["successful"] += 1
                results["summary"]["total_tasks"] += len(feature_result.get("tasks", []))
            else:
                results["summary"]["failed"] += 1
                results["success"] = False
        
        self._save_agent_thought(
            f"Batch processing complete: {results['summary']['successful']} features successful, "
            f"{results['summary']['failed']} failed, {results['summary']['total_tasks']} tasks created"
        )
        
        return results
    
    def update_task(self, task_id: str, status: str) -> Dict[str, Any]:
        """
        Update a task's status
        
        Args:
            task_id: ID of the task
            status: New status
            
        Returns:
            Dictionary with update result
        """
        self._save_agent_thought(f"Updating task {task_id} status to {status}")
        
        success, message = self.task_service.update_task_status(task_id, status)
        
        result = {
            "success": success,
            "message": message,
            "task_id": task_id,
            "status": status
        }
        
        # Get the feature ID for this task (for memory)
        try:
            task_node = self.task_service.kg_connector.kg.get_node(task_id)
            if task_node:
                metadata = task_node.get("metadata", {})
                feature_id = metadata.get("feature")
                
                if feature_id:
                    # Update task history in memory
                    history_entry = {
                        "timestamp": datetime.now().isoformat(),
                        "task_id": task_id,
                        "feature_id": feature_id,
                        "status": status,
                        "previous_status": task_node.get("properties", {}).get("status")
                    }
                    self.memory["task_history"].append(history_entry)
                    
                    # Check if all tasks for this feature are complete
                    if status == "completed":
                        self._check_feature_completion(feature_id)
        except Exception as e:
            logger.error(f"Error updating task history: {e}")
        
        return result
    
    def _check_feature_completion(self, feature_id: str):
        """
        Check if all tasks for a feature are complete and send notification if needed
        
        Args:
            feature_id: ID of the feature
        """
        completion_status = self.task_service.get_feature_completion_status(feature_id)
        
        # If all tasks are complete, notify
        if (completion_status.get("total_tasks", 0) > 0 and 
            completion_status.get("completed") == completion_status.get("total_tasks")):
            
            self._save_agent_thought(
                f"Feature {feature_id} is complete (all {completion_status.get('total_tasks')} tasks completed)",
                feature_id
            )
            
            # Get feature details
            feature_node = self.task_service.kg_connector.kg.get_node(feature_id)
            if feature_node:
                properties = feature_node.get("properties", {})
                feature_name = properties.get("name", feature_id)
                
                # Send notification to relationship agent
                if AGENT_COMMUNICATION_AVAILABLE:
                    message_content = {
                        "action": "feature_completed",
                        "feature_id": feature_id,
                        "feature_name": feature_name,
                        "completion_time": datetime.now().isoformat(),
                        "task_count": completion_status.get("total_tasks"),
                        "requires_response": False
                    }
                    
                    message = AgentMessage(
                        sender=self.agent_id,
                        recipient="relationship_agent",
                        content=message_content,
                        message_type="notification"
                    )
                    
                    self.communication_service.send_message(message)
    
    def get_feature_tasks(self, feature_id: str) -> Dict[str, Any]:
        """
        Get all tasks for a feature with completion statistics
        
        Args:
            feature_id: ID of the feature
            
        Returns:
            Dictionary with tasks and statistics
        """
        tasks = self.task_service.get_tasks_for_feature(feature_id)
        completion_status = self.task_service.get_feature_completion_status(feature_id)
        
        # Get feature details
        feature_node = self.task_service.kg_connector.kg.get_node(feature_id)
        feature_name = feature_id
        
        if feature_node:
            properties = feature_node.get("properties", {})
            feature_name = properties.get("name", feature_id)
        
        # Check memory for any thoughts related to this feature
        thoughts = [t for t in self.memory["agent_thoughts"] 
                    if t.get("feature_id") == feature_id]
        
        return {
            "success": True,
            "feature_id": feature_id,
            "feature_name": feature_name,
            "tasks": tasks,
            "task_count": len(tasks),
            "completion_status": completion_status,
            "agent_thoughts": thoughts[-5:] if thoughts else []  # Include last 5 thoughts
        }
    
    def handle_agent_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle incoming messages from other agents
        
        Args:
            message_data: Message data dictionary
            
        Returns:
            Dictionary with handling result
        """
        try:
            sender = message_data.get("sender", "unknown")
            content = message_data.get("content", {})
            message_type = message_data.get("message_type", "unknown")
            
            self._save_agent_thought(f"Received {message_type} message from {sender}")
            
            # Handle message based on type and content
            if message_type == "request" and content.get("action") == "create_tasks":
                # Request to create tasks for a feature
                feature_id = content.get("feature_id")
                if feature_id:
                    result = self.process_feature(feature_id)
                    return {
                        "success": True,
                        "message": "Tasks created",
                        "result": result
                    }
            
            elif message_type == "notification" and content.get("action") == "feature_updated":
                # Notification that a feature has been updated
                feature_id = content.get("feature_id")
                if feature_id:
                    # Check if we've already processed this feature
                    if feature_id in self.memory["processed_features"]:
                        # Re-process to update tasks
                        result = self.process_feature(feature_id)
                        return {
                            "success": True,
                            "message": "Tasks updated",
                            "result": result
                        }
            
            # Default response for unhandled messages
            return {
                "success": False,
                "message": "Unhandled message type or action",
                "sender": sender,
                "message_type": message_type
            }
            
        except Exception as e:
            logger.error(f"Error handling agent message: {e}")
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }

def main():
    """Main function for command-line usage"""
    parser = argparse.ArgumentParser(description="Task Agent for Devloop")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Process feature command
    process_parser = subparsers.add_parser("process", help="Process a feature to generate tasks")
    process_parser.add_argument("feature_id", help="ID of the feature")
    process_parser.add_argument("--no-llm", action="store_true", help="Disable LLM for task extraction")
    
    # Process batch command
    batch_parser = subparsers.add_parser("batch", help="Process multiple features")
    batch_parser.add_argument("feature_ids", nargs="+", help="IDs of the features")
    batch_parser.add_argument("--no-llm", action="store_true", help="Disable LLM for task extraction")
    
    # Update task command
    update_parser = subparsers.add_parser("update", help="Update a task's status")
    update_parser.add_argument("task_id", help="ID of the task")
    update_parser.add_argument("status", help="New status")
    
    # Get tasks command
    get_parser = subparsers.add_parser("get", help="Get tasks for a feature")
    get_parser.add_argument("feature_id", help="ID of the feature")
    
    # Handle message command
    message_parser = subparsers.add_parser("message", help="Handle a message from another agent")
    message_parser.add_argument("message_file", help="JSON file containing the message")
    
    # Agent service mode
    service_parser = subparsers.add_parser("service", help="Run as an agent service listening for messages")
    service_parser.add_argument("--port", type=int, default=5000, help="Port to listen on")
    
    args = parser.parse_args()
    
    # Initialize the agent
    agent = TaskAgent()
    
    # Process command
    if args.command == "process":
        result = agent.process_feature(args.feature_id, not args.no_llm)
        print(json.dumps(result, indent=2))
    
    # Process batch command
    elif args.command == "batch":
        result = agent.process_feature_batch(args.feature_ids, not args.no_llm)
        print(json.dumps(result, indent=2))
    
    # Update task command
    elif args.command == "update":
        result = agent.update_task(args.task_id, args.status)
        print(json.dumps(result, indent=2))
    
    # Get tasks command
    elif args.command == "get":
        result = agent.get_feature_tasks(args.feature_id)
        print(json.dumps(result, indent=2))
    
    # Handle message command
    elif args.command == "message":
        try:
            with open(args.message_file, 'r') as f:
                message_data = json.load(f)
            
            result = agent.handle_agent_message(message_data)
            print(json.dumps(result, indent=2))
        except Exception as e:
            print(json.dumps({
                "success": False,
                "message": f"Error: {str(e)}"
            }, indent=2))
    
    # Service mode
    elif args.command == "service":
        print(f"Task Agent service running on port {args.port}. Press Ctrl+C to exit.")
        try:
            # Simple polling loop for demonstration
            while True:
                # In a real implementation, this would listen for messages
                # using a proper server (Flask, FastAPI, etc.)
                time.sleep(1)
        except KeyboardInterrupt:
            print("Task Agent service stopped.")
    
    # No command
    else:
        parser.print_help()

if __name__ == "__main__":
    main()