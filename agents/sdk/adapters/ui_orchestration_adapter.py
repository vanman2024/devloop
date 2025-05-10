#!/usr/bin/env python3
"""
UI Orchestration Adapter for SDK-First Architecture

This module adapts the functionality of the original UIIntegration to work with
the SDK-first architecture using OpenAI's Assistants API. It provides integration
between the agent system and the UI layer.
"""

import os
import sys
import json
import logging
import time
from typing import Dict, List, Any, Optional, Union

# Add parent directories to path for imports
script_dir = os.path.dirname(os.path.abspath(__file__))
agents_dir = os.path.abspath(os.path.join(script_dir, "../../"))
if agents_dir not in sys.path:
    sys.path.append(agents_dir)

# Import SDK core
from sdk.core.agent import SDKAgent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(script_dir, "ui_orchestration_adapter.log"))
    ]
)
logger = logging.getLogger(__name__)

class AgentRegistryClient:
    """Client for interacting with the agent registry"""

    def __init__(self, registry_path: Optional[str] = None):
        """
        Initialize the registry client.
        
        Args:
            registry_path: Path to the registry file
        """
        self.registry_path = registry_path or os.path.join(agents_dir, "registry/agent_registry.json")
        self._ensure_registry()
        logger.info(f"Agent Registry Client initialized with {self.registry_path}")
    
    def _ensure_registry(self) -> None:
        """Ensure registry file exists"""
        if not os.path.exists(os.path.dirname(self.registry_path)):
            os.makedirs(os.path.dirname(self.registry_path))
        
        if not os.path.exists(self.registry_path):
            with open(self.registry_path, 'w') as f:
                json.dump({
                    "agents": {},
                    "last_updated": time.time()
                }, f, indent=2)
    
    def get_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Get an agent from the registry.
        
        Args:
            agent_id: ID of the agent
            
        Returns:
            Agent data or None if not found
        """
        try:
            with open(self.registry_path, 'r') as f:
                registry = json.load(f)
            
            return registry.get("agents", {}).get(agent_id)
        except Exception as e:
            logger.error(f"Error getting agent {agent_id}: {e}")
            return None
    
    def get_all_agents(self) -> Dict[str, Dict[str, Any]]:
        """
        Get all agents from the registry.
        
        Returns:
            Dictionary of agent ID to agent data
        """
        try:
            with open(self.registry_path, 'r') as f:
                registry = json.load(f)
            
            return registry.get("agents", {})
        except Exception as e:
            logger.error(f"Error getting all agents: {e}")
            return {}
    
    def register_agent(self, agent_data: Dict[str, Any]) -> bool:
        """
        Register an agent in the registry.
        
        Args:
            agent_data: Agent data to register
            
        Returns:
            True if successful, False otherwise
        """
        try:
            agent_id = agent_data.get("id")
            if not agent_id:
                logger.error("Agent ID is required for registration")
                return False
            
            with open(self.registry_path, 'r') as f:
                registry = json.load(f)
            
            registry.setdefault("agents", {})[agent_id] = agent_data
            registry["last_updated"] = time.time()
            
            with open(self.registry_path, 'w') as f:
                json.dump(registry, f, indent=2)
            
            logger.info(f"Agent {agent_id} registered successfully")
            return True
        except Exception as e:
            logger.error(f"Error registering agent: {e}")
            return False
    
    def update_agent_status(self, agent_id: str, status: str) -> bool:
        """
        Update an agent's status.
        
        Args:
            agent_id: ID of the agent
            status: New status
            
        Returns:
            True if successful, False otherwise
        """
        try:
            agent = self.get_agent(agent_id)
            if not agent:
                logger.error(f"Agent {agent_id} not found")
                return False
            
            with open(self.registry_path, 'r') as f:
                registry = json.load(f)
            
            registry["agents"][agent_id]["status"] = status
            registry["agents"][agent_id]["last_updated"] = time.time()
            registry["last_updated"] = time.time()
            
            with open(self.registry_path, 'w') as f:
                json.dump(registry, f, indent=2)
            
            logger.info(f"Agent {agent_id} status updated to {status}")
            return True
        except Exception as e:
            logger.error(f"Error updating agent status: {e}")
            return False


class UIOrchestrationAdapter:
    """Adapter for UI orchestration in the SDK-first architecture."""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the UI orchestration adapter.
        
        Args:
            config_path: Path to configuration file. If None, uses default.
        """
        self.config = self._load_config(config_path)
        self.registry_client = AgentRegistryClient(
            registry_path=self.config.get("registry_path")
        )
        self.orchestration_agent = None
        logger.info("UI Orchestration Adapter initialized")
    
    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Load configuration from file or environment.
        
        Args:
            config_path: Path to configuration file
            
        Returns:
            Dict containing configuration values
        """
        # Default configuration
        config = {
            "api_key": os.environ.get("OPENAI_API_KEY"),
            "model": os.environ.get("OPENAI_MODEL", "gpt-4o"),
            "registry_path": os.path.join(agents_dir, "registry/agent_registry.json"),
        }
        
        # If config path provided, load from file
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    file_config = json.load(f)
                    # Update defaults with file values
                    config.update(file_config)
                logger.info(f"Configuration loaded from {config_path}")
            except Exception as e:
                logger.error(f"Error loading configuration from {config_path}: {e}")
        
        return config
    
    def _get_orchestration_agent(self) -> SDKAgent:
        """
        Get or create an orchestration agent.
        
        Returns:
            SDKAgent instance for orchestration
        """
        if self.orchestration_agent is None:
            # Define orchestration tools
            tools = [
                {
                    "name": "get_agent_info",
                    "description": "Get information about an agent",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "agent_id": {
                                "type": "string",
                                "description": "ID of the agent to get information for"
                            }
                        },
                        "required": ["agent_id"]
                    }
                },
                {
                    "name": "list_agents",
                    "description": "List all registered agents",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "filter_type": {
                                "type": "string",
                                "description": "Optional type to filter agents by"
                            },
                            "filter_status": {
                                "type": "string",
                                "description": "Optional status to filter agents by"
                            }
                        }
                    }
                },
                {
                    "name": "create_agent_instance",
                    "description": "Create a new agent instance",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "agent_type": {
                                "type": "string",
                                "description": "Type of agent to create"
                            },
                            "agent_name": {
                                "type": "string",
                                "description": "Name for the new agent"
                            },
                            "instructions": {
                                "type": "string",
                                "description": "Instructions for the agent"
                            }
                        },
                        "required": ["agent_type", "agent_name"]
                    }
                },
                {
                    "name": "update_agent_status",
                    "description": "Update an agent's status",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "agent_id": {
                                "type": "string",
                                "description": "ID of the agent to update"
                            },
                            "status": {
                                "type": "string",
                                "description": "New status for the agent"
                            }
                        },
                        "required": ["agent_id", "status"]
                    }
                },
                {
                    "name": "execute_agent_task",
                    "description": "Execute a task with an agent",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "agent_id": {
                                "type": "string",
                                "description": "ID of the agent to use"
                            },
                            "task": {
                                "type": "string",
                                "description": "Task for the agent to execute"
                            }
                        },
                        "required": ["agent_id", "task"]
                    }
                },
                {
                    "name": "validate_system",
                    "description": "Validate system health and consistency",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "components": {
                                "type": "array",
                                "items": {
                                    "type": "string"
                                },
                                "description": "Optional list of components to validate"
                            }
                        }
                    }
                }
            ]
            
            # Create agent configuration
            agent_config = {
                "agent_name": "ui-orchestration-agent",
                "agent_type": "orchestration",
                "instructions": """
                You are the UI Orchestration Agent that manages the interface between the UI system and the agent ecosystem.
                Your responsibilities include:
                1. Providing information about agents to the UI
                2. Creating and managing agent instances
                3. Executing tasks with agents
                4. Validating system health and consistency
                
                When handling requests, follow these principles:
                - Be concise and clear in your responses
                - Focus on providing the requested information accurately
                - Maintain a helpful, service-oriented demeanor
                - Format information in a way that's suitable for UI presentation
                """,
                "model": self.config.get("model", "gpt-4o"),
                "api_key": self.config.get("api_key"),
                "tools": tools
            }
            
            # Create agent instance
            self.orchestration_agent = SDKAgent(agent_config)
            
            # Add tool methods to the agent
            def get_agent_info(self, agent_id: str) -> Dict[str, Any]:
                """Get information about an agent"""
                agent_info = self.adapter.registry_client.get_agent(agent_id)
                if not agent_info:
                    return {
                        "success": False,
                        "error": f"Agent {agent_id} not found"
                    }
                
                # Add UI-friendly metadata
                agent_info["ui_metadata"] = {
                    "display_name": agent_info.get("name", agent_id.replace("-", " ").title()),
                    "last_active": agent_info.get("last_updated", "Unknown"),
                    "capabilities": agent_info.get("capabilities", []),
                    "can_execute": agent_info.get("status") == "active"
                }
                
                return {
                    "success": True,
                    "agent": agent_info
                }
            
            def list_agents(self, filter_type: Optional[str] = None, filter_status: Optional[str] = None) -> Dict[str, Any]:
                """List all registered agents with optional filtering"""
                all_agents = self.adapter.registry_client.get_all_agents()
                
                # Apply filters
                filtered_agents = {}
                for agent_id, agent in all_agents.items():
                    if filter_type and agent.get("type") != filter_type:
                        continue
                    if filter_status and agent.get("status") != filter_status:
                        continue
                    filtered_agents[agent_id] = agent
                
                # Format for UI display
                ui_agents = []
                for agent_id, agent in filtered_agents.items():
                    ui_agent = {
                        "id": agent_id,
                        "name": agent.get("name", agent_id.replace("-", " ").title()),
                        "type": agent.get("type", "unknown"),
                        "status": agent.get("status", "unknown"),
                        "last_updated": agent.get("last_updated", "unknown"),
                        "description": agent.get("description", "No description available")
                    }
                    ui_agents.append(ui_agent)
                
                return {
                    "success": True,
                    "count": len(ui_agents),
                    "agents": ui_agents
                }
            
            def create_agent_instance(self, agent_type: str, agent_name: str, instructions: Optional[str] = None) -> Dict[str, Any]:
                """Create a new agent instance"""
                try:
                    # Generate a unique ID
                    import uuid
                    agent_id = f"{agent_type}-{str(uuid.uuid4())[:8]}"
                    
                    # Create default instructions if none provided
                    if not instructions:
                        instructions = f"You are a {agent_type} agent named {agent_name} for the Devloop system."
                    
                    # Create agent data
                    agent_data = {
                        "id": agent_id,
                        "name": agent_name,
                        "type": agent_type,
                        "status": "created",
                        "instructions": instructions,
                        "created_at": time.time(),
                        "last_updated": time.time(),
                        "capabilities": [f"{agent_type} operations"],
                        "description": f"A {agent_type} agent that handles {agent_type}-related operations"
                    }
                    
                    # Register agent
                    success = self.adapter.registry_client.register_agent(agent_data)
                    if not success:
                        return {
                            "success": False,
                            "error": "Failed to register agent"
                        }
                    
                    return {
                        "success": True,
                        "agent_id": agent_id,
                        "message": f"Agent {agent_name} ({agent_id}) created successfully"
                    }
                except Exception as e:
                    logger.error(f"Error creating agent instance: {e}")
                    return {
                        "success": False,
                        "error": str(e)
                    }
            
            def update_agent_status(self, agent_id: str, status: str) -> Dict[str, Any]:
                """Update an agent's status"""
                valid_statuses = ["created", "initializing", "active", "paused", "error", "terminated"]
                if status not in valid_statuses:
                    return {
                        "success": False,
                        "error": f"Invalid status: {status}. Must be one of {valid_statuses}"
                    }
                
                success = self.adapter.registry_client.update_agent_status(agent_id, status)
                if not success:
                    return {
                        "success": False,
                        "error": f"Failed to update status for agent {agent_id}"
                    }
                
                return {
                    "success": True,
                    "message": f"Agent {agent_id} status updated to {status}"
                }
            
            def execute_agent_task(self, agent_id: str, task: str) -> Dict[str, Any]:
                """Execute a task with an agent"""
                # This would normally create a real agent instance and execute
                # the task, but for this adapter we'll simulate it
                agent_info = self.adapter.registry_client.get_agent(agent_id)
                if not agent_info:
                    return {
                        "success": False,
                        "error": f"Agent {agent_id} not found"
                    }
                
                if agent_info.get("status") != "active":
                    return {
                        "success": False,
                        "error": f"Agent {agent_id} is not active (status: {agent_info.get('status')})"
                    }
                
                # Simulate task execution
                logger.info(f"Executing task with agent {agent_id}: {task}")
                
                # In a real implementation, we would create and use an SDKAgent
                # instance here with the appropriate configuration
                
                return {
                    "success": True,
                    "message": f"Task executed with agent {agent_id}",
                    "result": f"Simulated result for task: {task}",
                    "execution_id": f"exec-{time.time()}"
                }
            
            def validate_system(self, components: Optional[List[str]] = None) -> Dict[str, Any]:
                """Validate system health and consistency"""
                # This would normally perform real validation,
                # but for this adapter we'll provide mock results
                
                all_components = [
                    "agent_registry", "ui_bridge", "knowledge_graph", 
                    "tool_registry", "template_system"
                ]
                
                # Filter components if specified
                if components:
                    validate_components = [c for c in components if c in all_components]
                else:
                    validate_components = all_components
                
                # Mock validation results
                validation_results = {}
                for component in validate_components:
                    validation_results[component] = {
                        "status": "healthy",
                        "last_checked": time.time(),
                        "issues": []
                    }
                
                # Add a mock issue for demonstration
                if "tool_registry" in validation_results:
                    validation_results["tool_registry"]["issues"] = [
                        "Some tool permissions may need updating"
                    ]
                    validation_results["tool_registry"]["status"] = "warning"
                
                return {
                    "success": True,
                    "timestamp": time.time(),
                    "is_healthy": all(v["status"] == "healthy" for v in validation_results.values()),
                    "results": validation_results
                }
            
            # Attach methods to the agent and set adapter reference
            self.orchestration_agent.__class__.get_agent_info = get_agent_info
            self.orchestration_agent.__class__.list_agents = list_agents
            self.orchestration_agent.__class__.create_agent_instance = create_agent_instance
            self.orchestration_agent.__class__.update_agent_status = update_agent_status
            self.orchestration_agent.__class__.execute_agent_task = execute_agent_task
            self.orchestration_agent.__class__.validate_system = validate_system
            self.orchestration_agent.__class__.adapter = self
        
        return self.orchestration_agent
    
    def get_agent_info(self, agent_id: str) -> Dict[str, Any]:
        """
        Get information about an agent for UI display.
        
        Args:
            agent_id: ID of the agent
            
        Returns:
            Dict containing agent information
        """
        logger.info(f"Getting info for agent: {agent_id}")
        
        # Get the orchestration agent
        agent = self._get_orchestration_agent()
        
        # Create a prompt for getting agent info
        prompt = f"""
        Please get information about agent with ID: {agent_id}.
        Format the response for UI display.
        """
        
        # Execute the agent
        response = agent.execute(prompt)
        
        # Extract and return the result
        try:
            # Try to parse as JSON
            import re
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response)
            if json_match:
                return json.loads(json_match.group(1))
            
            # Try to find JSON directly
            json_match = re.search(r'(\{[\s\S]*\})', response)
            if json_match:
                return json.loads(json_match.group(1))
            
            # Return the raw response if JSON extraction fails
            return {"response": response}
        except Exception as e:
            logger.error(f"Error parsing agent response: {e}")
            return {"error": str(e), "raw_response": response}
    
    def get_agents_list(self, filter_type: Optional[str] = None, filter_status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get list of all agents for UI display.
        
        Args:
            filter_type: Optional type to filter agents by
            filter_status: Optional status to filter agents by
            
        Returns:
            List of agent information dictionaries
        """
        logger.info(f"Getting agents list (filter_type={filter_type}, filter_status={filter_status})")
        
        # Get the orchestration agent
        agent = self._get_orchestration_agent()
        
        # Create a prompt for listing agents
        prompt = f"""
        Please list all agents{f" of type {filter_type}" if filter_type else ""}{f" with status {filter_status}" if filter_status else ""}.
        Format the response for UI display.
        """
        
        # Execute the agent
        response = agent.execute(prompt)
        
        # Extract and return the result
        try:
            # Try to parse as JSON
            import re
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response)
            if json_match:
                result = json.loads(json_match.group(1))
                return result.get("agents", [])
            
            # Try to find JSON directly
            json_match = re.search(r'(\{[\s\S]*\})', response)
            if json_match:
                result = json.loads(json_match.group(1))
                return result.get("agents", [])
            
            # Return an empty list if JSON extraction fails
            logger.warning("Could not extract agents list from response")
            return []
        except Exception as e:
            logger.error(f"Error parsing agent response: {e}")
            return []
    
    def create_agent(self, agent_type: str, agent_name: str, instructions: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new agent.
        
        Args:
            agent_type: Type of agent to create
            agent_name: Name for the new agent
            instructions: Optional instructions for the agent
            
        Returns:
            Dict containing creation results
        """
        logger.info(f"Creating agent: type={agent_type}, name={agent_name}")
        
        # Get the orchestration agent
        agent = self._get_orchestration_agent()
        
        # Create a prompt for creating an agent
        prompt = f"""
        Please create a new agent with the following specifications:
        - Type: {agent_type}
        - Name: {agent_name}
        - Instructions: {instructions or f"You are a {agent_type} agent named {agent_name} for the Devloop system."}
        """
        
        # Execute the agent
        response = agent.execute(prompt)
        
        # Extract and return the result
        try:
            # Try to parse as JSON
            import re
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response)
            if json_match:
                return json.loads(json_match.group(1))
            
            # Try to find JSON directly
            json_match = re.search(r'(\{[\s\S]*\})', response)
            if json_match:
                return json.loads(json_match.group(1))
            
            # Return the raw response if JSON extraction fails
            return {"response": response}
        except Exception as e:
            logger.error(f"Error parsing agent response: {e}")
            return {"error": str(e), "raw_response": response}
    
    def execute_task(self, agent_id: str, task: str) -> Dict[str, Any]:
        """
        Execute a task with an agent.
        
        Args:
            agent_id: ID of the agent to use
            task: Task for the agent to execute
            
        Returns:
            Dict containing execution results
        """
        logger.info(f"Executing task with agent {agent_id}: {task}")
        
        # Get the orchestration agent
        agent = self._get_orchestration_agent()
        
        # Create a prompt for executing a task
        prompt = f"""
        Please execute the following task with agent {agent_id}:
        
        Task: {task}
        """
        
        # Execute the agent
        response = agent.execute(prompt)
        
        # Extract and return the result
        try:
            # Try to parse as JSON
            import re
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response)
            if json_match:
                return json.loads(json_match.group(1))
            
            # Try to find JSON directly
            json_match = re.search(r'(\{[\s\S]*\})', response)
            if json_match:
                return json.loads(json_match.group(1))
            
            # Return the raw response if JSON extraction fails
            return {"response": response}
        except Exception as e:
            logger.error(f"Error parsing agent response: {e}")
            return {"error": str(e), "raw_response": response}
    
    def validate_system(self, components: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Validate system health and consistency.
        
        Args:
            components: Optional list of components to validate
            
        Returns:
            Dict containing validation results
        """
        logger.info(f"Validating system health (components={components})")
        
        # Get the orchestration agent
        agent = self._get_orchestration_agent()
        
        # Create a prompt for validating the system
        prompt = f"""
        Please validate the system health and consistency{f" for the following components: {', '.join(components)}" if components else ""}.
        """
        
        # Execute the agent
        response = agent.execute(prompt)
        
        # Extract and return the result
        try:
            # Try to parse as JSON
            import re
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response)
            if json_match:
                return json.loads(json_match.group(1))
            
            # Try to find JSON directly
            json_match = re.search(r'(\{[\s\S]*\})', response)
            if json_match:
                return json.loads(json_match.group(1))
            
            # Return the raw response if JSON extraction fails
            return {"response": response}
        except Exception as e:
            logger.error(f"Error parsing agent response: {e}")
            return {"error": str(e), "raw_response": response}


# CLI interface for testing
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="UI Orchestration Adapter")
    parser.add_argument("--config", help="Path to configuration file")
    parser.add_argument("--agent-info", help="Get information about an agent")
    parser.add_argument("--list-agents", action="store_true", help="List all agents")
    parser.add_argument("--filter-type", help="Filter agents by type")
    parser.add_argument("--filter-status", help="Filter agents by status")
    parser.add_argument("--create-agent", action="store_true", help="Create a new agent")
    parser.add_argument("--agent-type", help="Type of agent to create")
    parser.add_argument("--agent-name", help="Name for the new agent")
    parser.add_argument("--instructions", help="Instructions for the new agent")
    parser.add_argument("--execute-task", help="Execute a task with an agent")
    parser.add_argument("--task", help="Task to execute")
    parser.add_argument("--validate-system", action="store_true", help="Validate system health")
    parser.add_argument("--components", help="Components to validate (comma-separated)")
    
    args = parser.parse_args()
    
    adapter = UIOrchestrationAdapter(config_path=args.config)
    
    if args.agent_info:
        result = adapter.get_agent_info(args.agent_info)
        print(json.dumps(result, indent=2))
    
    elif args.list_agents:
        result = adapter.get_agents_list(filter_type=args.filter_type, filter_status=args.filter_status)
        print(json.dumps(result, indent=2))
    
    elif args.create_agent:
        if not args.agent_type or not args.agent_name:
            print("Error: agent-type and agent-name are required")
            parser.print_help()
            sys.exit(1)
        result = adapter.create_agent(args.agent_type, args.agent_name, instructions=args.instructions)
        print(json.dumps(result, indent=2))
    
    elif args.execute_task:
        if not args.task:
            print("Error: task is required")
            parser.print_help()
            sys.exit(1)
        result = adapter.execute_task(args.execute_task, args.task)
        print(json.dumps(result, indent=2))
    
    elif args.validate_system:
        components = args.components.split(',') if args.components else None
        result = adapter.validate_system(components)
        print(json.dumps(result, indent=2))
    
    else:
        parser.print_help()