#!/usr/bin/env python3
"""
Tool System Initialization Script

This script initializes the tool system and demonstrates how to integrate it
with the SDK agent to enable function calling capabilities.
"""

import os
import sys
import json
import logging
from typing import Dict, List, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("tool_system_init")

# Add parent directory to path to ensure imports work properly
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)
    
# Import tool registry and provider
from tools import register_all_tools
from tools.registry import ToolRegistry
from tools.core import SDKToolProvider, ToolPermissionManager

# Import SDK agent
from sdk.core.agent import SDKAgent


def initialize_tool_system() -> Dict[str, Any]:
    """Initialize the tool system
    
    Returns:
        Initialization status
    """
    logger.info("Initializing tool system...")
    
    # Register all tools
    register_all_tools()
    
    # Get the registry
    registry = ToolRegistry()
    
    # Get information about registered tools
    tools = registry.get_all_tools()
    categories = {}
    
    for tool in tools:
        for category in tool.categories:
            if category not in categories:
                categories[category] = []
            categories[category].append(tool.name)
    
    return {
        "status": "initialized",
        "tool_count": len(tools),
        "categories": categories,
        "category_count": len(categories)
    }


def create_agent_with_tools(name: str, instructions: str, 
                            categories: List[str] = None,
                            permissions: List[str] = None) -> SDKAgent:
    """Create an SDK agent with tools
    
    Args:
        name: Agent name
        instructions: Agent instructions
        categories: Tool categories to include
        permissions: Tool permissions to grant
        
    Returns:
        SDK agent with tools
    """
    # Initialize permission manager
    permission_manager = ToolPermissionManager()
    
    # Set default permissions
    permission_manager.set_default_permissions(["system_info", "memory_read"])
    
    # Set agent-specific permissions
    agent_id = f"{name.lower().replace(' ', '-')}-agent"
    if permissions:
        permission_manager.set_agent_permissions(agent_id, permissions)
    
    # Create tool provider
    tool_provider = permission_manager.create_tool_provider(agent_id)
    
    # Get tools configuration
    tools_config = tool_provider.get_tools_config(categories=categories)
    
    # Create agent configuration
    config = {
        "agent_id": agent_id,
        "agent_name": name,
        "agent_type": "sdk_agent",
        "instructions": instructions,
        "model": "gpt-4o",
        "tools": tools_config
    }
    
    # Create agent
    agent = SDKAgent(config)
    
    # Store tool provider with agent for tool call handling
    agent.tool_provider = tool_provider
    
    return agent


def handle_agent_tool_calls(agent: SDKAgent, run: Any) -> List[Dict[str, Any]]:
    """Handle tool calls from an SDK agent
    
    Args:
        agent: SDK agent
        run: OpenAI run object
        
    Returns:
        Tool outputs
    """
    if not hasattr(agent, "tool_provider"):
        logger.error("Agent does not have a tool provider")
        return []
        
    # Extract tool calls
    tool_calls = run.required_action.submit_tool_outputs.tool_calls
    
    # Handle tool calls
    return agent.tool_provider.handle_tool_calls(tool_calls)


def demonstrate_tool_usage(agent: SDKAgent, prompt: str) -> Dict[str, Any]:
    """Demonstrate tool usage with an agent
    
    Args:
        agent: SDK agent
        prompt: Prompt to send to the agent
        
    Returns:
        Agent execution result
    """
    logger.info(f"Executing agent with prompt: {prompt}")
    
    # Standard agent execution with tool handling
    try:
        if not agent.openai_available or not agent.assistant or not agent.thread:
            logger.warning("Agent not fully initialized, using mock execution")
            return {"response": agent._mock_execution(prompt)}
            
        # Create message
        message = agent.client.beta.threads.messages.create(
            thread_id=agent.thread.id,
            role="user",
            content=prompt
        )
        
        # Run the assistant
        run = agent.client.beta.threads.runs.create(
            thread_id=agent.thread.id,
            assistant_id=agent.assistant.id
        )
        
        # Monitor the run
        while run.status in ["queued", "in_progress"]:
            run = agent.client.beta.threads.runs.retrieve(
                thread_id=agent.thread.id,
                run_id=run.id
            )
            
            # Handle tool calls
            if run.status == "requires_action":
                logger.info("Agent requires action (tool calls)")
                
                # Handle tool calls
                tool_outputs = handle_agent_tool_calls(agent, run)
                
                # Submit tool outputs
                run = agent.client.beta.threads.runs.submit_tool_outputs(
                    thread_id=agent.thread.id,
                    run_id=run.id,
                    tool_outputs=tool_outputs
                )
                
        # Get the final messages
        messages = agent.client.beta.threads.messages.list(
            thread_id=agent.thread.id
        )
        
        # Extract the assistant's response
        if messages.data:
            return {"response": messages.data[0].content[0].text.value}
        else:
            return {"error": "No response generated"}
    except Exception as e:
        logger.error(f"Error executing agent: {e}")
        return {"error": str(e)}


# Main entry point
if __name__ == "__main__":
    # Initialize tool system
    init_status = initialize_tool_system()
    print(f"Tool system initialized with {init_status['tool_count']} tools in {init_status['category_count']} categories")
    
    # Define some example agents with different tool access
    agents = [
        {
            "name": "System Analysis Agent",
            "instructions": "You are a system analysis agent focused on monitoring and maintaining system health. Use tools to gather information about the system and analyze it.",
            "categories": ["system", "info", "monitoring"],
            "permissions": ["system_info", "memory_read"]
        },
        {
            "name": "Knowledge Manager Agent",
            "instructions": "You are a knowledge management agent focused on organizing and retrieving information. Use tools to store and retrieve facts and observations.",
            "categories": ["knowledge", "memory"],
            "permissions": ["memory_read", "memory_write"]
        },
        {
            "name": "Health Monitor Agent",
            "instructions": "You are a health monitoring agent focused on ensuring system health. Use tools to check system health and resolve issues.",
            "categories": ["health", "monitoring", "system"],
            "permissions": ["system_info", "system_maintenance", "memory_read", "memory_write"]
        }
    ]
    
    # Create agents
    created_agents = {}
    for agent_config in agents:
        agent = create_agent_with_tools(
            name=agent_config["name"],
            instructions=agent_config["instructions"],
            categories=agent_config["categories"],
            permissions=agent_config["permissions"]
        )
        created_agents[agent_config["name"]] = agent
        print(f"Created agent: {agent_config['name']}")
        
    # Choose an agent to demonstrate
    demo_agent = created_agents["System Analysis Agent"]
    
    # Run a demonstration (if OpenAI is configured)
    if demo_agent.openai_available:
        print("\nRunning demonstration with System Analysis Agent...\n")
        
        # Execute agent with a prompt that will trigger tool use
        result = demonstrate_tool_usage(
            agent=demo_agent,
            prompt="Can you get information about the current system health, especially CPU and memory usage?"
        )
        
        print("\nAgent Response:")
        print(result.get("response", "No response"))
    else:
        print("\nOpenAI not available. Skipping demonstration.")
        print("To run the demonstration, ensure your OpenAI API key is configured.")
        
    print("\nTool system initialized successfully!")
    print(f"- {init_status['tool_count']} tools available")
    print(f"- {init_status['category_count']} categories configured")
    print("- 3 example agents created")
    print("\nFor details about available tools, use the ToolRegistry class:")
    print("  from tools.registry import ToolRegistry")
    print("  registry = ToolRegistry()")
    print("  tools = registry.get_all_tools()")
    print("  for tool in tools:")
    print("      print(f\"{tool.name}: {tool.description}\")")