#!/usr/bin/env python3
"""
Register File Access System with Agent Frameworks

This script registers the File Access System as a tool with the feature and task agents,
allowing them to use the file access capabilities directly.
"""

import os
import json
import sys
from datetime import datetime

# Add the project root to the path
sys.path.append('/mnt/c/Users/angel/Devloop')

# Try to import actual agent framework, create stub if not available
try:
    from agents.core.agent import Agent, Tool
    from agents.catalog.planning.architect_agent import ArchitectAgent
    from agents.catalog.planning.detail_agent import DetailAgent
except ImportError:
    print("Error: Cannot import Agent classes. Using stub implementation.")
    
    # Stub classes for demonstration
    class Tool:
        def __init__(self, name, description, function=None, parameters=None):
            self.name = name
            self.description = description
            self.function = function
            self.parameters = parameters or {}
            
        def to_dict(self):
            return {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters
            }
    
    class Agent:
        def __init__(self, name, description):
            self.name = name
            self.description = description
            self.tools = []
            
        def add_tool(self, tool):
            self.tools.append(tool)
            print(f"Added tool '{tool.name}' to agent '{self.name}'")
            
        def save(self, path=None):
            print(f"Saving agent '{self.name}' configuration")
            agent_data = {
                "name": self.name,
                "description": self.description,
                "tools": [tool.to_dict() for tool in self.tools],
                "updated_at": datetime.now().isoformat()
            }
            
            if path:
                print(f"Would save to: {path}")
                directory = os.path.dirname(path)
                if not os.path.exists(directory):
                    os.makedirs(directory)
                with open(path, 'w') as f:
                    json.dump(agent_data, f, indent=2)
            
            return agent_data
    
    class ArchitectAgent(Agent):
        def __init__(self):
            super().__init__("architect_agent", "Plans and designs system architecture")
    
    class DetailAgent(Agent):
        def __init__(self):
            super().__init__("detail_agent", "Creates detailed specifications")
            
    class FeatureAgent(Agent):
        def __init__(self):
            super().__init__("feature_agent", "Develops and implements features")
            
    class TaskAgent(Agent):
        def __init__(self):
            super().__init__("task_agent", "Performs specific implementation tasks")

# Create the file access tool definitions
def create_file_access_tools():
    # Get File tool
    get_file_tool = Tool(
        name="get_file",
        description="Retrieves the content of a file from the codebase",
        parameters={
            "path": {
                "type": "string",
                "description": "Relative path to the file within the codebase"
            }
        }
    )
    
    # List directory tool
    list_directory_tool = Tool(
        name="list_directory",
        description="Lists the contents of a directory in the codebase",
        parameters={
            "path": {
                "type": "string", 
                "description": "Relative path to the directory (empty for root)"
            }
        }
    )
    
    # Search files tool
    search_files_tool = Tool(
        name="search_files",
        description="Searches for a pattern across files in the codebase",
        parameters={
            "pattern": {
                "type": "string",
                "description": "Search pattern or regular expression"
            },
            "path": {
                "type": "string",
                "description": "Relative path to search within (empty for entire codebase)"
            },
            "file_types": {
                "type": "array",
                "description": "Optional list of file extensions to search (e.g. ['.js', '.py'])"
            }
        }
    )
    
    # Write file tool
    write_file_tool = Tool(
        name="write_file",
        description="Writes content to a file in the codebase",
        parameters={
            "path": {
                "type": "string",
                "description": "Relative path to the file to write"
            },
            "content": {
                "type": "string",
                "description": "Content to write to the file"
            },
            "create_dirs": {
                "type": "boolean",
                "description": "Whether to create parent directories if they don't exist"
            }
        }
    )
    
    # Get file info tool
    file_info_tool = Tool(
        name="file_info",
        description="Gets metadata about a file in the codebase",
        parameters={
            "path": {
                "type": "string",
                "description": "Relative path to the file"
            }
        }
    )
    
    return [get_file_tool, list_directory_tool, search_files_tool, write_file_tool, file_info_tool]

def main():
    print("Registering File Access System with agents...")
    
    # Create the tools
    file_access_tools = create_file_access_tools()
    
    # Load or create the agents
    try:
        # Try to load existing agents first
        architect_agent = ArchitectAgent()
        detail_agent = DetailAgent()
        feature_agent = FeatureAgent()
        task_agent = TaskAgent()
    except Exception as e:
        print(f"Error loading agents: {e}")
        print("Creating new agent instances...")
        architect_agent = ArchitectAgent()
        detail_agent = DetailAgent()
        feature_agent = FeatureAgent() 
        task_agent = TaskAgent()
    
    # Register tools with each agent
    for tool in file_access_tools:
        architect_agent.add_tool(tool)
        detail_agent.add_tool(tool)
        feature_agent.add_tool(tool)
        task_agent.add_tool(tool)
    
    # Save the updated agent configurations
    base_path = "/mnt/c/Users/angel/Devloop/agents/catalog"
    
    architect_path = os.path.join(base_path, "planning/architect_agent.json")
    detail_path = os.path.join(base_path, "planning/detail_agent.json")
    feature_path = os.path.join(base_path, "planning/feature_agent.json")
    task_path = os.path.join(base_path, "system/task_agent.json")
    
    architect_agent.save(architect_path)
    detail_agent.save(detail_path)
    feature_agent.save(feature_path)
    task_agent.save(task_path)
    
    print("Successfully registered File Access System with all agents!")
    
    # Create a record of the registration
    registration_record = {
        "timestamp": datetime.now().isoformat(),
        "component": "file_access_system",
        "registered_with": ["architect_agent", "detail_agent", "feature_agent", "task_agent"],
        "tools_added": [tool.name for tool in file_access_tools]
    }
    
    record_path = "/mnt/c/Users/angel/Devloop/logs/agent_registrations.json"
    os.makedirs(os.path.dirname(record_path), exist_ok=True)
    
    try:
        if os.path.exists(record_path):
            with open(record_path, 'r') as f:
                records = json.load(f)
        else:
            records = []
        
        records.append(registration_record)
        
        with open(record_path, 'w') as f:
            json.dump(records, f, indent=2)
    except Exception as e:
        print(f"Error saving registration record: {e}")

if __name__ == "__main__":
    main()