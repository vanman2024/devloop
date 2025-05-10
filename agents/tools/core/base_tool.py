#!/usr/bin/env python3
"""
Base Tool Module

Provides the base classes and interfaces for creating tools in the Devloop system.
Tools are capabilities exposed to agents via the OpenAI function calling interface.
"""

import os
import json
import inspect
import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Union, Callable, TypeVar, Generic

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("base_tool")

# Import tool registry
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from registry.tool_registry import ToolRegistry, tool, param_description


class BaseTool(ABC):
    """Base abstract class for all tools"""
    
    def __init__(self, name: str = None, description: str = None):
        """Initialize the base tool
        
        Args:
            name: Tool name (defaults to class name)
            description: Tool description (defaults to class docstring)
        """
        self.name = name or self.__class__.__name__
        self.description = description or self.__class__.__doc__ or f"Tool: {self.name}"
        self.registry = ToolRegistry()
        
    @abstractmethod
    def execute(self, **kwargs) -> Any:
        """Execute the tool functionality
        
        Args:
            **kwargs: Tool parameters
            
        Returns:
            Tool execution result
        """
        pass
    
    def register(self, categories: List[str] = None, 
                permissions: List[str] = None,
                local_only: bool = False,
                version: str = "1.0.0",
                author: str = "Devloop System") -> str:
        """Register this tool with the registry
        
        Args:
            categories: Tool categories
            permissions: Required permissions
            local_only: Whether tool is local-only
            version: Tool version
            author: Tool author/owner
            
        Returns:
            Tool ID
        """
        # Create a wrapper function that calls execute
        @tool(
            name=self.name,
            description=self.description,
            categories=categories,
            permissions=permissions,
            local_only=local_only,
            version=version,
            author=author
        )
        def tool_wrapper(**kwargs):
            return self.execute(**kwargs)
        
        # Copy signature and parameter descriptions
        tool_wrapper.__signature__ = inspect.signature(self.execute)
        if hasattr(self.execute, '_param_descriptions'):
            tool_wrapper._param_descriptions = self.execute._param_descriptions
        
        return self.registry.register(tool_wrapper)


class FileTool(BaseTool):
    """Base class for file-related tools"""
    
    def __init__(self, name: str = None, description: str = None):
        """Initialize the file tool
        
        Args:
            name: Tool name
            description: Tool description
        """
        super().__init__(name, description)
        
    def validate_path(self, path: str) -> bool:
        """Validate a file path
        
        Args:
            path: File path to validate
            
        Returns:
            True if path is valid, False otherwise
        """
        # Basic path validation
        try:
            # Make path absolute if it's not
            if not os.path.isabs(path):
                path = os.path.abspath(path)
                
            # Check for problematic patterns
            for pattern in ['/dev/', '/proc/', '/sys/', '/run/', '/boot/']:
                if pattern in path:
                    logger.warning(f"Rejected path containing system directory: {path}")
                    return False
                    
            # Check if path exists
            exists = os.path.exists(path)
            logger.info(f"Path validation: {path} exists={exists}")
            return True
        except Exception as e:
            logger.error(f"Path validation error for {path}: {e}")
            return False


class SystemTool(BaseTool):
    """Base class for system-related tools"""
    
    def __init__(self, name: str = None, description: str = None):
        """Initialize the system tool
        
        Args:
            name: Tool name
            description: Tool description
        """
        super().__init__(name, description)
        
    def validate_command(self, command: str) -> bool:
        """Validate a system command
        
        Args:
            command: Command to validate
            
        Returns:
            True if command is valid, False otherwise
        """
        # Basic command validation
        try:
            # Check for problematic commands
            disallowed = ['rm -rf', 'shutdown', 'reboot', 'format', 'dd',
                         'mkfs', 'fdisk', 'sudo', 'su', 'passwd']
                         
            for cmd in disallowed:
                if cmd in command:
                    logger.warning(f"Rejected dangerous command: {command}")
                    return False
                    
            logger.info(f"Command validation: {command} passed")
            return True
        except Exception as e:
            logger.error(f"Command validation error for {command}: {e}")
            return False


class APITool(BaseTool):
    """Base class for API-related tools"""
    
    def __init__(self, name: str = None, description: str = None, base_url: str = None):
        """Initialize the API tool
        
        Args:
            name: Tool name
            description: Tool description
            base_url: Base URL for API calls
        """
        super().__init__(name, description)
        self.base_url = base_url
        
    def validate_url(self, url: str) -> bool:
        """Validate a URL
        
        Args:
            url: URL to validate
            
        Returns:
            True if URL is valid, False otherwise
        """
        # Basic URL validation
        try:
            # Check for protocol
            if not url.startswith(('http://', 'https://')):
                logger.warning(f"Rejected URL without protocol: {url}")
                return False
                
            # If base_url is set, ensure URL starts with it
            if self.base_url and not url.startswith(self.base_url):
                logger.warning(f"Rejected URL not matching base_url {self.base_url}: {url}")
                return False
                
            logger.info(f"URL validation: {url} passed")
            return True
        except Exception as e:
            logger.error(f"URL validation error for {url}: {e}")
            return False


class DatabaseTool(BaseTool):
    """Base class for database-related tools"""
    
    def __init__(self, name: str = None, description: str = None, 
                connection_string: str = None):
        """Initialize the database tool
        
        Args:
            name: Tool name
            description: Tool description
            connection_string: Database connection string
        """
        super().__init__(name, description)
        self.connection_string = connection_string
        self.connection = None
        
    def connect(self) -> bool:
        """Connect to the database
        
        Returns:
            True if connection successful, False otherwise
        """
        logger.warning("Database connection not implemented in base class")
        return False
        
    def disconnect(self) -> None:
        """Disconnect from the database"""
        if self.connection:
            self.connection = None
            logger.info("Database disconnected")
            
    def validate_query(self, query: str) -> bool:
        """Validate a database query
        
        Args:
            query: Query to validate
            
        Returns:
            True if query is valid, False otherwise
        """
        # Basic query validation
        try:
            # Check for problematic queries
            disallowed = ['DROP ', 'DELETE FROM', 'TRUNCATE ', 'ALTER ', 
                         'GRANT ', 'REVOKE ', 'CREATE USER']
                         
            for cmd in disallowed:
                if cmd.upper() in query.upper():
                    logger.warning(f"Rejected dangerous query: {query}")
                    return False
                    
            logger.info(f"Query validation: passed")
            return True
        except Exception as e:
            logger.error(f"Query validation error: {e}")
            return False


# Helper function for creating tools
def create_tool(func: Callable, 
               name: str = None, 
               description: str = None,
               categories: List[str] = None, 
               permissions: List[str] = None,
               local_only: bool = False,
               version: str = "1.0.0",
               author: str = "Devloop System",
               param_descriptions: Dict[str, str] = None) -> str:
    """Create and register a tool from a function
    
    Args:
        func: Function to create tool from
        name: Tool name (defaults to function name)
        description: Tool description (defaults to function docstring)
        categories: Tool categories
        permissions: Required permissions
        local_only: Whether tool is local-only
        version: Tool version
        author: Tool author/owner
        param_descriptions: Parameter descriptions
        
    Returns:
        Tool ID
    """
    # Apply parameter descriptions if provided
    if param_descriptions:
        func = param_description(param_descriptions)(func)
    
    # Apply tool decorator
    decorated_func = tool(
        name=name,
        description=description,
        categories=categories,
        permissions=permissions,
        local_only=local_only,
        version=version,
        author=author
    )(func)
    
    return decorated_func


# Example usage
if __name__ == "__main__":
    # Example file tool
    class ReadFileTool(FileTool):
        """Read a file and return its contents"""
        
        def __init__(self):
            super().__init__(name="read_file")
            
        @param_description({
            "path": "File path to read",
            "lines": "Number of lines to read (optional)"
        })
        def execute(self, path: str, lines: int = 10) -> Dict[str, Any]:
            """Read a file and return its contents
            
            Args:
                path: File path to read
                lines: Number of lines to read
                
            Returns:
                File contents
            """
            if not self.validate_path(path):
                return {"error": f"Invalid path: {path}"}
                
            try:
                with open(path, 'r') as f:
                    content = "".join([next(f) for _ in range(lines)])
                return {"content": content, "path": path, "lines_read": lines}
            except Exception as e:
                return {"error": str(e)}
                
    # Create and register the tool
    read_file_tool = ReadFileTool()
    tool_id = read_file_tool.register(
        categories=["file", "system"],
        permissions=["file_read"],
        local_only=True
    )
    
    print(f"Registered tool with ID: {tool_id}")
    
    # Use the tool registry to execute
    registry = ToolRegistry()
    result = registry.execute_tool("read_file", {"path": "/etc/hostname"})
    print(f"Execution result: {result}")