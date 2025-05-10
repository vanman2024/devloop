#!/usr/bin/env python3
"""
Tool Registry Module

Provides a centralized registry for registering and managing tools across the agent system.
Tools are exposed to OpenAI Assistants via the function calling mechanism.
"""

import os
import json
import uuid
import inspect
import logging
from typing import Dict, List, Any, Optional, Union, Callable, TypeVar, Generic, Set

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("tool_registry")

# Type definitions
ToolFunc = Callable[..., Any]
T = TypeVar('T')

class ToolMetadata:
    """Metadata for a registered tool"""
    
    def __init__(self, 
                 name: str,
                 description: str,
                 parameters: Dict[str, Any],
                 function: ToolFunc,
                 categories: List[str] = None,
                 required_permissions: List[str] = None,
                 version: str = "1.0.0",
                 author: str = "Devloop System",
                 is_local_only: bool = False):
        """Initialize tool metadata
        
        Args:
            name: Tool name
            description: Tool description
            parameters: OpenAI-compatible parameters schema
            function: The actual function to call
            categories: List of tool categories for organization
            required_permissions: Permissions needed to execute this tool
            version: Tool version
            author: Tool author/owner
            is_local_only: Whether this tool can only be called locally
        """
        self.id = str(uuid.uuid4())
        self.name = name
        self.description = description
        self.parameters = parameters
        self.function = function
        self.categories = categories or ["default"]
        self.required_permissions = required_permissions or []
        self.version = version
        self.author = author
        self.is_local_only = is_local_only
        self.invocation_count = 0
        
    def to_openai_format(self) -> Dict[str, Any]:
        """Convert tool metadata to OpenAI format
        
        Returns:
            Dictionary in OpenAI function format
        """
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters
            }
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert tool metadata to dictionary
        
        Returns:
            Dictionary representation of tool metadata
        """
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
            "categories": self.categories,
            "required_permissions": self.required_permissions,
            "version": self.version,
            "author": self.author,
            "is_local_only": self.is_local_only,
            "invocation_count": self.invocation_count
        }
        
    def increment_count(self) -> None:
        """Increment the invocation count"""
        self.invocation_count += 1


class ToolRegistry:
    """Central registry for all tools in the system"""
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern to ensure one registry throughout the system"""
        if cls._instance is None:
            cls._instance = super(ToolRegistry, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize the tool registry"""
        if self._initialized:
            return
            
        self.tools: Dict[str, ToolMetadata] = {}
        self.categories: Dict[str, Set[str]] = {}
        self.permission_index: Dict[str, Set[str]] = {}
        self._initialized = True
        logger.info("Tool registry initialized")
    
    def register(self, tool: Union[ToolFunc, ToolMetadata]) -> Optional[str]:
        """Register a tool with the registry
        
        Args:
            tool: Function to register as a tool or ToolMetadata instance
            
        Returns:
            Tool ID if registration is successful
        """
        if isinstance(tool, ToolMetadata):
            # Register a pre-configured ToolMetadata
            tool_metadata = tool
        else:
            # Create metadata from function
            tool_metadata = self._create_metadata_from_function(tool)
            
        if not tool_metadata:
            logger.error(f"Failed to register tool {getattr(tool, '__name__', 'unknown')}")
            return None
            
        # Add to registry
        self.tools[tool_metadata.name] = tool_metadata
        
        # Update indexes
        for category in tool_metadata.categories:
            if category not in self.categories:
                self.categories[category] = set()
            self.categories[category].add(tool_metadata.name)
            
        for permission in tool_metadata.required_permissions:
            if permission not in self.permission_index:
                self.permission_index[permission] = set()
            self.permission_index[permission].add(tool_metadata.name)
            
        logger.info(f"Registered tool: {tool_metadata.name} (ID: {tool_metadata.id})")
        return tool_metadata.id
    
    def unregister(self, tool_name: str) -> bool:
        """Unregister a tool from the registry
        
        Args:
            tool_name: Name of the tool to unregister
            
        Returns:
            True if successful, False otherwise
        """
        if tool_name not in self.tools:
            logger.warning(f"Tool {tool_name} not found for unregistration")
            return False
            
        tool_metadata = self.tools[tool_name]
        
        # Remove from registry
        del self.tools[tool_name]
        
        # Update indexes
        for category in tool_metadata.categories:
            if category in self.categories and tool_name in self.categories[category]:
                self.categories[category].remove(tool_name)
                if not self.categories[category]:
                    del self.categories[category]
                    
        for permission in tool_metadata.required_permissions:
            if permission in self.permission_index and tool_name in self.permission_index[permission]:
                self.permission_index[permission].remove(tool_name)
                if not self.permission_index[permission]:
                    del self.permission_index[permission]
                    
        logger.info(f"Unregistered tool: {tool_name}")
        return True
    
    def get_tool(self, tool_name: str) -> Optional[ToolMetadata]:
        """Get a tool by name
        
        Args:
            tool_name: Name of the tool to retrieve
            
        Returns:
            ToolMetadata if found, None otherwise
        """
        return self.tools.get(tool_name)
    
    def get_all_tools(self) -> List[ToolMetadata]:
        """Get all registered tools
        
        Returns:
            List of all registered tools
        """
        return list(self.tools.values())
    
    def get_tools_by_category(self, category: str) -> List[ToolMetadata]:
        """Get tools by category
        
        Args:
            category: Category to filter by
            
        Returns:
            List of tools in the specified category
        """
        if category not in self.categories:
            return []
            
        return [self.tools[name] for name in self.categories[category] if name in self.tools]
    
    def get_tools_by_permission(self, permission: str) -> List[ToolMetadata]:
        """Get tools by required permission
        
        Args:
            permission: Permission to filter by
            
        Returns:
            List of tools requiring the specified permission
        """
        if permission not in self.permission_index:
            return []
            
        return [self.tools[name] for name in self.permission_index[permission] if name in self.tools]
    
    def get_openai_tools(self, categories: List[str] = None, 
                         permissions: List[str] = None,
                         include_local: bool = False) -> List[Dict[str, Any]]:
        """Get tools in OpenAI format for function calling
        
        Args:
            categories: Optional list of categories to filter by
            permissions: Optional list of permissions to filter by
            include_local: Whether to include local-only tools
            
        Returns:
            List of tools in OpenAI format
        """
        filtered_tools = self.get_all_tools()
        
        # Filter by categories if specified
        if categories:
            filtered_tools = [
                tool for tool in filtered_tools 
                if any(category in tool.categories for category in categories)
            ]
            
        # Filter by permissions if specified
        if permissions:
            filtered_tools = [
                tool for tool in filtered_tools 
                if all(perm in permissions for perm in tool.required_permissions)
            ]
            
        # Filter local-only tools if not included
        if not include_local:
            filtered_tools = [tool for tool in filtered_tools if not tool.is_local_only]
            
        # Convert to OpenAI format
        return [tool.to_openai_format() for tool in filtered_tools]
    
    def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a registered tool
        
        Args:
            tool_name: Name of the tool to execute
            arguments: Arguments to pass to the tool
            
        Returns:
            Tool execution result
        """
        # Get the tool
        tool = self.get_tool(tool_name)
        if not tool:
            logger.error(f"Tool {tool_name} not found for execution")
            return {"error": f"Tool {tool_name} not found"}
            
        try:
            # Increment invocation count
            tool.increment_count()
            
            # Execute the function
            result = tool.function(**arguments)
            
            # Ensure the result is JSON serializable
            if isinstance(result, dict):
                return result
            else:
                return {"result": result}
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}")
            return {"error": str(e)}
    
    def _create_metadata_from_function(self, func: ToolFunc) -> Optional[ToolMetadata]:
        """Create tool metadata from a function
        
        Args:
            func: Function to create metadata from
            
        Returns:
            ToolMetadata if successful, None otherwise
        """
        try:
            # Get function name and docstring
            name = func.__name__
            description = func.__doc__ or f"Execute the {name} function"
            
            # Parse docstring for additional info
            categories = ["default"]
            required_permissions = []
            is_local_only = False
            version = "1.0.0"
            author = "Devloop System"
            
            # Extract tool decorators if available
            if hasattr(func, "_tool_categories"):
                categories = func._tool_categories
                
            if hasattr(func, "_tool_permissions"):
                required_permissions = func._tool_permissions
                
            if hasattr(func, "_tool_local_only"):
                is_local_only = func._tool_local_only
                
            if hasattr(func, "_tool_version"):
                version = func._tool_version
                
            if hasattr(func, "_tool_author"):
                author = func._tool_author
            
            # Generate parameters schema from function signature
            parameters = self._generate_parameters_schema(func)
            
            # Create and return metadata
            return ToolMetadata(
                name=name,
                description=description,
                parameters=parameters,
                function=func,
                categories=categories,
                required_permissions=required_permissions,
                version=version,
                author=author,
                is_local_only=is_local_only
            )
        except Exception as e:
            logger.error(f"Error creating metadata for function {func.__name__}: {e}")
            return None
    
    def _generate_parameters_schema(self, func: ToolFunc) -> Dict[str, Any]:
        """Generate OpenAI-compatible parameters schema from function signature
        
        Args:
            func: Function to generate schema for
            
        Returns:
            Parameters schema dictionary
        """
        # Get function signature
        sig = inspect.signature(func)
        
        # Create properties and required fields
        properties = {}
        required = []
        
        for name, param in sig.parameters.items():
            # Skip self parameter for methods
            if name == 'self':
                continue
                
            # Determine type from annotation or default to string
            param_type = "string"
            if param.annotation != inspect.Parameter.empty:
                if param.annotation == int:
                    param_type = "integer"
                elif param.annotation == float:
                    param_type = "number"
                elif param.annotation == bool:
                    param_type = "boolean"
                elif param.annotation == list or param.annotation == List:
                    param_type = "array"
                elif param.annotation == dict or param.annotation == Dict:
                    param_type = "object"
            
            # Create property
            property_schema = {"type": param_type}
            
            # Add description if available
            if hasattr(func, "_param_descriptions") and name in func._param_descriptions:
                property_schema["description"] = func._param_descriptions[name]
            else:
                property_schema["description"] = f"Parameter: {name}"
                
            # Add to properties
            properties[name] = property_schema
            
            # Add to required if no default value
            if param.default == inspect.Parameter.empty:
                required.append(name)
        
        # Create and return schema
        return {
            "type": "object",
            "properties": properties,
            "required": required
        }


# Decorators for tool registration
def tool(name: str = None, description: str = None, 
         categories: List[str] = None, 
         permissions: List[str] = None,
         local_only: bool = False,
         version: str = "1.0.0",
         author: str = "Devloop System"):
    """Decorator to register a function as a tool
    
    Args:
        name: Optional custom name (defaults to function name)
        description: Optional custom description (defaults to docstring)
        categories: Tool categories
        permissions: Required permissions
        local_only: Whether tool is local-only
        version: Tool version
        author: Tool author/owner
        
    Returns:
        Decorated function
    """
    def decorator(func: ToolFunc) -> ToolFunc:
        # Store metadata on the function
        if name:
            func.__name__ = name
            
        if description:
            func.__doc__ = description
            
        if categories:
            func._tool_categories = categories
            
        if permissions:
            func._tool_permissions = permissions
            
        if local_only:
            func._tool_local_only = local_only
            
        if version:
            func._tool_version = version
            
        if author:
            func._tool_author = author
        
        # Register with the registry
        registry = ToolRegistry()
        registry.register(func)
        
        return func
    
    return decorator


def param_description(descriptions: Dict[str, str]):
    """Decorator to add parameter descriptions
    
    Args:
        descriptions: Dictionary mapping parameter names to descriptions
        
    Returns:
        Decorated function
    """
    def decorator(func: ToolFunc) -> ToolFunc:
        func._param_descriptions = descriptions
        return func
    
    return decorator


# Example usage
if __name__ == "__main__":
    # Create a registry
    registry = ToolRegistry()
    
    # Define a tool using decorators
    @tool(
        categories=["file", "system"],
        permissions=["file_read"],
        local_only=True,
        version="1.0.1",
        author="Devloop Team"
    )
    @param_description({
        "path": "File path to read",
        "lines": "Number of lines to read (optional)"
    })
    def read_file(path: str, lines: int = 10) -> Dict[str, Any]:
        """Read a file and return its contents
        
        Args:
            path: File path to read
            lines: Number of lines to read (defaults to 10)
            
        Returns:
            File contents
        """
        try:
            with open(path, 'r') as f:
                content = "".join([next(f) for _ in range(lines)])
            return {"content": content, "path": path, "lines_read": lines}
        except Exception as e:
            return {"error": str(e)}
    
    # Get all tools in OpenAI format
    openai_tools = registry.get_openai_tools()
    print(f"OpenAI tools: {json.dumps(openai_tools, indent=2)}")
    
    # Execute a tool
    result = registry.execute_tool("read_file", {"path": "/etc/hostname"})
    print(f"Execution result: {result}")