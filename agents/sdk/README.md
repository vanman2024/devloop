# Devloop SDK-First Architecture

This directory contains the SDK-first architecture components for Devloop, building directly on top of the OpenAI Assistants SDK while enhancing it with Devloop's agent coordination capabilities.

## Core Components

- **AdaptivePromptManager**: Manages templates and context for AI interactions
- **ContextManager**: Handles conversation context with knowledge graph integration
- **TemplateManager**: Manages reusable prompt templates
- **Provider Adapters**: Adapters for different LLM providers (OpenAI, Claude, Semantic Kernel)
- **Knowledge Base Adapter**: Connects to the Devloop knowledge graph
- **Activity Logger**: Logs all activities for transparency

## Key Features

- **Template-based prompting**: Define templates once, use them across the system
- **Dynamic context retrieval**: Pull relevant context from knowledge graph
- **Multi-provider support**: Seamlessly switch between OpenAI, Claude, etc.
- **Caching and optimization**: Redis caching for templates and context
- **Activity logging**: Transparent logging of all operations
- **Vector search**: Semantic search capabilities
- **MongoDB persistence**: Long-term storage for templates and context

## QuickStart

```python
from agents.sdk.utils.prompt_manager import AdaptivePromptManager, PromptTemplate, TemplateVariable
from agents.sdk.utils.prompt_manager import OpenAIAdapter

# Initialize manager with config
manager = AdaptivePromptManager(
    config_path="agents/sdk/config/prompt_manager_config.json"
)

# Create OpenAI adapter
openai_adapter = OpenAIAdapter({
    "api_key": "your-openai-key",
    "model": "gpt-4o"
})

# Render a template with variables
prompt_data = openai_adapter.prepare_prompt(
    manager,
    "feature_creation",
    {
        "feature_name": "Authentication System",
        "description": "Implement secure login with OAuth",
        "project_name": "Devloop SDK"
    }
)

# Execute the prompt
response = openai_adapter.execute(prompt_data)

# Register the response
openai_adapter.register_response(manager, response)
```

## CLI Usage

The `prompt_manager.py` script includes a command-line interface for testing:

```bash
# Test with OpenAI
python agents/sdk/utils/prompt_manager.py --provider openai --api-key YOUR_API_KEY --execute

# Test with Claude
python agents/sdk/utils/prompt_manager.py --provider claude --api-key YOUR_API_KEY --execute

# Test context extraction
python agents/sdk/utils/prompt_manager.py --query "authentication system" --kg-path /path/to/memory.json
```

## Integration with Activity Feed

All operations are automatically logged to the activity feed if the activity logging system is available. This provides transparency and an audit trail of AI interactions:

1. Template rendering
2. Context retrieval
3. Knowledge graph queries
4. LLM interactions
5. Cache hits/misses

The activity logs can be viewed in the Devloop UI's Activity Feed.

## Configuration

See `config/prompt_manager_config.json` for a complete configuration example. The config supports:

- Template directory location
- Context token limits
- Knowledge graph path
- Redis, MongoDB, and Vector DB settings
- Provider-specific configurations
- Activity logging settings

## Knowledge Graph Integration

The system integrates with Devloop's knowledge graph to provide relevant context for AI interactions:

```python
# Extract context relevant to authentication
context = manager.extract_relevant_context("authentication system")
```

This will:
1. Query the knowledge graph for relevant nodes
2. Check the vector database for semantic matches
3. Look through conversation history
4. Return the most relevant context

## Working with Templates

Templates are defined using the `PromptTemplate` class:

```python
template = PromptTemplate(
    name="feature_creation",
    template="# Feature Creation: {feature_name}\n\n{description}",
    variables=[
        TemplateVariable("feature_name", required=True),
        TemplateVariable("description", required=True)
    ],
    tags=["feature", "creation"]
)

manager.add_template(template)
```

Templates can be stored in MongoDB and cached in Redis for efficient retrieval.