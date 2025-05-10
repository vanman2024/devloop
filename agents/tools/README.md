# Devloop Tool System

The tool system leverages OpenAI's function calling capabilities to provide tools for agent use. The architecture follows our hexagonal design pattern, with a clear separation between the registry, core functionality, and implementations.

## Directory Structure

```
/tools
  /core             # Core tool abstractions and base classes
    base_tool.py    # Base tool classes and interfaces
    sdk_integration.py # Integration with OpenAI SDK
    system_tools.py # System-level tool implementations
    knowledge_tools.py # Knowledge graph/memory tools
  /registry         # Tool registry for registering and discovering tools
    tool_registry.py # Main registry implementation
  /agent_specific   # Tools specific to certain agent types
    system_health_tools.py # Tools for health monitoring agents
  /extensions       # Extension tools for MCPs and other integrations
  __init__.py       # Package initialization and exports
  init_tool_system.py # Tool system initialization demo
```

## Key Components

### Tool Registry

The `ToolRegistry` class provides a central registry for all tools in the system. It enables:

- Registering tools with metadata
- Discovering tools by name, category, permission
- Converting tools to OpenAI function call format
- Executing tools with arguments

### Base Tool Classes

The `BaseTool` class provides a common interface for all tools. Specialized subclasses include:

- `FileTool`: For file system operations
- `SystemTool`: For system operations
- `APITool`: For API interactions
- `DatabaseTool`: For database interactions

### Tool Categories

Tools are organized into categories for easier discovery:

- `system`: System-level operations
- `file`: File operations
- `knowledge`: Knowledge graph interactions
- `memory`: Memory storage/retrieval
- `health`: System health monitoring
- `maintenance`: Maintenance operations

### Permission System

Tools can require specific permissions, which are granted to agents through the `ToolPermissionManager`. This ensures that agents only have access to tools they are authorized to use.

## Using Tools

### Creating a Tool

Tools can be created in two ways:

1. Class-based for complex tools:

```python
class MyTool(BaseTool):
    def __init__(self):
        super().__init__(name="my_tool", description="My custom tool")
        
    def execute(self, param1: str, param2: int = 10) -> Dict[str, Any]:
        # Tool implementation
        return {"result": f"Processed {param1} with {param2}"}
        
# Register the tool
my_tool = MyTool()
my_tool.register(
    categories=["custom"],
    permissions=["custom_permission"]
)
```

2. Function-based with decorators:

```python
@tool(
    name="my_function_tool",
    description="A function-based tool",
    categories=["custom"],
    permissions=["custom_permission"]
)
@param_description({
    "param1": "First parameter description",
    "param2": "Second parameter description"
})
def my_function_tool(param1: str, param2: int = 10) -> Dict[str, Any]:
    # Tool implementation
    return {"result": f"Processed {param1} with {param2}"}
```

### Integrating with SDK Agent

Tools can be integrated with the SDK agent by creating a `SDKToolProvider` and configuring the agent with the tool definitions:

```python
# Initialize tool system
register_all_tools()

# Get tool provider
permission_manager = ToolPermissionManager()
tool_provider = permission_manager.create_tool_provider("my-agent-id")

# Get tool configurations
tools_config = tool_provider.get_tools_config(categories=["system", "memory"])

# Create agent with tools
agent = SDKAgent({
    "agent_id": "my-agent-id",
    "agent_name": "My Agent",
    "instructions": "You are an agent with tools.",
    "model": "gpt-4o",
    "tools": tools_config
})

# Store tool provider with agent for handling tool calls
agent.tool_provider = tool_provider
```

### Handling Tool Calls

When the agent requests a tool call, the tool provider handles the execution:

```python
# Extract tool calls from run
tool_calls = run.required_action.submit_tool_outputs.tool_calls

# Handle tool calls
tool_outputs = agent.tool_provider.handle_tool_calls(tool_calls)

# Submit tool outputs back to OpenAI
run = agent.client.beta.threads.runs.submit_tool_outputs(
    thread_id=agent.thread.id,
    run_id=run.id,
    tool_outputs=tool_outputs
)
```

## Available Tools

### System Tools

- `get_system_info`: Get information about the system environment
- `list_directory`: List contents of a directory
- `get_process_info`: Get information about running processes
- `get_timestamp`: Get the current timestamp in different formats
- `check_connectivity`: Check connectivity to specified hosts

### Knowledge Tools

- `store_memory`: Store a memory entry in the knowledge graph
- `retrieve_memories`: Retrieve memories from the knowledge graph
- `manage_knowledge`: Create and manage knowledge relationships
- `record_observation`: Record an observation in the memory system
- `search_knowledge`: Search for knowledge across categories

### System Health Tools

- `analyze_logs`: Analyze system logs for health issues
- `check_system_health`: Check and report on system health
- `resolve_health_issue`: Attempt to resolve a system health issue

## Getting Started

Run the initialization script to see the tool system in action:

```bash
python -m agents.tools.init_tool_system
```

This will initialize the tool system, create example agents with different tool access, and demonstrate tool usage.

## Adding New Tools

To add a new tool:

1. Create a new tool class or function in an appropriate file
2. Register the tool with the registry
3. Add the registration function to `register_all_tools()` in `__init__.py`

## Security Considerations

- Tools should validate their inputs thoroughly
- Use the permission system to restrict access to sensitive tools
- Implement safeguards in tools that modify system state
- Log all tool executions for audit purposes