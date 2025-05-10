# Testing Guide for Enhanced Feature Creation Agent

This document provides detailed guidance for testing the Enhanced Feature Creation Agent.

## Test Setup

### Prerequisites

Before running tests, ensure you have:

1. Python 3.9+
2. Required packages installed: `openai`, `langchain`, `redis`, `pymongo`
3. API keys configured in `.env` file or environment variables
4. Test fixtures and test data

### Setting Up the Test Environment

Create a `.env` file for testing:

```
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o
TEST_MODE=true
```

## Running Tests

### Basic Tests

Run the basic LLM integration test:

```bash
./run_test.sh
```

This will test the LLM connector and the enhanced feature creation agent using the API keys from the `.env` file.

### Testing Different Domains

Test feature creation across different domains:

```bash
python test_different_domains.py
```

This will test the agent's ability to handle features in different domains: UI, testing, data, API, and agent.

### API Testing

Test the API operations:

```bash
python run_api_test.py
```

This will test all API operations of the Enhanced Feature Creation Agent.

## Test Files

### LLM Integration Test

`test_llm.py` - Tests the integration with OpenAI:

```python
from config import get_config, is_llm_available
from llm_connector import get_llm_connector

def test_llm_integration():
    """Test LLM integration"""
    if not is_llm_available():
        print("LLM is not available - skipping test")
        return
    
    # Get LLM connector
    llm_connector = get_llm_connector()
    
    # Test with simple prompt
    prompt = "Analyze the feature: Task Management Dashboard"
    system_message = "You are an assistant that analyzes feature descriptions."
    
    response = llm_connector.chat_completion(prompt, system_message)
    print(f"Response: {response}")
    
    assert response, "Response should not be empty"
    
    # Test with JSON mode
    json_response = llm_connector.json_completion(prompt, system_message)
    print(f"JSON response: {json_response}")
    
    assert isinstance(json_response, dict), "JSON response should be a dictionary"

if __name__ == "__main__":
    test_llm_integration()
```

### Domain Testing

`test_different_domains.py` - Tests feature creation across different domains:

```python
from enhanced_core import EnhancedFeatureCreationAgent

def test_different_domains():
    """Test feature creation across different domains"""
    agent = EnhancedFeatureCreationAgent()
    
    # Test UI domain
    ui_result = agent.process_feature_request({
        'name': 'Task Management Dashboard',
        'description': 'A dashboard for managing tasks with filtering and sorting'
    })
    
    # Test testing domain
    testing_result = agent.process_feature_request({
        'name': 'Automated UI Test Framework',
        'description': 'Framework for automated testing of UI components'
    })
    
    # Test data domain
    data_result = agent.process_feature_request({
        'name': 'Graph Database Integration',
        'description': 'Integration with Neo4j for knowledge graph storage'
    })
    
    # Test agent domain
    agent_result = agent.process_feature_request({
        'name': 'LLM-powered Agent Orchestration',
        'description': 'System for orchestrating multiple AI agents'
    })
    
    # Print results
    print("UI Domain:", ui_result['feature']['analysisDetails']['domain'])
    print("Testing Domain:", testing_result['feature']['analysisDetails']['domain'])
    print("Data Domain:", data_result['feature']['analysisDetails']['domain'])
    print("Agent Domain:", agent_result['feature']['analysisDetails']['domain'])

if __name__ == "__main__":
    test_different_domains()
```

### API Testing

`run_api_test.py` - Tests all API operations:

```python
from enhanced_core import EnhancedFeatureCreationAgent

def test_api_operations():
    """Test all API operations"""
    agent = EnhancedFeatureCreationAgent()
    
    # Test process_feature operation
    process_result = agent.execute_operation('process_feature', {
        'name': 'Task Management Dashboard',
        'description': 'A dashboard for managing tasks with filtering and sorting'
    })
    
    feature_id = process_result['feature']['id']
    
    # Test analyze_feature operation
    analyze_result = agent.execute_operation('analyze_feature', {
        'name': 'Task Management Dashboard',
        'description': 'A dashboard for managing tasks with filtering and sorting'
    })
    
    # Test suggest_placement operation
    suggest_result = agent.execute_operation('suggest_placement', {
        'name': 'Task Management Dashboard',
        'description': 'A dashboard for managing tasks with filtering and sorting',
        'analysis': analyze_result
    })
    
    # Test update_knowledge_base operation
    update_result = agent.execute_operation('update_knowledge_base', {
        'id': feature_id,
        'data': {
            'name': 'Task Management Dashboard',
            'description': 'A dashboard for managing tasks with filtering and sorting',
            'milestone': suggest_result['milestone'],
            'phase': suggest_result['phase'],
            'module': suggest_result['module'],
            'domain': analyze_result['domain'],
            'purpose': analyze_result['purpose'],
            'tags': ['ui', 'dashboard', 'tasks']
        }
    })
    
    # Test get_related_features operation
    related_result = agent.execute_operation('get_related_features', {
        'id': feature_id
    })
    
    # Test query_features operation
    query_result = agent.execute_operation('query_features', {
        'domain': 'ui',
        'tags': ['dashboard']
    })
    
    # Print results
    print("Process Result:", process_result['success'])
    print("Analyze Result:", analyze_result['domain'])
    print("Suggest Result:", suggest_result['milestone'])
    print("Update Result:", update_result['success'])
    print("Related Features:", len(related_result['same_domain']))
    print("Query Features:", len(query_result))

if __name__ == "__main__":
    test_api_operations()
```

## Testing the Knowledge Graph Integration

### Knowledge Graph Test

`test_knowledge_graph.py` - Tests the knowledge graph integration:

```python
from knowledge_graph_connector import get_knowledge_graph_connector

def test_knowledge_graph():
    """Test knowledge graph integration"""
    # Get knowledge graph connector
    kg_connector = get_knowledge_graph_connector()
    
    # Add a feature
    feature_data = {
        'id': 'feature-test-123',
        'name': 'Test Feature',
        'description': 'A test feature',
        'milestone': 'milestone-test',
        'phase': 'phase-01',
        'module': 'module-test',
        'tags': ['test', 'feature'],
        'domain': 'testing',
        'purpose': 'enhancement'
    }
    
    success, feature_id = kg_connector.add_feature(feature_data)
    print(f"Add feature result: {success}, {feature_id}")
    
    # Query by concepts
    query_result = kg_connector.query_by_concepts(
        concepts=['test', 'feature'],
        domain='testing',
        purpose='enhancement'
    )
    print(f"Query by concepts result: {query_result}")
    
    # Query features
    features = kg_connector.query_features(
        domain='testing',
        tags=['test']
    )
    print(f"Query features result: {len(features)} features found")
    
    # Get related features
    related = kg_connector.get_related_features('feature-test-123')
    print(f"Related features result: {related}")
    
    # Get project structure
    structure = kg_connector.get_project_structure()
    print(f"Project structure result: {len(structure['milestones'])} milestones found")

if __name__ == "__main__":
    test_knowledge_graph()
```

### Relationship Test

`test_relationships.py` - Tests feature relationships:

```python
from knowledge_graph_connector import get_knowledge_graph_connector

def test_relationships():
    """Test feature relationships"""
    # Get knowledge graph connector
    kg_connector = get_knowledge_graph_connector()
    
    # Add parent feature
    parent_data = {
        'id': 'feature-parent',
        'name': 'Parent Feature',
        'description': 'A parent feature',
        'milestone': 'milestone-test',
        'phase': 'phase-01',
        'module': 'module-test',
        'tags': ['parent', 'feature'],
        'domain': 'testing',
        'purpose': 'enhancement'
    }
    
    kg_connector.add_feature(parent_data)
    
    # Add child feature with dependency
    child_data = {
        'id': 'feature-child',
        'name': 'Child Feature',
        'description': 'A child feature',
        'milestone': 'milestone-test',
        'phase': 'phase-01',
        'module': 'module-test',
        'tags': ['child', 'feature'],
        'domain': 'testing',
        'purpose': 'enhancement',
        'dependencies': [
            {'id': 'feature-parent', 'name': 'Parent Feature', 'type': 'feature'}
        ]
    }
    
    kg_connector.add_feature(child_data)
    
    # Test dependency relationship
    parent_related = kg_connector.get_related_features('feature-parent')
    child_related = kg_connector.get_related_features('feature-child')
    
    print(f"Parent dependents: {parent_related['dependents']}")
    print(f"Child dependencies: {child_related['dependencies']}")
    
    # Test shared concepts
    concept_related = kg_connector.get_related_features('feature-parent', 
                                                     relation_types=['shared_concepts'])
    
    print(f"Features sharing concepts: {concept_related['shared_concepts']}")

if __name__ == "__main__":
    test_relationships()
```

## Testing with Mock Components

### Mock LLM Connector

Test with a mock LLM connector:

```python
class MockLLMConnector:
    """Mock LLM connector for testing"""
    
    def __init__(self):
        self.llm_available = True
    
    def chat_completion(self, prompt, system_message):
        """Mock chat completion"""
        return "This is a mock response"
    
    def json_completion(self, prompt, system_message):
        """Mock JSON completion"""
        return {
            "domain": "ui",
            "purpose": "enhancement",
            "concepts": ["dashboard", "task", "management"]
        }
    
    def create_embeddings(self, texts):
        """Mock create embeddings"""
        return [[0.1] * 1536 for _ in texts]

# Use in tests
from unittest.mock import patch

@patch('llm_connector.get_llm_connector')
def test_with_mock_llm(mock_get_llm):
    mock_get_llm.return_value = MockLLMConnector()
    
    # Test code that uses LLM connector
    # ...
```

### Mock Knowledge Graph

Test with a mock knowledge graph:

```python
class MockKnowledgeGraph:
    """Mock knowledge graph for testing"""
    
    def __init__(self):
        self.nodes = {}
        self.edges = []
    
    def add_node(self, node_id, node_type, properties=None, metadata=None):
        """Mock add node"""
        self.nodes[node_id] = {
            "id": node_id,
            "type": node_type,
            "properties": properties or {},
            "metadata": metadata or {}
        }
        return self.nodes[node_id]
    
    def add_edge(self, edge_type, source_id, target_id, properties=None, metadata=None):
        """Mock add edge"""
        edge = {
            "type": edge_type,
            "source": source_id,
            "target": target_id,
            "properties": properties or {},
            "metadata": metadata or {}
        }
        self.edges.append(edge)
        return edge
    
    def get_node(self, node_id):
        """Mock get node"""
        return self.nodes.get(node_id)
    
    def get_nodes_by_type(self, node_type):
        """Mock get nodes by type"""
        return [node for node in self.nodes.values() if node.get("type") == node_type]
    
    def get_connected_nodes(self, node_id, direction="outgoing"):
        """Mock get connected nodes"""
        connected = []
        for edge in self.edges:
            if direction == "outgoing" and edge.get("source") == node_id:
                connected.append(self.get_node(edge.get("target")))
            elif direction == "incoming" and edge.get("target") == node_id:
                connected.append(self.get_node(edge.get("source")))
        return connected

# Use in tests
from unittest.mock import patch

@patch('knowledge_graph_connector.MemoryKnowledgeGraph')
def test_with_mock_kg(mock_kg_class):
    mock_kg_class.return_value = MockKnowledgeGraph()
    
    # Test code that uses knowledge graph
    # ...
```

## Integration Testing

### End-to-End Test

`test_end_to_end.py` - Tests the entire feature creation process:

```python
from enhanced_core import EnhancedFeatureCreationAgent

def test_end_to_end():
    """Test end-to-end feature creation process"""
    # Create agent
    agent = EnhancedFeatureCreationAgent()
    
    # Process feature request
    result = agent.process_feature_request({
        'name': 'Knowledge Graph Visualization',
        'description': 'Create a visualization component for the knowledge graph that displays nodes and relationships in an interactive manner. Allow users to explore the graph, filter by node types, and search for specific nodes.',
        'tags': ['ui', 'visualization', 'knowledge-graph', 'interactive'],
        'projectId': 'devloop-main',
        'confirmed': True  # Update knowledge base
    })
    
    feature = result['feature']
    feature_id = feature['id']
    
    print(f"Feature created: {feature['name']} ({feature_id})")
    print(f"Suggested placement: {feature['suggestedMilestone']}/{feature['suggestedPhase']}/{feature['suggestedModule']}")
    print(f"Analysis details: Domain={feature['analysisDetails']['domain']}, Purpose={feature['analysisDetails']['purpose']}")
    
    # Get related features
    related = agent.execute_operation('get_related_features', {'id': feature_id})
    
    print(f"Related features:")
    print(f"- Dependencies: {len(related['dependencies'])}")
    print(f"- Same domain: {len(related['same_domain'])}")
    print(f"- Shared concepts: {len(related['shared_concepts'])}")
    
    # Query features by domain
    domain_features = agent.execute_operation('query_features', {
        'domain': feature['analysisDetails']['domain']
    })
    
    print(f"Features in {feature['analysisDetails']['domain']} domain: {len(domain_features)}")
    
    # Query features by tags
    tag_features = agent.execute_operation('query_features', {
        'tags': ['visualization']
    })
    
    print(f"Features with 'visualization' tag: {len(tag_features)}")

if __name__ == "__main__":
    test_end_to_end()
```

## Performance Testing

### Benchmark Test

`benchmark.py` - Benchmarks the performance of the feature creation agent:

```python
import time
from enhanced_core import EnhancedFeatureCreationAgent

def benchmark_feature_creation():
    """Benchmark feature creation performance"""
    # Create agent
    agent = EnhancedFeatureCreationAgent()
    
    # Test features
    features = [
        {
            'name': 'Task Dashboard',
            'description': 'Dashboard for managing tasks'
        },
        {
            'name': 'User Authentication',
            'description': 'User authentication system'
        },
        {
            'name': 'Data Analytics',
            'description': 'Data analytics and visualization'
        },
        {
            'name': 'API Gateway',
            'description': 'API gateway for microservices'
        },
        {
            'name': 'Agent Orchestration',
            'description': 'System for orchestrating AI agents'
        }
    ]
    
    # Benchmark
    total_time = 0
    results = []
    
    for i, feature in enumerate(features):
        start_time = time.time()
        
        result = agent.process_feature_request(feature)
        
        end_time = time.time()
        elapsed_time = end_time - start_time
        total_time += elapsed_time
        
        results.append({
            'feature': feature['name'],
            'time': elapsed_time,
            'success': result['success']
        })
        
        print(f"Feature {i+1}/{len(features)}: {feature['name']} - {elapsed_time:.2f} seconds")
    
    # Print results
    avg_time = total_time / len(features)
    print(f"\nAverage processing time: {avg_time:.2f} seconds")
    print(f"Total time: {total_time:.2f} seconds")
    
    success_rate = sum(1 for r in results if r['success']) / len(results) * 100
    print(f"Success rate: {success_rate:.2f}%")

if __name__ == "__main__":
    benchmark_feature_creation()
```

### Cache Performance Test

`test_cache_performance.py` - Tests the performance of the Redis cache:

```python
import time
from enhanced_core import EnhancedFeatureCreationAgent

def test_cache_performance():
    """Test cache performance"""
    # Create agent with cache
    agent_with_cache = EnhancedFeatureCreationAgent(use_cache=True)
    
    # Create agent without cache
    agent_without_cache = EnhancedFeatureCreationAgent(use_cache=False)
    
    # Test feature
    feature = {
        'name': 'Task Dashboard',
        'description': 'Dashboard for managing tasks'
    }
    
    # Benchmark without cache
    print("Without cache:")
    start_time = time.time()
    for i in range(5):
        agent_without_cache.process_feature_request(feature)
        print(f"Iteration {i+1}/5 completed")
    end_time = time.time()
    no_cache_time = end_time - start_time
    print(f"Total time without cache: {no_cache_time:.2f} seconds")
    
    # Benchmark with cache
    print("\nWith cache:")
    start_time = time.time()
    for i in range(5):
        agent_with_cache.process_feature_request(feature)
        print(f"Iteration {i+1}/5 completed")
    end_time = time.time()
    cache_time = end_time - start_time
    print(f"Total time with cache: {cache_time:.2f} seconds")
    
    # Compare
    speedup = no_cache_time / cache_time if cache_time > 0 else float('inf')
    print(f"\nSpeedup with cache: {speedup:.2f}x")

if __name__ == "__main__":
    test_cache_performance()
```

## Automated Testing

### Pytest Integration

`test_agent.py` - Pytest-based tests:

```python
import pytest
from enhanced_core import EnhancedFeatureCreationAgent
from knowledge_graph_connector import get_knowledge_graph_connector

@pytest.fixture
def agent():
    """Create a test agent"""
    return EnhancedFeatureCreationAgent(use_rag=True, use_langchain=True, use_cache=False)

@pytest.fixture
def kg_connector():
    """Create a test knowledge graph connector"""
    return get_knowledge_graph_connector()

def test_process_feature(agent):
    """Test process_feature_request method"""
    result = agent.process_feature_request({
        'name': 'Test Feature',
        'description': 'A test feature'
    })
    
    assert result['success'], "Process feature request should succeed"
    assert 'feature' in result, "Result should contain feature"
    assert 'id' in result['feature'], "Feature should have ID"
    assert 'suggestedMilestone' in result['feature'], "Feature should have suggested milestone"

def test_knowledge_graph_integration(agent, kg_connector):
    """Test knowledge graph integration"""
    # Process feature request with confirmation
    result = agent.process_feature_request({
        'name': 'Test Feature',
        'description': 'A test feature',
        'confirmed': True
    })
    
    feature_id = result['feature']['id']
    
    # Query knowledge graph for the feature
    feature_node = kg_connector.kg.get_node(feature_id)
    
    assert feature_node, "Feature node should exist in knowledge graph"
    assert feature_node.get("type") == "feature", "Node should be of type 'feature'"
    assert feature_node.get("properties", {}).get("name") == "Test Feature", "Feature name should match"

def test_related_features(agent, kg_connector):
    """Test related features functionality"""
    # Add two related features
    feature1_data = {
        'id': 'feature-test-1',
        'name': 'Test Feature 1',
        'description': 'A test feature',
        'milestone': 'milestone-test',
        'phase': 'phase-01',
        'module': 'module-test',
        'tags': ['test', 'feature'],
        'domain': 'testing',
        'purpose': 'enhancement'
    }
    
    feature2_data = {
        'id': 'feature-test-2',
        'name': 'Test Feature 2',
        'description': 'Another test feature',
        'milestone': 'milestone-test',
        'phase': 'phase-01',
        'module': 'module-test',
        'tags': ['test', 'feature'],
        'domain': 'testing',
        'purpose': 'enhancement',
        'dependencies': [
            {'id': 'feature-test-1', 'name': 'Test Feature 1'}
        ]
    }
    
    kg_connector.add_feature(feature1_data)
    kg_connector.add_feature(feature2_data)
    
    # Get related features
    related1 = agent.execute_operation('get_related_features', {'id': 'feature-test-1'})
    related2 = agent.execute_operation('get_related_features', {'id': 'feature-test-2'})
    
    assert len(related1['dependents']) > 0, "Feature 1 should have dependents"
    assert len(related2['dependencies']) > 0, "Feature 2 should have dependencies"
    
    assert related1['dependents'][0]['id'] == 'feature-test-2', "Feature 1's dependent should be Feature 2"
    assert related2['dependencies'][0]['id'] == 'feature-test-1', "Feature 2's dependency should be Feature 1"
```

### CI/CD Integration

`.github/workflows/test.yml` - GitHub Actions workflow for testing:

```yaml
name: Test Enhanced Feature Creation Agent

on:
  push:
    branches: [ main ]
    paths:
      - 'agents/planning/feature_creation/**'
  pull_request:
    branches: [ main ]
    paths:
      - 'agents/planning/feature_creation/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install pytest
        pip install -r requirements.txt
    
    - name: Run tests
      env:
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        TEST_MODE: true
      run: |
        cd agents/planning/feature_creation
        pytest -xvs test_agent.py
```

## Test Coverage

To generate test coverage reports:

```bash
pip install pytest pytest-cov
pytest --cov=. --cov-report=html
```

This will generate an HTML coverage report in the `htmlcov` directory.

## Test Data

Sample test data for feature creation:

```json
[
  {
    "name": "Task Management Dashboard",
    "description": "A dashboard for managing tasks with filtering and sorting",
    "tags": ["ui", "dashboard", "tasks"],
    "domain": "ui",
    "purpose": "enhancement"
  },
  {
    "name": "Automated UI Test Framework",
    "description": "Framework for automated testing of UI components",
    "tags": ["testing", "framework", "automation"],
    "domain": "testing",
    "purpose": "enhancement"
  },
  {
    "name": "Graph Database Integration",
    "description": "Integration with Neo4j for knowledge graph storage",
    "tags": ["data", "database", "graph", "storage"],
    "domain": "data",
    "purpose": "enhancement"
  },
  {
    "name": "API Gateway",
    "description": "API gateway for microservices",
    "tags": ["api", "gateway", "microservices"],
    "domain": "api",
    "purpose": "enhancement"
  },
  {
    "name": "LLM-powered Agent Orchestration",
    "description": "System for orchestrating multiple AI agents",
    "tags": ["agent", "llm", "orchestration"],
    "domain": "agent",
    "purpose": "enhancement"
  }
]
```