# Migration Plan: System Health Agent to SDK-Based Architecture

## Overview

This document outlines our plan to migrate the existing System Health Agent to our new SDK-based, hexagonal architecture. The migration will be incremental, allowing us to maintain system health monitoring throughout the process while gradually enhancing capabilities.

## Current Architecture

The current System Health Agent:
- Uses a custom agent implementation
- Has parent-child-micro agent hierarchy
- Stores knowledge in a basic knowledge graph
- Communicates with UI through a custom API
- Uses JSON templates for configuration

## Target Architecture

Our target architecture:
- Leverages OpenAI SDK for core agent capabilities
- Maintains parent-child-micro agent hierarchy
- Uses enhanced multi-tier knowledge graph
- Implements hexagonal architecture with clear ports/adapters
- Communicates with UI through standardized API gateway

## Migration Phases

### Phase 1: SDK Integration (2 weeks)

1. **SDK Foundation**
   - Add OpenAI SDK to project dependencies
   - Create SDK adapter classes for assistant creation
   - Implement function registry for tools

2. **Parallel Implementation**
   - Create new SystemHealthAgentSDK class alongside existing implementation
   - Implement core health check functionality using SDK
   - Test in isolated environment

3. **Shared Knowledge**
   - Create knowledge graph adapter for both implementations
   - Ensure both can read from same knowledge source
   - Test simultaneous operation

```python
# Example SDK adapter class
class OpenAIAssistantAdapter:
    def __init__(self, config):
        self.config = config
        self.client = openai.OpenAI(api_key=config.api_key)
        
    def create_assistant(self, name, instructions, tools):
        # Convert Devloop tools to OpenAI tool format
        openai_tools = self._convert_tools(tools)
        
        # Create assistant
        return self.client.beta.assistants.create(
            name=name,
            instructions=instructions,
            tools=openai_tools,
            model=self.config.model
        )
        
    def _convert_tools(self, devloop_tools):
        # Convert Devloop tool format to OpenAI format
        openai_tools = []
        for tool in devloop_tools:
            if tool["type"] == "function":
                openai_tools.append({
                    "type": "function",
                    "function": {
                        "name": tool["name"],
                        "description": tool["description"],
                        "parameters": tool["parameters"]
                    }
                })
        return openai_tools
```

### Phase 2: Knowledge Graph Enhancement (3 weeks)

1. **Multi-Tier Storage**
   - Implement Redis layer for short-term memory
   - Enhance MongoDB layer for medium-term memory
   - Add Neo4j integration for long-term relationships

2. **Vector Embeddings**
   - Integrate Pinecone or similar vector database
   - Create embedding service for semantic queries
   - Migrate existing knowledge to include embeddings

3. **Backward Compatibility Layer**
   - Create adapter for legacy knowledge graph access
   - Implement transparent read/write to new system
   - Ensure no disruption to existing operations

```python
# Enhanced Knowledge Graph
class EnhancedKnowledgeGraph:
    def __init__(self, config):
        self.redis = Redis(host=config.redis_host, port=config.redis_port)
        self.mongodb_client = MongoClient(config.mongodb_uri)
        self.mongodb = self.mongodb_client[config.mongodb_db]
        self.neo4j_driver = GraphDatabase.driver(
            config.neo4j_uri, 
            auth=(config.neo4j_user, config.neo4j_password)
        )
        self.vector_client = PineconeClient(config.pinecone_api_key)
        self.vector_index = self.vector_client.Index(config.pinecone_index)
        
    # Interface methods remain same but implementation enhanced
    def store_fact(self, entity, attribute, value, ttl=None):
        # Implementation with multi-tier storage
        pass
        
    def retrieve_fact(self, entity, attribute):
        # Implementation with multi-tier retrieval
        pass
        
    # Legacy compatibility layer
    def legacy_get(self, path):
        """Support old dot-notation path access"""
        parts = path.split('.')
        entity = parts[0]
        attribute = '.'.join(parts[1:])
        return self.retrieve_fact(entity, attribute)
        
    def legacy_set(self, path, value):
        """Support old dot-notation path setting"""
        parts = path.split('.')
        entity = parts[0]
        attribute = '.'.join(parts[1:])
        return self.store_fact(entity, attribute, value)
```

### Phase 3: Hexagonal Architecture Implementation (3 weeks)

1. **Core Domain Implementation**
   - Extract agent logic into core domain
   - Create clear domain interfaces
   - Implement domain services

2. **Port Definitions**
   - Define inbound ports (API interfaces)
   - Define outbound ports (DB, AI model, external services)
   - Create interface contracts

3. **Adapter Implementation**
   - Implement REST API adapters
   - Implement WebSocket adapters
   - Implement DB adapters

```python
# Domain core service example
class AgentService:
    def __init__(self, agent_repository, knowledge_port, ai_model_port):
        self.agent_repository = agent_repository
        self.knowledge_port = knowledge_port
        self.ai_model_port = ai_model_port
        
    def create_agent(self, agent_type, config):
        # Domain logic for creating agents
        agent = Agent(agent_type, config)
        self.agent_repository.save(agent)
        return agent.id
        
    def handle_issue(self, issue_data):
        # Domain logic for handling issues
        agent = self.agent_repository.find_suitable_agent(issue_data)
        knowledge_context = self.knowledge_port.get_context_for_issue(issue_data)
        return self.ai_model_port.process_with_agent(agent, issue_data, knowledge_context)
```

### Phase 4: System Health Agent Migration (4 weeks)

1. **Feature Parity**
   - Ensure new implementation has all features of original
   - Implement dashboard integration
   - Test comprehensive health checks

2. **Shadowing Phase**
   - Run both implementations in parallel
   - Compare results for consistency
   - Validate knowledge graph operations

3. **Cutover**
   - Switch frontend to new implementation
   - Monitor for issues
   - Keep legacy as fallback

```python
# New System Health Agent implementation
class SystemHealthAgent:
    def __init__(self, agent_service, knowledge_service, event_service):
        self.agent_service = agent_service
        self.knowledge_service = knowledge_service
        self.event_service = event_service
        
        # Create assistant through domain service
        self.agent_id = self.agent_service.create_agent(
            agent_type="system_health_parent",
            config={
                "instructions": "You are the System Health Agent...",
                "tools": ["spawn_child", "query_knowledge", "update_health"]
            }
        )
        
    def handle_issue(self, issue_data):
        # Process issue through domain service
        return self.agent_service.handle_issue(issue_data)
        
    def get_system_health(self):
        # Get overall health status
        return self.knowledge_service.get_overall_health()
        
    def update_component_health(self, component, status, metrics):
        # Update component health
        self.knowledge_service.update_component_health(component, status, metrics)
        # Publish event
        self.event_service.publish("health_updated", {
            "component": component,
            "status": status,
            "metrics": metrics
        })
```

### Phase 5: API Gateway Integration (2 weeks)

1. **Gateway Implementation**
   - Build Express.js API gateway
   - Implement authentication and authorization
   - Create standardized routing

2. **WebSocket Support**
   - Add Socket.io for real-time updates
   - Implement event channels
   - Create subscription management

3. **Frontend Integration**
   - Update UI components to use new endpoints
   - Implement real-time updates
   - Test and validate UI functionality

```javascript
// API Gateway routes for System Health
const express = require('express');
const router = express.Router();
const systemHealthController = require('../controllers/system-health');
const { authenticate, authorize } = require('../middleware/auth');

// Get overall system health
router.get('/health', 
  authenticate, 
  authorize('read:health'), 
  systemHealthController.getHealth
);

// Get component health
router.get('/health/:component', 
  authenticate, 
  authorize('read:health'), 
  systemHealthController.getComponentHealth
);

// Report issue
router.post('/issues', 
  authenticate, 
  authorize('create:issue'), 
  systemHealthController.reportIssue
);

// Get issue by ID
router.get('/issues/:id', 
  authenticate, 
  authorize('read:issue'), 
  systemHealthController.getIssue
);

// Resolve issue
router.post('/issues/:id/resolve', 
  authenticate, 
  authorize('update:issue'), 
  systemHealthController.resolveIssue
);

module.exports = router;
```

## Testing Strategy

For each phase:

1. **Unit Tests**
   - Test individual components in isolation
   - Validate domain logic
   - Ensure port interfaces are respected

2. **Integration Tests**
   - Test interactions between components
   - Validate adapters correctly implement ports
   - Ensure data flows correctly

3. **System Tests**
   - Test end-to-end functionality
   - Validate against real-world scenarios
   - Compare with existing implementation

4. **Performance Tests**
   - Measure response times
   - Validate scalability
   - Test under load

## Rollback Plan

For each phase:

1. **Monitoring Triggers**
   - Define metrics that indicate problems
   - Set thresholds for automatic rollback
   - Implement alerting

2. **Quick Rollback Mechanism**
   - Keep previous version containerized and ready
   - Implement feature flags for new components
   - Create script for immediate rollback

3. **Data Integrity**
   - Ensure data compatibility between versions
   - Implement data versioning
   - Create data migration scripts

## Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| SDK Integration | 2 weeks | Week 1 | Week 2 |
| Knowledge Graph Enhancement | 3 weeks | Week 3 | Week 5 |
| Hexagonal Architecture | 3 weeks | Week 6 | Week 8 |
| System Health Agent Migration | 4 weeks | Week 9 | Week 12 |
| API Gateway Integration | 2 weeks | Week 13 | Week 14 |

## Success Criteria

1. **Functional Parity**
   - All existing features work in new implementation
   - No regression in health monitoring capability
   - All alerts and notifications function properly

2. **Performance Improvements**
   - Response time for health checks improved by 20%
   - Issue detection accuracy increased by 15%
   - UI update latency reduced by 30%

3. **Developer Experience**
   - Clear separation of concerns
   - Improved testability
   - Reduced complexity for adding new features