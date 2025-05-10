#!/usr/bin/env python3
"""
System Tools Module

Provides system-level tools for agents in the Devloop system.
These tools allow agents to interact with system resources in a safe, controlled manner.
"""

import os
import platform
import socket
import time
import json
import logging
import psutil
from datetime import datetime
from typing import Dict, List, Any, Optional, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("system_tools")

# Import tool decorators
from ..registry.tool_registry import tool, param_description
from .base_tool import SystemTool


class SystemInfoTool(SystemTool):
    """Tool for retrieving system information"""
    
    def __init__(self):
        """Initialize the system info tool"""
        super().__init__(name="get_system_info", 
                         description="Get information about the system environment")
        
    @param_description({
        "include_hardware": "Whether to include hardware information",
        "include_network": "Whether to include network information",
        "include_process": "Whether to include current process information"
    })
    def execute(self, include_hardware: bool = True, 
                include_network: bool = False,
                include_process: bool = False) -> Dict[str, Any]:
        """Get system information
        
        Args:
            include_hardware: Whether to include hardware information
            include_network: Whether to include network information
            include_process: Whether to include current process information
            
        Returns:
            Dictionary containing system information
        """
        info = {
            "os": {
                "name": os.name,
                "platform": platform.system(),
                "release": platform.release(),
                "version": platform.version(),
                "architecture": platform.machine(),
                "python_version": platform.python_version()
            },
            "time": {
                "current_time": datetime.now().isoformat(),
                "timezone": time.tzname,
                "uptime_seconds": time.time() - psutil.boot_time()
            }
        }
        
        # Add hardware information if requested
        if include_hardware:
            info["hardware"] = {
                "cpu": {
                    "cores_physical": psutil.cpu_count(logical=False),
                    "cores_logical": psutil.cpu_count(logical=True),
                    "usage_percent": psutil.cpu_percent(interval=0.1)
                },
                "memory": {
                    "total": psutil.virtual_memory().total,
                    "available": psutil.virtual_memory().available,
                    "used": psutil.virtual_memory().used,
                    "percent": psutil.virtual_memory().percent
                },
                "disk": {
                    "total": psutil.disk_usage('/').total,
                    "free": psutil.disk_usage('/').free,
                    "used": psutil.disk_usage('/').used,
                    "percent": psutil.disk_usage('/').percent
                }
            }
        
        # Add network information if requested
        if include_network:
            info["network"] = {
                "hostname": socket.gethostname(),
                "ip_address": socket.gethostbyname(socket.gethostname()),
                "interfaces": psutil.net_if_addrs()
            }
        
        # Add process information if requested
        if include_process:
            current_process = psutil.Process(os.getpid())
            info["process"] = {
                "pid": os.getpid(),
                "memory_info": current_process.memory_info()._asdict(),
                "cpu_percent": current_process.cpu_percent(interval=0.1),
                "create_time": datetime.fromtimestamp(current_process.create_time()).isoformat(),
                "username": current_process.username(),
                "cwd": current_process.cwd()
            }
        
        return info


class FileSystemTool(SystemTool):
    """Tool for safely interacting with the file system"""
    
    def __init__(self):
        """Initialize the file system tool"""
        super().__init__(name="list_directory", 
                         description="List contents of a directory")
        
    @param_description({
        "directory": "Directory path to list",
        "pattern": "Optional glob pattern to filter files",
        "include_stats": "Whether to include file stats like size and modification time"
    })
    def execute(self, directory: str, pattern: str = "*", 
                include_stats: bool = False) -> Dict[str, Any]:
        """List directory contents
        
        Args:
            directory: Directory path to list
            pattern: Optional glob pattern to filter files
            include_stats: Whether to include file stats
            
        Returns:
            Dictionary containing directory contents
        """
        import glob
        
        # Validate directory
        if not self.validate_path(directory):
            return {"error": f"Invalid or restricted directory: {directory}"}
            
        if not os.path.isdir(directory):
            return {"error": f"Not a directory: {directory}"}
            
        try:
            # Get matching files
            pattern_path = os.path.join(directory, pattern)
            matching_files = glob.glob(pattern_path)
            
            # Process results
            files = []
            directories = []
            
            for item in matching_files:
                if os.path.isdir(item):
                    if include_stats:
                        stat_info = os.stat(item)
                        directories.append({
                            "name": os.path.basename(item),
                            "path": item,
                            "type": "directory",
                            "size": sum(os.path.getsize(os.path.join(dirpath, filename)) 
                                      for dirpath, _, filenames in os.walk(item) 
                                      for filename in filenames),
                            "modified": datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                            "created": datetime.fromtimestamp(stat_info.st_ctime).isoformat()
                        })
                    else:
                        directories.append({
                            "name": os.path.basename(item),
                            "path": item,
                            "type": "directory"
                        })
                else:
                    if include_stats:
                        stat_info = os.stat(item)
                        files.append({
                            "name": os.path.basename(item),
                            "path": item,
                            "type": "file",
                            "size": stat_info.st_size,
                            "modified": datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                            "created": datetime.fromtimestamp(stat_info.st_ctime).isoformat()
                        })
                    else:
                        files.append({
                            "name": os.path.basename(item),
                            "path": item,
                            "type": "file"
                        })
            
            return {
                "directory": directory,
                "pattern": pattern,
                "directories": directories,
                "files": files,
                "total_items": len(directories) + len(files)
            }
        except Exception as e:
            logger.error(f"Error listing directory {directory}: {e}")
            return {"error": str(e)}


class ProcessTool(SystemTool):
    """Tool for managing processes and retrieving process information"""
    
    def __init__(self):
        """Initialize the process tool"""
        super().__init__(name="get_process_info", 
                         description="Get information about running processes")
        
    @param_description({
        "name_filter": "Optional filter for process names",
        "limit": "Maximum number of processes to return"
    })
    def execute(self, name_filter: str = "", limit: int = 10) -> Dict[str, Any]:
        """Get information about running processes
        
        Args:
            name_filter: Optional filter for process names
            limit: Maximum number of processes to return
            
        Returns:
            Dictionary containing process information
        """
        try:
            processes = []
            count = 0
            
            for proc in psutil.process_iter(['pid', 'name', 'username', 'memory_info', 'cpu_percent', 'create_time', 'status']):
                try:
                    # Skip if doesn't match filter
                    if name_filter and name_filter.lower() not in proc.info['name'].lower():
                        continue
                        
                    # Add to results
                    proc_info = proc.info
                    proc_info['memory_mb'] = proc_info['memory_info'].rss / (1024 * 1024) if proc_info['memory_info'] else 0
                    proc_info['create_time'] = datetime.fromtimestamp(proc_info['create_time']).isoformat() if proc_info['create_time'] else None
                    del proc_info['memory_info']  # Remove complex object
                    
                    processes.append(proc_info)
                    count += 1
                    
                    # Check limit
                    if count >= limit:
                        break
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    pass
            
            # Sort by memory usage
            processes.sort(key=lambda x: x.get('memory_mb', 0), reverse=True)
            
            return {
                "count": len(processes),
                "filter": name_filter,
                "processes": processes
            }
        except Exception as e:
            logger.error(f"Error retrieving process information: {e}")
            return {"error": str(e)}


# Function-based tools using decorators

@tool(
    name="get_timestamp",
    description="Get the current timestamp in different formats",
    categories=["system", "time"],
    permissions=["system_info"]
)
@param_description({
    "format": "Timestamp format (iso, unix, or human)"
})
def get_timestamp(format: str = "iso") -> Dict[str, Any]:
    """Get the current timestamp
    
    Args:
        format: Timestamp format (iso, unix, or human)
        
    Returns:
        Formatted timestamp
    """
    now = datetime.now()
    
    if format.lower() == "unix":
        return {"timestamp": time.time()}
    elif format.lower() == "human":
        return {"timestamp": now.strftime("%Y-%m-%d %H:%M:%S")}
    else:  # Default to ISO
        return {"timestamp": now.isoformat()}


@tool(
    name="check_connectivity",
    description="Check connectivity to specified hosts",
    categories=["system", "network"],
    permissions=["network"]
)
@param_description({
    "hosts": "List of hosts to check (e.g., ['google.com', 'github.com'])",
    "timeout": "Connection timeout in seconds"
})
def check_connectivity(hosts: List[str], timeout: float = 2.0) -> Dict[str, Any]:
    """Check connectivity to specified hosts
    
    Args:
        hosts: List of hosts to check
        timeout: Connection timeout in seconds
        
    Returns:
        Connectivity status for each host
    """
    import socket
    
    results = {}
    
    for host in hosts:
        try:
            # Try to connect to host on port 80
            socket.create_connection((host, 80), timeout=timeout)
            results[host] = {"status": "reachable", "success": True}
        except (socket.timeout, socket.gaierror, ConnectionRefusedError) as e:
            results[host] = {"status": "unreachable", "success": False, "error": str(e)}
    
    return {
        "results": results,
        "success_count": sum(1 for host, result in results.items() if result.get("success", False)),
        "total_count": len(hosts)
    }


# Register our tools
def register_system_tools():
    """Register all system tools with the registry"""
    # Create and register class-based tools
    system_info_tool = SystemInfoTool()
    system_info_tool.register(
        categories=["system", "info"],
        permissions=["system_info"]
    )
    
    file_system_tool = FileSystemTool()
    file_system_tool.register(
        categories=["system", "file"],
        permissions=["file_read"]
    )
    
    process_tool = ProcessTool()
    process_tool.register(
        categories=["system", "process"],
        permissions=["system_info", "process_info"]
    )
    
    # Function-based tools are registered via decorators
    # No need to explicitly register them here
    
    logger.info("Registered system tools")


# Example usage
if __name__ == "__main__":
    # Register all system tools
    register_system_tools()
    
    # Import the registry
    from ..registry.tool_registry import ToolRegistry
    
    # Get the registry
    registry = ToolRegistry()
    
    # Get system info
    result = registry.execute_tool("get_system_info", {})
    print(f"System Info: {json.dumps(result, indent=2)}")
    
    # List a directory
    result = registry.execute_tool("list_directory", {"directory": "/tmp"})
    print(f"Directory listing: {json.dumps(result, indent=2)}")
    
    # Get process info
    result = registry.execute_tool("get_process_info", {"name_filter": "python"})
    print(f"Process info: {json.dumps(result, indent=2)}")
    
    # Get timestamp
    result = registry.execute_tool("get_timestamp", {"format": "human"})
    print(f"Timestamp: {json.dumps(result, indent=2)}")
    
    # Check connectivity
    result = registry.execute_tool("check_connectivity", {"hosts": ["google.com", "github.com"]})
    print(f"Connectivity: {json.dumps(result, indent=2)}")