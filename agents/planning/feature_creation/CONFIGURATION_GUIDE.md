# Configuration Guide for Enhanced Feature Creation Agent

This document provides detailed configuration information for the Enhanced Feature Creation Agent.

## Environment Setup

### Environment Variables

The agent uses the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | None |
| `RAG_OPENAI_API_KEY` | OpenAI API key specifically for RAG | Falls back to `OPENAI_API_KEY` |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4o` |
| `OPENAI_TEMPERATURE` | Temperature for OpenAI API calls | `0.0` |
| `OPENAI_MAX_TOKENS` | Maximum tokens for OpenAI API calls | `1500` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` |
| `REDIS_TTL` | Default TTL for Redis cache entries | `3600` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://localhost:27017` |
| `MONGODB_DB` | MongoDB database name | `devloop` |
| `KNOWLEDGE_GRAPH_PATH` | Path to knowledge graph file | System-dependent |

You can set these variables in your environment or use a `.env` file in the project root.

Example `.env` file:

```
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o
REDIS_URL=redis://localhost:6379/0
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=devloop
```

### Configuration File

For more detailed configuration, you can create a config file at `~/.devloop/config.json`:

```json
{
  "openai": {
    "api_key": "your-api-key",
    "model": "gpt-4o",
    "temperature": 0.0,
    "max_tokens": 1500
  },
  "redis": {
    "url": "redis://localhost:6379/0",
    "ttl": 3600
  },
  "mongodb": {
    "uri": "mongodb://localhost:27017",
    "db": "devloop",
    "collection": "features"
  },
  "knowledge_graph": {
    "path": "/path/to/knowledge_graph.json"
  },
  "vector_store": {
    "embedding_dim": 1536,
    "similarity_threshold": 0.75
  },
  "rag": {
    "enabled": true,
    "use_streaming": false,
    "chunk_size": 1000,
    "chunk_overlap": 100
  },
  "feature_creation": {
    "default_domain": "unknown",
    "default_purpose": "enhancement",
    "min_confidence": 0.5
  }
}
```

### Configuration Priority

The agent uses the following priority order for configuration:

1. Command-line arguments
2. Environment variables
3. `.env` file
4. Configuration file
5. Default values

## Component Configuration

### LLM Connector

The LLM connector can be configured with:

```python
from config import get_config
from llm_connector import get_llm_connector

# Get configuration
config = get_config()

# Configure LLM connector
llm_connector = get_llm_connector(
    model=config['openai']['model'],
    temperature=config['openai']['temperature'],
    max_tokens=config['openai']['max_tokens']
)
```

### Vector Store

The vector store can be configured with:

```python
from vector_store import get_vector_store

# Configure vector store
vector_store = get_vector_store(
    embedding_dim=1536,
    similarity_threshold=0.75,
    storage_path='/path/to/vector_store.db'
)
```

### Knowledge Graph Connector

The knowledge graph connector can be configured with:

```python
from knowledge_graph_connector import get_knowledge_graph_connector

# Configure knowledge graph connector
kg_connector = get_knowledge_graph_connector(
    kg_file_path='/path/to/knowledge_graph.json'
)
```

### Redis Cache

The Redis cache can be configured with:

```python
from redis_cache import get_redis_cache

# Configure Redis cache
redis_cache = get_redis_cache(
    url='redis://localhost:6379/0',
    ttl=3600
)
```

### MongoDB Connector

The MongoDB connector can be configured with:

```python
from mongo_connector import get_mongo_connector

# Configure MongoDB connector
mongo_connector = get_mongo_connector(
    uri='mongodb://localhost:27017',
    db='devloop',
    collection='features'
)
```

### Enhanced Feature Creation Agent

The main agent can be configured with:

```python
from enhanced_core import EnhancedFeatureCreationAgent

# Configure agent
agent = EnhancedFeatureCreationAgent(
    use_rag=True,
    use_langchain=True,
    use_cache=True
)
```

## Command-line Configuration

The agent can be configured via command-line arguments:

```bash
# Basic configuration
python enhanced_core.py --spawn

# Configure components
python enhanced_core.py --spawn --no-rag --no-cache

# Advanced configuration with context
python enhanced_core.py --spawn --context context.json
```

Command-line options:

- `--use-rag`: Use RAG engine (default: true)
- `--use-langchain`: Use LangChain (default: true)
- `--use-cache`: Use Redis caching (default: true)
- `--no-rag`: Disable RAG engine
- `--no-langchain`: Disable LangChain
- `--no-cache`: Disable Redis caching

## Configuration Files

### Context File

You can provide a context file when spawning the agent:

```json
{
  "project_id": "devloop-main",
  "user_id": "user-123",
  "default_milestone": "milestone-ui-dashboard",
  "default_phase": "phase-04",
  "default_module": "feature-improvements",
  "tags": ["ui", "dashboard"],
  "environment": "development"
}
```

### Parameter File

You can provide a parameter file for operations:

```json
{
  "name": "Knowledge Graph Visualization",
  "description": "Create a visualization component for the knowledge graph that displays nodes and relationships in an interactive manner. Allow users to explore the graph, filter by node types, and search for specific nodes.",
  "tags": ["ui", "visualization", "knowledge-graph", "interactive"],
  "projectId": "devloop-main",
  "milestone": "milestone-ui-dashboard",
  "phase": "phase-04",
  "module": "feature-improvements"
}
```

## Fallback Configuration

The agent is designed to gracefully fall back when components are unavailable:

### LLM Fallback

If OpenAI API is unavailable:

```python
if not is_llm_available():
    # Use rule-based analysis instead
    from core import FeatureAnalyzer
    feature_analyzer = FeatureAnalyzer()
    analysis = feature_analyzer.analyze(feature_name, feature_description)
```

### Knowledge Graph Fallback

If the real knowledge graph is unavailable:

```python
try:
    from backups.system_core_backup.system_core.memory.manager.memory_knowledge_graph import MemoryKnowledgeGraph
    USING_REAL_KG = True
except ImportError:
    # Use mock implementation
    USING_REAL_KG = False
    class MemoryKnowledgeGraph:
        """Mock implementation of MemoryKnowledgeGraph"""
        # ...
```

### Redis Fallback

If Redis is unavailable:

```python
try:
    import redis
    redis_client = redis.Redis.from_url(redis_url)
    redis_client.ping()  # Check connection
    REDIS_AVAILABLE = True
except (ImportError, redis.ConnectionError):
    # Use in-memory cache instead
    REDIS_AVAILABLE = False
    memory_cache = {}
```

### MongoDB Fallback

If MongoDB is unavailable:

```python
try:
    from pymongo import MongoClient
    client = MongoClient(uri)
    client.admin.command('ping')  # Check connection
    MONGO_AVAILABLE = True
except (ImportError, Exception):
    # Use file-based storage instead
    MONGO_AVAILABLE = False
    storage_dir = os.path.expanduser("~/.devloop/sdk/storage")
```

## Advanced Configuration

### RAG Configuration

The RAG engine can be configured with:

```python
from rag_engine import get_rag_engine

# Configure RAG engine
rag_engine = get_rag_engine(
    llm_model="gpt-4o",
    embedding_model="text-embedding-3-large",
    chunk_size=1000,
    chunk_overlap=100,
    temperature=0.0,
    use_streaming=False
)
```

### LangChain Configuration

LangChain components can be configured with:

```python
from langchain_integration import get_feature_analyzer, get_placement_suggester, get_rag_system

# Configure LangChain components
feature_analyzer = get_feature_analyzer(
    llm_model="gpt-4o",
    temperature=0.0
)

placement_suggester = get_placement_suggester(
    llm_model="gpt-4o",
    temperature=0.0
)

rag_system = get_rag_system(
    llm_model="gpt-4o",
    embedding_model="text-embedding-3-large",
    chunk_size=1000,
    chunk_overlap=100
)
```

## Troubleshooting

### Common Issues

1. **OpenAI API Key Not Found**
   - Set the `OPENAI_API_KEY` environment variable
   - Check the `.env` file in the project root
   - Check the configuration file at `~/.devloop/config.json`

2. **Redis Connection Error**
   - Check if Redis server is running
   - Verify the `REDIS_URL` environment variable
   - The agent will fall back to in-memory cache

3. **MongoDB Connection Error**
   - Check if MongoDB server is running
   - Verify the `MONGODB_URI` environment variable
   - The agent will fall back to file-based storage

4. **Knowledge Graph Not Found**
   - Check the `KNOWLEDGE_GRAPH_PATH` environment variable
   - The agent will create a new knowledge graph if needed

### Logging

The agent uses Python's logging module for debugging:

```python
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(PROJECT_ROOT, 'logs', 'feature_creation_agent.log'))
    ]
)
```

You can change the log level to `DEBUG` for more detailed information:

```python
logging.getLogger('feature_creation_agent').setLevel(logging.DEBUG)
```

### Configuration Validation

The agent validates configuration at startup:

```python
def validate_config(config):
    """Validate configuration"""
    if 'openai' not in config:
        config['openai'] = {}
    
    if 'api_key' not in config['openai'] or not config['openai']['api_key']:
        config['openai']['api_key'] = os.getenv('OPENAI_API_KEY')
    
    # Additional validation...
    
    return config
```