# API Documentation for Enhanced Feature Creation Agent

This document provides detailed API documentation for the Enhanced Feature Creation Agent.

## Core API

### EnhancedFeatureCreationAgent Class

Main class that implements the Enhanced Feature Creation Agent.

```python
from agents.planning.feature_creation.enhanced_core import EnhancedFeatureCreationAgent

# Create agent instance
agent = EnhancedFeatureCreationAgent(
    use_rag=True,         # Whether to use RAG engine
    use_langchain=True,   # Whether to use LangChain
    use_cache=True        # Whether to use Redis caching
)
```

#### Methods

##### `process_feature_request`

Main entry point for processing feature requests.

```python
result = agent.process_feature_request({
    'name': 'Task Management Dashboard',
    'description': 'A dashboard for managing tasks with filtering and sorting',
    'projectId': 'devloop-main',
    'milestone': 'milestone-ui-dashboard',  # Optional
    'phase': 'phase-04',                    # Optional
    'module': 'feature-improvements',       # Optional
    'tags': ['ui', 'dashboard'],            # Optional
    'confirmed': False                      # Whether to update knowledge base
})
```

**Parameters:**
- `name` (str): Name of the feature
- `description` (str): Description of the feature
- `projectId` (str, optional): Project ID
- `milestone` (str, optional): User-provided milestone
- `phase` (str, optional): User-provided phase
- `module` (str, optional): User-provided module
- `tags` (List[str], optional): User-provided tags
- `confirmed` (bool, optional): Whether to update knowledge base with the feature

**Returns:**
```json
{
  "success": true,
  "feature": {
    "id": "feature-ui-dashboard-1234",
    "name": "Task Management Dashboard",
    "description": "A dashboard for managing tasks with filtering and sorting",
    "suggestedMilestone": "milestone-ui-dashboard",
    "suggestedPhase": "phase-04",
    "suggestedModule": "feature-improvements",
    "suggestedTags": ["ui", "dashboard", "tasks", "filtering", "sorting"],
    "potentialDependencies": [
      {"id": "feature-2101", "name": "Dynamic UI Components", "type": "feature"}
    ],
    "analysisDetails": {
      "concepts": ["dashboard", "task", "management", "filtering", "sorting"],
      "domain": "ui",
      "purpose": "enhancement",
      "confidence": 0.85
    }
  }
}
```

##### `execute_operation`

Execute a specific operation.

```python
result = agent.execute_operation('operation_name', {
    'param1': 'value1',
    'param2': 'value2'
})
```

**Parameters:**
- `operation`: Name of the operation to execute
- `params`: Parameters for the operation

**Returns:**
Operation-specific result

##### `spawn`

Initialize the agent with context.

```python
result = agent.spawn({
    'project_id': 'devloop-main',
    'user_id': 'user-123'
})
```

**Parameters:**
- `context`: Dictionary containing initialization context

**Returns:**
```json
{
  "success": true,
  "message": "Enhanced Feature Creation Agent spawned successfully",
  "status": {
    "agent_id": "agent-feature-creation",
    "name": "Enhanced Feature Creation Agent",
    "status": "active",
    "spawned_at": "2025-05-07T12:34:56.789Z",
    "context": {"project_id": "devloop-main", "user_id": "user-123"},
    "version": "2.0.0",
    "capabilities": {
      "rag": true,
      "langchain": true,
      "cache": true
    }
  }
}
```

##### `retire`

Retire the agent.

```python
result = agent.retire('User requested shutdown')
```

**Parameters:**
- `reason`: Reason for retirement

**Returns:**
```json
{
  "success": true,
  "message": "Enhanced Feature Creation Agent retired successfully",
  "reason": "User requested shutdown"
}
```

##### `status`

Get the current status of the agent.

```python
result = agent.status()
```

**Returns:**
```json
{
  "success": true,
  "status": {
    "agent_id": "agent-feature-creation",
    "name": "Enhanced Feature Creation Agent",
    "status": "active",
    "updated_at": "2025-05-07T12:34:56.789Z",
    "version": "2.0.0",
    "capabilities": {
      "rag": true,
      "langchain": true,
      "cache": true
    }
  }
}
```

## Operations API

The following operations are available through the `execute_operation` method.

### `process_feature`

Process a feature request (same as `process_feature_request`).

```python
result = agent.execute_operation('process_feature', {
    'name': 'Task Management Dashboard',
    'description': 'A dashboard for managing tasks with filtering and sorting',
    'projectId': 'devloop-main'
})
```

### `analyze_feature`

Analyze a feature description.

```python
result = agent.execute_operation('analyze_feature', {
    'name': 'Task Management Dashboard',
    'description': 'A dashboard for managing tasks with filtering and sorting'
})
```

**Returns:**
```json
{
  "success": true,
  "result": {
    "concepts": ["dashboard", "task", "management", "filtering", "sorting"],
    "domain": "ui",
    "purpose": "enhancement"
  }
}
```

### `suggest_placement`

Suggest placement for a feature.

```python
result = agent.execute_operation('suggest_placement', {
    'name': 'Task Management Dashboard',
    'description': 'A dashboard for managing tasks with filtering and sorting',
    'analysis': {
      "concepts": ["dashboard", "task", "management", "filtering", "sorting"],
      "domain": "ui",
      "purpose": "enhancement"
    }
})
```

**Returns:**
```json
{
  "success": true,
  "result": {
    "milestone": "milestone-ui-dashboard",
    "phase": "phase-04",
    "module": "feature-improvements",
    "confidence": 0.85
  }
}
```

### `generate_id`

Generate a feature ID.

```python
result = agent.execute_operation('generate_id', {
    'name': 'Task Management Dashboard',
    'milestone': 'milestone-ui-dashboard',
    'project_id': 'devloop-main'
})
```

**Returns:**
```json
{
  "success": true,
  "result": "feature-ui-dashboard-1234"
}
```

### `query_knowledge`

Query the knowledge graph for concepts.

```python
result = agent.execute_operation('query_knowledge', {
    'concepts': ["dashboard", "task", "management"],
    'domain': "ui",
    'purpose': "enhancement"
})
```

**Returns:**
```json
{
  "success": true,
  "result": {
    "suggested_milestone": "milestone-ui-dashboard",
    "suggested_phase": "phase-04",
    "suggested_module": "feature-improvements",
    "suggested_tags": ["dashboard", "task", "management", "ui", "interface", "ux", "frontend"],
    "potential_dependencies": [
      {"id": "feature-2101", "name": "Dynamic UI Components", "type": "feature"}
    ]
  }
}
```

### `query_structure`

Get the project structure.

```python
result = agent.execute_operation('query_structure', {
    'project_id': 'devloop-main'
})
```

**Returns:**
```json
{
  "success": true,
  "result": {
    "milestones": [
      {
        "id": "milestone-ui-dashboard",
        "name": "UI Dashboard",
        "phases": [
          {
            "id": "phase-04",
            "name": "Phase 4",
            "modules": [
              {
                "id": "feature-improvements",
                "name": "Feature Improvements"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### `vector_search`

Search for similar features.

```python
result = agent.execute_operation('vector_search', {
    'query': 'dashboard for visualizing task progress',
    'top_k': 5
})
```

**Returns:**
```json
{
  "success": true,
  "result": [
    {
      "id": "feature-1234",
      "name": "Task Management Dashboard",
      "similarity": 0.92
    },
    {
      "id": "feature-2345",
      "name": "Project Progress Visualization",
      "similarity": 0.85
    }
  ]
}
```

### `update_knowledge_base`

Update the knowledge base with a feature.

```python
result = agent.execute_operation('update_knowledge_base', {
    'id': 'feature-1234',
    'data': {
      'name': 'Task Management Dashboard',
      'description': 'A dashboard for managing tasks with filtering and sorting',
      'milestone': 'milestone-ui-dashboard',
      'phase': 'phase-04',
      'module': 'feature-improvements',
      'tags': ['ui', 'dashboard', 'tasks'],
      'domain': 'ui',
      'purpose': 'enhancement'
    }
})
```

**Returns:**
```json
{
  "success": true,
  "vector_store": true,
  "knowledge_graph": true,
  "mongo_db": true,
  "rag_engine": true
}
```

### `get_related_features`

Find features related to a specific feature.

```python
result = agent.execute_operation('get_related_features', {
    'id': 'feature-1234',
    'relation_types': ['dependencies', 'same_domain', 'shared_concepts'],
    'max_depth': 2,
    'limit': 10
})
```

**Returns:**
```json
{
  "dependencies": [
    {
      "id": "feature-2101",
      "name": "Dynamic UI Components",
      "type": "feature",
      "relationship": "depends_on",
      "strength": "required"
    }
  ],
  "dependents": [
    {
      "id": "feature-3456",
      "name": "Team Dashboard",
      "type": "feature",
      "relationship": "depends_on",
      "strength": "optional"
    }
  ],
  "same_domain": [
    {
      "id": "feature-4567",
      "name": "User Profile UI",
      "description": "User profile interface",
      "domain": "ui",
      "purpose": "enhancement",
      "tags": ["ui", "profile", "user"],
      "status": "not-started",
      "milestone": "milestone-ui-dashboard",
      "phase": "phase-04",
      "module": "feature-improvements"
    }
  ],
  "same_purpose": [],
  "same_module": [],
  "shared_concepts": []
}
```

### `query_features`

Query for features based on criteria.

```python
result = agent.execute_operation('query_features', {
    'domain': 'ui',
    'purpose': 'enhancement',
    'tags': ['dashboard'],
    'milestone': 'milestone-ui-dashboard',
    'limit': 10
})
```

**Returns:**
```json
{
  "success": true,
  "result": [
    {
      "id": "feature-1234",
      "name": "Task Management Dashboard",
      "description": "A dashboard for managing tasks with filtering and sorting",
      "domain": "ui",
      "purpose": "enhancement",
      "tags": ["ui", "dashboard", "tasks"],
      "status": "not-started",
      "milestone": "milestone-ui-dashboard",
      "phase": "phase-04",
      "module": "feature-improvements"
    }
  ]
}
```

## Command-line Interface

The agent can be used from the command line:

```bash
# Spawn the agent
python enhanced_core.py --spawn

# Process a feature request
python enhanced_core.py --operation process_feature --params params.json

# Get agent status
python enhanced_core.py --status

# Retire the agent
python enhanced_core.py --retire --reason "User requested shutdown"
```

Command-line options:

- `--spawn`: Spawn the agent
- `--retire`: Retire the agent
- `--status`: Get agent status
- `--operation`: Operation to execute
- `--context`: Path to context file (JSON)
- `--params`: Path to params file (JSON)
- `--reason`: Reason for retirement
- `--use-rag`: Use RAG engine (default: true)
- `--use-langchain`: Use LangChain (default: true)
- `--use-cache`: Use Redis caching (default: true)
- `--no-rag`: Disable RAG engine
- `--no-langchain`: Disable LangChain
- `--no-cache`: Disable Redis caching

## Error Handling

All API methods return a dictionary with a `success` field indicating whether the operation was successful. If an operation fails, an `error` field will be included with details about the error.

Example error response:

```json
{
  "success": false,
  "error": "Missing feature_id or feature_data"
}
```

## Environment Variables

The agent uses the following environment variables:

- `OPENAI_API_KEY`: OpenAI API key
- `RAG_OPENAI_API_KEY`: OpenAI API key specifically for RAG (falls back to OPENAI_API_KEY)
- `OPENAI_MODEL`: OpenAI model to use (default: gpt-4o)
- `REDIS_URL`: Redis connection URL
- `MONGODB_URI`: MongoDB connection URI
- `KNOWLEDGE_GRAPH_PATH`: Path to knowledge graph file