#!/usr/bin/env python3
"""
SDK Tool Integration Module

Provides integration between the tool registry and OpenAI SDK assistants.
This allows agents to use registered tools via OpenAI's function calling mechanism.
"""

import os
import json
import logging
import sys
from typing import Dict, List, Any, Optional, Union, Set

# Ensure we have openai when using SDK integration
if not 'openai' in sys.modules:
    try:
        import openai  # pyright: ignore [reportMissingImports]
    except ImportError:
        logging.warning("OpenAI package not available for tool integration.")
        openai = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("sdk_integration")

# Import tool registry
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from registry.tool_registry import ToolRegistry


class SDKToolProvider:
    """Provides OpenAI SDK tool integration for assistants"""
    
    def __init__(self, permissions: List[str] = None):
        """Initialize the SDK tool provider
        
        Args:
            permissions: List of permissions to grant to the agent
        """
        self.registry = ToolRegistry()
        self.permissions = set(permissions or [])
        
    def add_permission(self, permission: str) -> None:
        """Add a permission to the provider
        
        Args:
            permission: Permission to add
        """
        self.permissions.add(permission)
        logger.info(f"Added permission: {permission}")
        
    def remove_permission(self, permission: str) -> None:
        """Remove a permission from the provider
        
        Args:
            permission: Permission to remove
        """
        if permission in self.permissions:
            self.permissions.remove(permission)
            logger.info(f"Removed permission: {permission}")
        
    def get_tools_config(self, categories: List[str] = None, 
                        include_local: bool = False) -> List[Dict[str, Any]]:
        """Get tool configurations for OpenAI assistant creation
        
        Args:
            categories: Optional list of categories to filter by
            include_local: Whether to include local-only tools
            
        Returns:
            List of tools in OpenAI format
        """
        return self.registry.get_openai_tools(
            categories=categories,
            permissions=list(self.permissions),
            include_local=include_local
        )
        
    def handle_tool_calls(self, tool_calls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Handle tool calls from OpenAI assistant
        
        Args:
            tool_calls: List of tool calls from OpenAI
            
        Returns:
            List of tool outputs
        """
        tool_outputs = []
        
        for tool_call in tool_calls:
            try:
                # Extract tool information
                function_name = tool_call.get("function", {}).get("name")
                arguments_str = tool_call.get("function", {}).get("arguments", "{}")
                
                # Parse arguments
                try:
                    arguments = json.loads(arguments_str)
                except json.JSONDecodeError:
                    arguments = {}
                
                # Log the tool call
                logger.info(f"Tool call: {function_name} with args: {arguments}")
                
                # Execute the tool
                result = self.registry.execute_tool(function_name, arguments)
                
                # Add to outputs
                tool_outputs.append({
                    "tool_call_id": tool_call.get("id"),
                    "output": json.dumps(result)
                })
            except Exception as e:
                logger.error(f"Error handling tool call: {e}")
                tool_outputs.append({
                    "tool_call_id": tool_call.get("id"),
                    "output": json.dumps({"error": str(e)})
                })
        
        return tool_outputs


class ToolPermissionManager:
    """Manages tool permission policies for agents"""
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern to ensure one permission manager throughout the system"""
        if cls._instance is None:
            cls._instance = super(ToolPermissionManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize the permission manager"""
        if self._initialized:
            return
            
        self.agent_permissions: Dict[str, Set[str]] = {}
        self.default_permissions: Set[str] = set()
        self._initialized = True
        logger.info("Tool permission manager initialized")
        
    def set_default_permissions(self, permissions: List[str]) -> None:
        """Set default permissions for all agents
        
        Args:
            permissions: List of default permissions
        """
        self.default_permissions = set(permissions)
        logger.info(f"Set default permissions: {permissions}")
        
    def get_default_permissions(self) -> List[str]:
        """Get default permissions
        
        Returns:
            List of default permissions
        """
        return list(self.default_permissions)
        
    def set_agent_permissions(self, agent_id: str, permissions: List[str]) -> None:
        """Set permissions for a specific agent
        
        Args:
            agent_id: Agent ID to set permissions for
            permissions: List of permissions to set
        """
        self.agent_permissions[agent_id] = set(permissions)
        logger.info(f"Set permissions for agent {agent_id}: {permissions}")
        
    def get_agent_permissions(self, agent_id: str) -> List[str]:
        """Get permissions for a specific agent
        
        Args:
            agent_id: Agent ID to get permissions for
            
        Returns:
            List of permissions for the agent
        """
        # Combine default and agent-specific permissions
        permissions = set(self.default_permissions)
        
        if agent_id in self.agent_permissions:
            permissions.update(self.agent_permissions[agent_id])
            
        return list(permissions)
        
    def add_agent_permission(self, agent_id: str, permission: str) -> None:
        """Add a permission for a specific agent
        
        Args:
            agent_id: Agent ID to add permission for
            permission: Permission to add
        """
        if agent_id not in self.agent_permissions:
            self.agent_permissions[agent_id] = set(self.default_permissions)
            
        self.agent_permissions[agent_id].add(permission)
        logger.info(f"Added permission {permission} for agent {agent_id}")
        
    def remove_agent_permission(self, agent_id: str, permission: str) -> None:
        """Remove a permission from a specific agent
        
        Args:
            agent_id: Agent ID to remove permission from
            permission: Permission to remove
        """
        if agent_id in self.agent_permissions and permission in self.agent_permissions[agent_id]:
            self.agent_permissions[agent_id].remove(permission)
            logger.info(f"Removed permission {permission} from agent {agent_id}")
            
    def create_tool_provider(self, agent_id: str) -> SDKToolProvider:
        """Create a tool provider for an agent
        
        Args:
            agent_id: Agent ID to create provider for
            
        Returns:
            SDKToolProvider with agent's permissions
        """
        permissions = self.get_agent_permissions(agent_id)
        return SDKToolProvider(permissions)


# Example usage
if __name__ == "__main__":
    # Create permission manager
    permission_manager = ToolPermissionManager()
    
    # Set default permissions
    permission_manager.set_default_permissions(["file_read", "system_info"])
    
    # Set specific agent permissions
    permission_manager.set_agent_permissions("agent-123", ["file_read", "file_write", "system_info"])
    
    # Add a permission
    permission_manager.add_agent_permission("agent-123", "network_access")
    
    # Create a tool provider
    tool_provider = permission_manager.create_tool_provider("agent-123")
    
    # Get tools configuration for OpenAI
    tools_config = tool_provider.get_tools_config(categories=["file", "system"])
    print(f"Tools config: {json.dumps(tools_config, indent=2)}")
    
    # Simulate handling a tool call
    mock_tool_call = {
        "id": "call-123",
        "function": {
            "name": "read_file", 
            "arguments": json.dumps({"path": "/etc/hostname"})
        }
    }
    
    outputs = tool_provider.handle_tool_calls([mock_tool_call])
    print(f"Tool outputs: {json.dumps(outputs, indent=2)}")