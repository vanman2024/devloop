# Prompt Manager Activity Logging Integration

This document outlines how the Adaptive Prompt Manager integrates with Devloop's activity logging system to provide transparency about context management, template operations, and AI interactions.

## Activity Logging Overview

The `AdaptivePromptManager` tracks key events and sends them to the activity logging system to create a comprehensive audit trail of all prompt-related operations. This enables:

1. **Transparency**: Clear visibility into context sources and prompt construction
2. **Debugging**: Ability to trace issues in AI responses back to their prompt inputs
3. **Optimization**: Analysis of template usage patterns and context effectiveness
4. **Compliance**: Maintaining records of AI interactions for governance requirements

## Integration Points

The prompt manager integrates with the activity logging system at these key points:

### 1. Context Operations

```python
# Inside ContextManager class
def add_context_item(self, content: str, role: str = "user", 
                   importance: float = 1.0, metadata: Dict[str, Any] = None) -> None:
    """Add an item to the conversation context."""
    item = ContextItem(content, role, importance, metadata)
    
    # If it's a system message, set it as the system prompt
    if role == "system":
        self.system_prompt = item
    else:
        self.context_items.append(item)
    
    # Log this activity to the activity system
    self._log_activity("add_context", {
        "role": role,
        "content_preview": content[:50] + "..." if len(content) > 50 else content,
        "importance": importance,
        "token_count": item.token_count,
        "source": metadata.get("source", "manual") if metadata else "manual"
    })
    
    # Prune context if too large
    self._prune_context()

def _prune_context(self) -> None:
    """Prune context items if total token count exceeds maximum."""
    if not self.context_items:
        return
    
    # Calculate total tokens
    total_tokens = sum(item.token_count for item in self.context_items)
    
    # If under limit, nothing to do
    if total_tokens <= self.max_context_tokens:
        return
    
    # Implementation details...
    
    # Log pruning activity
    self._log_activity("prune_context", {
        "items_removed": len(indices_to_remove),
        "tokens_removed": tokens_removed,
        "remaining_items": len(self.context_items),
        "remaining_tokens": total_tokens - tokens_removed
    })
```

### 2. Knowledge Graph Interactions

```python
def get_context_from_knowledge_graph(self, query: str, node_types: List[str] = None) -> Optional[str]:
    """Get context from the knowledge graph based on a query."""
    if not self.kg:
        logger.warning("Knowledge graph not initialized")
        return None
    
    try:
        # Implementation details...
        
        # Log knowledge graph retrieval
        self._log_activity("knowledge_graph_query", {
            "query": query,
            "node_types": node_types,
            "results_found": len(results),
            "knowledge_graph_file": self.memory_kg_path
        })
        
        # Format and return results
        # ...
    except Exception as e:
        logger.error(f"Error querying knowledge graph: {e}")
        return None
```

### 3. Template Operations

```python
# Inside TemplateManager class
def add_template(self, template: PromptTemplate) -> None:
    """Add a template to the manager."""
    self.templates[template.name] = template
    logger.info(f"Added template: {template.name}")
    
    # Log template addition
    self._log_activity("add_template", {
        "template_name": template.name,
        "description": template.description,
        "variables": [var.name for var in template.variables],
        "tags": template.tags
    })

def render_template(self, name: str, variables: Dict[str, Any]) -> str:
    """Render a template with the given variables."""
    # Implementation details...
    
    # Log template rendering
    self._log_activity("render_template", {
        "template_name": name,
        "variables": list(variables.keys()),
        "output_length": len(rendered)
    })
    
    return rendered
```

### 4. Provider Adapter Operations

```python
# Inside OpenAIAdapter class
def prepare_prompt(self, prompt_manager: AdaptivePromptManager, 
                 template_name: str, variables: Dict[str, Any]) -> Dict[str, Any]:
    """Prepare a prompt for the OpenAI API."""
    # Implementation details...
    
    # Log prompt preparation
    self._log_activity("prepare_openai_prompt", {
        "template_name": template_name,
        "variables": list(variables.keys()),
        "messages_count": len(messages),
        "total_tokens": sum(count_tokens(msg["content"]) for msg in messages)
    })
    
    return {
        "messages": messages,
        "rendered_template": rendered_template
    }

def register_response(self, prompt_manager: AdaptivePromptManager, response: str) -> None:
    """Register a response from the LLM in the context."""
    # Add response to context
    prompt_manager.add_context_item(response, role="assistant")
    
    # Log response registration
    self._log_activity("register_response", {
        "response_preview": response[:50] + "..." if len(response) > 50 else response,
        "token_count": count_tokens(response),
        "provider": "openai"
    })
```

## Activity Logging Implementation

The activity logging is implemented through a helper method that connects to the UI's activity system:

```python
def _log_activity(self, activity_type: str, details: Dict[str, Any]) -> None:
    """Log an activity to the activity system."""
    try:
        # Get the websocket service from the environment
        websocket_service = os.environ.get("WEBSOCKET_ACTIVITY_SERVICE")
        if not websocket_service:
            return  # Silently skip if not configured
        
        # Prepare activity data
        activity_data = {
            "type": "prompt_manager",
            "subtype": activity_type,
            "timestamp": time.time(),
            "details": details,
            "agent_id": os.environ.get("CURRENT_AGENT_ID", "system")
        }
        
        # Send to websocket service (non-blocking)
        requests.post(
            f"{websocket_service}/activity",
            json=activity_data,
            timeout=0.5  # Short timeout to avoid blocking
        )
    except Exception as e:
        # Log but don't fail if activity logging fails
        logger.warning(f"Failed to log activity: {e}")
```

## Activity Feed Integration

The activities logged by the prompt manager will appear in the UI's activity feed with the following characteristics:

1. **Activity Type**: "prompt_manager"
2. **Activity Subtype**: Various (add_context, prune_context, knowledge_graph_query, etc.)
3. **Details**: Context-specific information about the activity
4. **Timestamp**: When the activity occurred
5. **Agent ID**: Which agent performed the activity

## Viewing Prompt Manager Activities

To view prompt manager activities in the UI:

1. Navigate to the Activity Center
2. Use the filter to select "Prompt Manager" activities
3. Browse the activities in the feed
4. Click on any activity to view details

## Sample Activity Feed Output

```json
{
  "id": "act-2025-05-06-123456",
  "type": "prompt_manager",
  "subtype": "knowledge_graph_query",
  "title": "Knowledge Graph Query",
  "description": "Retrieved context from knowledge graph for query 'authentication system'",
  "timestamp": 1715038456123,
  "agent_id": "agent-planning-123",
  "details": {
    "query": "authentication system",
    "node_types": ["feature", "module"],
    "results_found": 3,
    "knowledge_graph_file": "/path/to/memory/knowledge_graph.json"
  },
  "status": "success"
}
```

## Integration Testing

To test the activity logging integration:

1. Set the environment variable `WEBSOCKET_ACTIVITY_SERVICE` to point to your activity service
2. Run the prompt manager with activity logging enabled
3. Verify activities appear in the activity feed
4. Test different activity types and ensure they are properly displayed
5. Check that activity details are correctly formatted and useful

## Future Enhancements

Planned enhancements to the activity logging system:

1. **Correlation IDs**: Link related activities together (e.g., template rendering and LLM calls)
2. **Optimization Metrics**: Track context pruning efficiency and token utilization
3. **Template Analytics**: Monitor which templates are most frequently used and their effectiveness
4. **Real-time Dashboard**: Live view of prompt manager activities across the system
5. **Alert Integration**: Configure alerts for specific prompt manager events