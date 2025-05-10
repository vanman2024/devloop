# SDK-First Agent Architecture Guide

This guide covers Devloop's new SDK-first agent architecture, which builds directly on the OpenAI Assistants SDK while enhancing it with Devloop's agent coordination capabilities.

## Architecture Overview

Our new agent architecture follows a hexagonal (ports & adapters) design pattern with the OpenAI Assistants SDK as its foundation. This approach provides several key benefits:

1. **Direct SDK Integration**: Building directly on OpenAI's SDK ensures we leverage the full capabilities of their evolving platform
2. **Maintainability**: Clear separation of concerns makes the system easier to understand and maintain
3. **Extensibility**: New capabilities can be added without modifying core functionality
4. **Reusability**: Core components can be reused across different agent implementations

### Directory Structure

```
/agents
  /sdk              # OpenAI Assistants SDK foundation
    /core           # Core SDK implementation
      agent.py      # Base SDK agent implementation
  /tools            # Tools for function calling
    /core           # Core tool implementations
    /registry       # Tool registration and discovery
    /agent_specific # Agent-specific tool implementations
    /extensions     # MCP and extension tools
  /langchain        # LangChain integration
  /rag              # RAG implementation
  /patterns         # Pattern implementations
  /devloop          # Devloop integration
  /implementations  # SDK-based agent implementations
  /docs             # Architecture documentation
    /architecture   # Core architecture documentation
  /utils            # Utility functions and services
    /ai_service     # AI service functionality
```

## SDK Core Implementation

The SDK core implementation builds directly on the OpenAI Assistants API:

```python
class SDKAgent:
    """Base OpenAI SDK Agent Implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize the SDK agent"""
        # Initialize OpenAI client
        self.client = openai.OpenAI(api_key=config.get("api_key"))
        
        # Create assistant with configured tools
        self.assistant = self.client.beta.assistants.create(
            name=config.get("agent_name"),
            instructions=config.get("instructions"),
            tools=config.get("tools", []),
            model=config.get("model", "gpt-4o")
        )
        
        # Create thread for this agent
        self.thread = self.client.beta.threads.create()
    
    def execute(self, prompt: str) -> str:
        """Execute the agent with a prompt"""
        # Create message
        message = self.client.beta.threads.messages.create(
            thread_id=self.thread.id,
            role="user",
            content=prompt
        )
        
        # Run the assistant
        run = self.client.beta.threads.runs.create(
            thread_id=self.thread.id,
            assistant_id=self.assistant.id
        )
        
        # Monitor and handle tool calls
        # ...
        
        # Return response
        # ...
```

## Tool System

Our tool system leverages OpenAI's function calling capabilities through a centralized registry:

### Tool Registry

The `ToolRegistry` provides a central registry for all tools in the system:

```python
class ToolRegistry:
    """Central registry for all tools in the system"""
    
    def register(self, tool: Union[ToolFunc, ToolMetadata]) -> Optional[str]:
        """Register a tool with the registry"""
        # Implementation...
    
    def get_openai_tools(self, categories: List[str] = None) -> List[Dict[str, Any]]:
        """Get tools in OpenAI format for function calling"""
        # Implementation...
    
    def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a registered tool"""
        # Implementation...
```

### Tool Decorators

Tools can be created using simple decorators:

```python
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
    # Implementation...
```

### Integration with SDK Agent

The tool system integrates with the SDK agent through the `SDKToolProvider`:

```python
# Create permission manager
permission_manager = ToolPermissionManager()
permission_manager.set_agent_permissions("agent-123", ["system_info", "api_access"])

# Create tool provider
tool_provider = permission_manager.create_tool_provider("agent-123")

# Get tools configuration
tools_config = tool_provider.get_tools_config(categories=["weather", "utility"])

# Create agent with tools
agent = SDKAgent({
    "agent_id": "agent-123",
    "agent_name": "Weather Agent",
    "instructions": "You are a weather information agent.",
    "tools": tools_config
})

# Store tool provider with agent for handling tool calls
agent.tool_provider = tool_provider
```

## Agent Hierarchy

We preserve Devloop's hierarchical agent model while building on the SDK:

```
┌─────────────────────────────────────────────────────┐
│               PARENT AGENT                          │
│  ┌──────────────────────────────────────────────┐   │
│  │  Agent Lifecycle                             │   │
│  │  - Spawn/Initialize                          │   │
│  │  - Monitor                                   │   │
│  │  - Coordinate                                │   │
│  │  - Retire                                    │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │
     ┌─────────────────┼─────────────────┐
     │                 │                 │
┌────▼────┐      ┌─────▼─────┐      ┌────▼────┐
│ CHILD 1 │      │  CHILD 2  │      │ CHILD 3 │
└────┬────┘      └─────┬─────┘      └────┬────┘
     │                 │                 │
┌────▼────┐      ┌─────▼─────┐      ┌────▼────┐
│ MICRO 1 │      │  MICRO 2  │      │ MICRO 3 │
└─────────┘      └───────────┘      └─────────┘
```

## Knowledge System

Our knowledge system provides tools for storing and retrieving knowledge:

```python
# Store a memory
memory_writer = MemoryWriter()
memory_result = memory_writer.execute(
    content="The system requires Python 3.8 or later for SDK support.",
    category="facts",
    importance=0.8,
    tags=["requirements", "python", "sdk"]
)

# Retrieve memories
memory_reader = MemoryReader()
retrieval_result = memory_reader.execute(
    category="facts",
    query="python"
)
```

## Getting Started

To get started with the SDK-first architecture:

1. **Review Documentation**: Read the architecture documentation in `/agents/docs/architecture/`
2. **Explore SDK Implementation**: Study the base implementation in `/agents/sdk/core/agent.py`
3. **Learn the Tool System**: Explore the tool system in `/agents/tools/`
4. **Try Example**: Run the initialization script in `/agents/tools/init_tool_system.py`

## Additional Resources

- [Consolidated Architecture](/agents/docs/architecture/CONSOLIDATED_ARCHITECTURE.md)
- [Migration Plan](/agents/docs/architecture/MIGRATION_PLAN.md)
- [Knowledge Graph Design](/agents/docs/architecture/KNOWLEDGE_GRAPH_DESIGN.md)
- [Tool System README](/agents/tools/README.md)