# Devloop SDK-First Architecture Quickstart

This quickstart guide will help you get up and running with our new SDK-first architecture that builds directly on the OpenAI Assistants SDK. This architecture leverages the power of the OpenAI API while enhancing it with our own tool system and coordination capabilities.

## Architecture Status

⚠️ **IMPORTANT UPDATE**: We've transitioned from using the experimental `openai-agents` SDK to building directly on the core OpenAI API with Assistants support. This approach provides more stability and flexibility.

## Installed Dependencies

The following packages are installed in our environment:
- `openai==1.77.0` - The main OpenAI API client for Assistants API access
- `langchain==0.3.25` - For advanced agent capabilities (optional)
- `python-dotenv==1.1.0` - For environment variable management
- Other supporting packages (see `requirements.txt`)

## Basic Usage

Here's a simple example using our SDK-first architecture:

```python
import os
from dotenv import load_dotenv
from agents.sdk.core.agent import SDKAgent
from agents.tools.registry import tool, param_description, ToolRegistry
from agents.tools.core import SDKToolProvider, ToolPermissionManager

# Load environment variables
load_dotenv()

# Define a tool using our decorator
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
def get_weather(location: str, units: str = "celsius") -> dict:
    """Get weather information for a location"""
    # In a real implementation, this would call a weather API
    return {
        "location": location,
        "temperature": 22.5 if units == "celsius" else 72.5,
        "condition": "Sunny"
    }

# Set up permissions
permission_manager = ToolPermissionManager()
permission_manager.set_agent_permissions("weather-agent", ["api_access"])

# Create tool provider for the agent
tool_provider = permission_manager.create_tool_provider("weather-agent")

# Get OpenAI-compatible tool configs
tools_config = tool_provider.get_tools_config(categories=["weather"])

# Create the agent
agent = SDKAgent({
    "agent_id": "weather-agent",
    "agent_name": "Weather Assistant",
    "instructions": "You are a helpful weather assistant.",
    "model": "gpt-4o",
    "tools": tools_config,
    "api_key": os.getenv("OPENAI_API_KEY")
})

# Store tool provider with agent for handling tool calls
agent.tool_provider = tool_provider

# Execute the agent
response = agent.execute("What's the weather like in New York?")
print(f"Response: {response}")
```

## Using Tools

Our architecture includes a robust tool system:

### Creating Tools

Tools can be created using decorators:

```python
@tool(
    name="calculate_mortgage",
    description="Calculate monthly mortgage payment",
    categories=["finance"],
    permissions=["calculations"]
)
@param_description({
    "principal": "Loan amount in dollars",
    "rate": "Annual interest rate as a percentage",
    "years": "Loan term in years"
})
def calculate_mortgage(principal: float, rate: float, years: int) -> dict:
    """Calculate monthly mortgage payment"""
    monthly_rate = rate / 100 / 12
    payments = years * 12
    payment = principal * (monthly_rate * (1 + monthly_rate)**payments) / ((1 + monthly_rate)**payments - 1)
    
    return {
        "monthly_payment": round(payment, 2),
        "total_payments": round(payment * payments, 2),
        "total_interest": round(payment * payments - principal, 2)
    }
```

### Using Base Tool Classes

For more complex tools, use the base classes:

```python
from agents.tools.core import FileTool

class FileSearchTool(FileTool):
    """Tool for searching file contents"""
    
    def __init__(self):
        super().__init__(name="search_files", description="Search for text in files")
        
    def execute(self, directory: str, pattern: str) -> dict:
        """Search for text in files"""
        if not self.validate_path(directory):
            return {"error": f"Invalid directory: {directory}"}
            
        # Implementation...
        return {"matches": ["file1.txt:10", "file2.txt:25"]}
```

## Agent Patterns

Our architecture supports multiple agent patterns:

### Single Agent Pattern

```python
# Create a basic agent with tools
agent = SDKAgent({
    "agent_id": "helper-agent",
    "agent_name": "Helper Assistant",
    "instructions": "You are a helpful assistant.",
    "model": "gpt-4o",
    "tools": tools_config
})
```

### Hierarchical Pattern

```python
# Create parent agent
parent_agent = SDKAgent({
    "agent_id": "parent-agent",
    "agent_name": "Coordinator",
    "instructions": "You coordinate other agents.",
    "tools": coordination_tools
})

# Create child agents
child_agent1 = SDKAgent({...})
child_agent2 = SDKAgent({...})

# Register child agents with parent
parent_agent.register_child(child_agent1)
parent_agent.register_child(child_agent2)
```

## Next Steps

1. **Explore the Architecture**: See the [SDK Architecture Guide](sdk_architecture_guide.md) for details.
2. **Review Example Implementation**: Check the [SDK Agent Example](reference_implementations/sdk_agent_example.py).
3. **See the Migration Plan**: Review our [Migration Plan](MIGRATION_PLAN.md) for the transition roadmap.
4. **Try the Tool System**: Explore our tools system to build powerful agent capabilities.

For more detailed guidance, review our architecture documentation in `/agents/docs/architecture/`.