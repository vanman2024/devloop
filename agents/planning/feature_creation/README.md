# Enhanced Feature Creation Agent

This is an enhanced version of the Feature Creation Agent that integrates with LangChain, Vector Storage, Knowledge Graph, and Redis Caching for improved feature analysis and placement suggestions.

## Overview

The Enhanced Feature Creation Agent analyzes feature descriptions and suggests optimal placement within the project structure by leveraging advanced NLP techniques, semantic search, and knowledge graph traversal.

## Features

- **LLM Integration**: Uses OpenAI's GPT-4o model for advanced natural language understanding and generation
- **Vector Storage**: Stores feature embeddings for semantic similarity search
- **Knowledge Graph**: Traverses relationships between components to find optimal placement
- **RAG Engine**: Combines retrieval and generation for context-aware feature analysis
- **Redis Caching**: Improves performance by caching expensive operations
- **MongoDB Storage**: Persistently stores feature data for future reference
- **Multiple Fallback Mechanisms**: Gracefully degrades functionality when components are unavailable

## Architecture

The agent is built with several modular components:

- `enhanced_core.py`: Main agent implementation with orchestration logic
- `llm_connector.py`: Connector for OpenAI GPT-4o
- `vector_store.py`: Vector storage for feature embeddings
- `knowledge_graph_connector.py`: Connector for knowledge graph operations
- `mongo_connector.py`: Connector for MongoDB storage
- `redis_cache.py`: Redis-based caching system
- `rag_engine.py`: RAG (Retrieval-Augmented Generation) system
- `langchain_integration.py`: LangChain-based components

## Knowledge Graph Integration

The knowledge graph is a central component for organizing features in a semantic structure:

### Node Types

- `feature`: Individual features
- `milestone`: High-level project milestones
- `phase`: Development phases within milestones
- `module`: Functional modules within phases
- `concept`: Tag-based concept nodes
- `domain`: Feature domains (UI, testing, data, agent, etc.)
- `purpose`: Feature purposes (bugfix, enhancement, new_feature, etc.)

### Edge Types

- `milestone_contains_phase`: Connects milestones to phases
- `phase_contains_module`: Connects phases to modules
- `module_contains_feature`: Connects modules to features
- `feature_depends_on`: Dependency relationship between features
- `feature_related_to_concept`: Tags/concept connections
- `feature_belongs_to_domain`: Domain categorization
- `feature_has_purpose`: Purpose categorization

### Integration Process

When a feature is added to the knowledge graph:

1. The system checks for and creates missing hierarchy components
2. The feature node is created with properties and metadata
3. Connections are made to its module, phase, and milestone
4. Dependencies are added with relationship attributes
5. Tags are converted to concept nodes and linked to the feature
6. Domain and purpose nodes are created/linked if needed

### Query Capabilities

The knowledge graph enables rich query capabilities:

- Find features by domain, purpose, or tags
- Get features in specific milestone/phase/module
- Find semantically related features
- Discover dependencies and dependent features
- Find features sharing concepts or tags

## API Operations

The agent supports various operations through its API:

- `process_feature`: Main entry point for processing feature requests
- `analyze_feature`: Extract concepts, domain, and purpose from description
- `suggest_placement`: Suggest optimal placement for a feature
- `generate_id`: Generate a unique ID for a feature
- `query_knowledge`: Query the knowledge graph for related concepts
- `query_structure`: Get the project structure
- `vector_search`: Perform semantic search of features
- `update_knowledge_base`: Update the knowledge base with a feature
- `get_related_features`: Find features related to a specific feature
- `query_features`: Query for features based on criteria

## Usage

### Basic Usage

```python
from enhanced_core import EnhancedFeatureCreationAgent

# Create agent instance
agent = EnhancedFeatureCreationAgent()

# Process a feature request
result = agent.process_feature_request({
    'name': 'Task Management Dashboard',
    'description': 'A dashboard for managing tasks with filtering and sorting'
})

# Get suggested placement
feature = result['feature']
print(f"Suggested placement: {feature['suggestedMilestone']}/{feature['suggestedPhase']}/{feature['suggestedModule']}")

# Get related features
related = agent.execute_operation('get_related_features', {'id': feature['id']})
print(f"Similar features: {related['same_domain']}")
```

### Command-line Usage

```bash
# Spawn the agent
python enhanced_core.py --spawn

# Process a feature request
python enhanced_core.py --operation process_feature --params params.json

# Query for related features
python enhanced_core.py --operation get_related_features --params '{"id": "feature-1234"}'

# Get agent status
python enhanced_core.py --status
```

Example `params.json` for feature creation:

```json
{
  "name": "Knowledge Graph Visualization",
  "description": "Create a visualization component for the knowledge graph that displays nodes and relationships in an interactive manner. Allow users to explore the graph, filter by node types, and search for specific nodes.",
  "tags": ["ui", "visualization", "knowledge-graph", "interactive"],
  "projectId": "devloop-main"
}
```

## Configuration

The agent can be configured using environment variables or a config file:

- `OPENAI_API_KEY`: OpenAI API key
- `OPENAI_MODEL`: OpenAI model to use (default: gpt-4o)
- `REDIS_URL`: Redis connection URL
- `MONGODB_URI`: MongoDB connection URI

Or create a config file at `~/.devloop/config.json`:

```json
{
  "openai": {
    "api_key": "your-api-key",
    "model": "gpt-4o",
    "temperature": 0.0
  },
  "redis": {
    "url": "redis://localhost:6379/0",
    "ttl": 3600
  }
}
```

## Testing

Run the LLM integration test:

```bash
./run_test.sh
```

This will test the LLM connector and the enhanced feature creation agent using the API keys from the `.env` file in the project root.

## Dependencies

- Python 3.9+
- OpenAI Python package
- LangChain
- Redis (optional)
- MongoDB (optional)

## Installation

```bash
pip install openai langchain langchain_openai redis pymongo
```

## Fallbacks

The agent is designed to work even when some components are unavailable:

1. If LLM is not available → Use rule-based analysis
2. If vector store is not available → Use rule-based similarity
3. If knowledge graph is not available → Use mock graph
4. If Redis is not available → Use in-memory cache
5. If MongoDB is not available → Use file-based storage

## Feature Creation Process

1. **Feature Analysis**:
   - Extract key concepts from feature description
   - Determine domain and purpose
   - Identify potential tags

2. **Knowledge Query**:
   - Find related concepts in knowledge graph
   - Identify potential dependencies
   - Query similar features

3. **Placement Suggestion**:
   - Determine optimal milestone, phase, and module
   - Respect user preferences if provided
   - Calculate confidence score

4. **Knowledge Graph Integration**:
   - Generate feature ID
   - Create feature node with properties
   - Connect to project structure (milestone/phase/module)
   - Create concept nodes from tags and link to feature
   - Link to domain and purpose taxonomies
   - Store relationships to enable semantic queries

5. **Storage**:
   - Store feature data in MongoDB
   - Add feature embedding to vector store
   - Cache results for improved performance