"""
Tools Package

Provides tools and capabilities for agents in the Devloop system.
Tools are exposed to OpenAI Assistants via function calling.
"""

from .registry import ToolRegistry, ToolMetadata, tool, param_description
from .core import (
    BaseTool, FileTool, SystemTool, APITool, DatabaseTool, 
    create_tool, SDKToolProvider, ToolPermissionManager
)

# Import tool implementations
from .core.system_tools import register_system_tools
from .core.knowledge_tools import register_knowledge_tools
from .agent_specific.system_health_tools import register_system_health_tools

# Create a function to register all tools
def register_all_tools():
    """Register all tools with the registry"""
    register_system_tools()
    register_knowledge_tools()
    register_system_health_tools()
    # Add more tool registrations here as they're implemented

__all__ = [
    'ToolRegistry', 'ToolMetadata', 'tool', 'param_description',
    'BaseTool', 'FileTool', 'SystemTool', 'APITool', 'DatabaseTool', 
    'create_tool', 'SDKToolProvider', 'ToolPermissionManager',
    'register_all_tools'
]