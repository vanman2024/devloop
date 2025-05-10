# Knowledge Base Integration with Orchestration Service

This document explains how the Knowledge Base API is integrated with the Orchestration Service to provide agents with contextually relevant information during task execution.

## Overview

The integration allows agents to access relevant knowledge from the knowledge base, ensuring that they can make informed decisions based on existing documentation, architecture, and best practices. This is crucial for maintaining consistency across the system and preventing development from "going off track".

## Architecture

The integration follows these key principles:

1. **Minimal Dependency**: The integration is designed to be optional, allowing the orchestration service to function even when the knowledge API is unavailable.

2. **Context Enhancement**: Rather than changing the core task execution flow, we enhance the task context with relevant knowledge before execution.

3. **Intelligent Matching**: The system automatically identifies relevant documents based on task description, agent type, and inferred categories.

4. **Caching**: The knowledge API includes built-in caching to minimize redundant processing and API calls.

## How It Works

### Task Execution Flow

1. When a task is submitted for execution, the orchestration service checks if the knowledge API is available.
2. If available, the service calls `enhance_task_context()` to find relevant knowledge.
3. The method analyzes the task description to identify keywords and categories.
4. It searches the knowledge base for relevant documents based on these keywords and categories.
5. Relevant document summaries and snippets are added to the task's input data as `knowledge_context`.
6. The task is then executed with the enhanced context.

### Code Explanation

The integration is implemented through the `enhance_task_context()` method in the `OrchestrationService` class:

```python
def enhance_task_context(self, task: Task) -> Task:
    """Enhance task context with relevant knowledge"""
    
    # Skip if knowledge API is not available
    if not KNOWLEDGE_API_AVAILABLE:
        return task
        
    try:
        # Extract relevant keywords and determine tags
        description_lower = task.description.lower()
        tags = []
        
        # Identify task domain based on description
        if "feature" in description_lower:
            tags.append("feature_creation")
        if "architecture" in description_lower or "design" in description_lower:
            tags.append("architecture")
        # ... additional domain inference ...
        
        # Search for relevant documents
        context_docs = []
        search_result = knowledge_api.search_documents(
            query=task.description, 
            tags=tags if tags else None,
            limit=3
        )
        
        # Process search results and add to task input data
        if "error" not in search_result and search_result.get("count", 0) > 0:
            # ... process and add document context ...
            
            task.input_data["knowledge_context"] = context_docs
            
    except Exception as e:
        logger.error(f"Error enhancing task context: {e}")
        
    return task
```

The `execute_task()` and `execute_task_async()` methods have been updated to include a call to `enhance_task_context()` before task execution.

## Benefits

1. **Consistency**: Agents have access to the same knowledge base, ensuring consistent understanding of architecture and implementation.

2. **Context Awareness**: Agents can make decisions informed by existing documentation and knowledge.

3. **Learning from History**: The system can leverage past solutions and approaches documented in the knowledge base.

4. **Reduced Redundancy**: Prevents agents from solving problems that have already been solved.

5. **Alignment with Architecture**: Ensures solutions remain aligned with the established architecture and design principles.

## Configuration

The integration uses these environment variables (with defaults):

- `KNOWLEDGE_BASE_DIR`: Base directory for knowledge base (/mnt/c/Users/angel/devloop/knowledge_base)
- `KNOWLEDGE_CACHE_DIR`: Directory for caching results (KNOWLEDGE_BASE_DIR/cache)

## Usage Example

Here's how a task execution with knowledge enhancement works:

1. Create a task for feature implementation:

```python
task = orchestration_service.create_task(
    description="Implement dark mode theme switching in the UI with Redux integration",
    agent_id="ui_feature_agent",
    input_data={"priority": "high"}
)
```

2. Execute the task, which will automatically enhance it with knowledge context:

```python
result = orchestration_service.execute_task(task.task_id)
```

3. Under the hood, the task will be enhanced with relevant knowledge:

```python
# Sample enhanced task.input_data
{
    "priority": "high",
    "knowledge_context": [
        {
            "title": "UI Theming Architecture",
            "doc_id": "doc-a1b2c3d4e5f6",
            "snippet": "...Theme switching should use the ThemeProvider context...",
            "summary": "This document describes the theme architecture for the UI system..."
        },
        {
            "title": "Redux State Management Guide",
            "doc_id": "doc-f6e5d4c3b2a1",
            "snippet": "...For UI state like theme preference, use the ui.settings slice...",
            "summary": "The Redux state management guide outlines best practices..."
        }
    ]
}
```

4. The agent can then use this context in its response generation.

## Future Enhancements

1. **Relevance Scoring**: Implement more sophisticated relevance scoring for document matching.

2. **Interactive Querying**: Allow agents to actively query the knowledge base during task execution.

3. **Feedback Loop**: Implement a mechanism for agents to provide feedback on the relevance of provided knowledge.

4. **Knowledge Gap Detection**: Identify when knowledge is missing and suggest documentation that should be created.

5. **Provider-Specific Optimization**: Tailor knowledge delivery based on the capabilities of different AI providers.