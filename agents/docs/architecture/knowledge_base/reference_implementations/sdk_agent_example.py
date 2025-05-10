#!/usr/bin/env python3
"""
SDK Agent Example

This example shows how to create an SDK-based agent with custom tools.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional

# Import SDK components
from agents.sdk.core.agent import SDKAgent
from agents.tools.registry import ToolRegistry, tool, param_description
from agents.tools.core import SDKToolProvider, ToolPermissionManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("sdk_agent_example")

# Define a custom tool
@tool(
    name="get_weather",
    description="Get weather information for a location",
    categories=["weather", "utility"],
    permissions=["api_access"]
)
@param_description({
    "location": "City or location to get weather for",
    "units": "Temperature units (celsius or fahrenheit)"
})
def get_weather(location: str, units: str = "celsius") -> Dict[str, Any]:
    """Get weather information for a location
    
    Args:
        location: City or location to get weather for
        units: Temperature units (celsius or fahrenheit)
        
    Returns:
        Weather information for the location
    """
    # In a real implementation, this would call a weather API
    # This is a mock implementation for demonstration
    weather_data = {
        "location": location,
        "temperature": 22.5 if units == "celsius" else 72.5,
        "units": units,
        "condition": "Sunny",
        "humidity": 45,
        "wind_speed": 10,
        "forecast": [
            {"day": "Today", "condition": "Sunny", "max_temp": 25 if units == "celsius" else 77},
            {"day": "Tomorrow", "condition": "Partly Cloudy", "max_temp": 23 if units == "celsius" else 73},
            {"day": "Day After", "condition": "Rainy", "max_temp": 20 if units == "celsius" else 68}
        ]
    }
    
    return weather_data

# Create a weather agent
def create_weather_agent(api_key: Optional[str] = None) -> SDKAgent:
    """Create a weather agent with weather tools
    
    Args:
        api_key: OpenAI API key (optional, defaults to environment variable)
        
    Returns:
        Configured SDK agent
    """
    # Initialize permissions for this agent
    permission_manager = ToolPermissionManager()
    permission_manager.set_default_permissions(["api_access"])
    
    # Create agent ID
    agent_id = "weather-agent"
    
    # Create tool provider with permissions
    tool_provider = permission_manager.create_tool_provider(agent_id)
    
    # Get weather tools
    tools_config = tool_provider.get_tools_config(categories=["weather"])
    
    # Agent configuration
    config = {
        "agent_id": agent_id,
        "agent_name": "Weather Assistant",
        "agent_type": "sdk_agent",
        "instructions": "You are a helpful weather assistant. Use your tools to provide accurate weather information when asked.",
        "model": "gpt-4o",
        "tools": tools_config,
        "api_key": api_key
    }
    
    # Create agent
    agent = SDKAgent(config)
    
    # Store tool provider with agent for handling tool calls
    agent.tool_provider = tool_provider
    
    return agent

# Example usage
def demonstrate_weather_agent():
    """Demonstrate the weather agent"""
    # Initialize tool registry and register tools
    registry = ToolRegistry()
    
    # Check if weather tool is registered
    weather_tool = registry.get_tool("get_weather")
    if not weather_tool:
        logger.info("Weather tool not registered, registering now...")
        # Tool decoration should have registered it, but we can check
    
    # Create agent
    weather_agent = create_weather_agent()
    
    if not weather_agent.openai_available:
        logger.warning("OpenAI not available, using mock execution")
        mock_response = weather_agent._mock_execution("What's the weather in New York?")
        logger.info(f"Mock response: {mock_response}")
        return
    
    # Execute agent
    logger.info("Executing weather agent...")
    
    # Create message in thread
    message = weather_agent.client.beta.threads.messages.create(
        thread_id=weather_agent.thread.id,
        role="user",
        content="What's the weather like in San Francisco and New York right now?"
    )
    
    # Run the assistant
    run = weather_agent.client.beta.threads.runs.create(
        thread_id=weather_agent.thread.id,
        assistant_id=weather_agent.assistant.id
    )
    
    # Monitor the run
    while run.status in ["queued", "in_progress"]:
        run = weather_agent.client.beta.threads.runs.retrieve(
            thread_id=weather_agent.thread.id,
            run_id=run.id
        )
        
        # Handle tool calls
        if run.status == "requires_action":
            logger.info("Agent requires tool calls")
            tool_calls = run.required_action.submit_tool_outputs.tool_calls
            
            # Use the tool provider to handle calls
            tool_outputs = weather_agent.tool_provider.handle_tool_calls(tool_calls)
            
            # Submit tool outputs
            run = weather_agent.client.beta.threads.runs.submit_tool_outputs(
                thread_id=weather_agent.thread.id,
                run_id=run.id,
                tool_outputs=tool_outputs
            )
    
    # Get final response
    messages = weather_agent.client.beta.threads.messages.list(
        thread_id=weather_agent.thread.id
    )
    
    if messages.data:
        response = messages.data[0].content[0].text.value
        logger.info(f"Agent response: {response}")
    else:
        logger.warning("No response generated")

if __name__ == "__main__":
    # Register the weather tool (should be done by decorator, but explicit for example)
    registry = ToolRegistry()
    registry.register(get_weather)
    
    # Run demonstration
    demonstrate_weather_agent()