# Agent Catalog

This directory contains specifications for all agent types in the SDK-first architecture. Each agent definition includes its purpose, capabilities, tools, and interaction patterns.

## Agent Types

The system uses several agent patterns:

1. **Single Agents**: Standalone agents with specific tool sets
2. **Manager-Worker Pattern**: Manager agents that coordinate specialized worker agents
3. **Decentralized Pattern**: Agents that operate independently and hand off tasks

## Agent Categories

Our system incorporates the following agent categories:

### 1. Planning Agents

- [Project Architect Agent](planning/architect_agent.md)
- [Detail Agent](planning/detail_agent.md)
- [Relationship Agent](planning/relationship_agent.md)
- [Estimation Agent](planning/estimation_agent.md)
- [Resource Allocation Agent](planning/resource_agent.md)

### 2. Knowledge Agents

- [Knowledge Graph Agent](knowledge/graph_agent.md)
- [RAG Retrieval Agent](knowledge/rag_agent.md)
- [Documentation Agent](knowledge/documentation_agent.md)
- [Memory Agent](knowledge/memory_agent.md)
- [Learning Agent](knowledge/learning_agent.md)

### 3. UI Agents

- [UI Orchestration Agent](ui/orchestration_agent.md)
- [Suggestion Agent](ui/suggestion_agent.md)
- [Visualization Agent](ui/visualization_agent.md)
- [Interaction Agent](ui/interaction_agent.md)
- [Feedback Agent](ui/feedback_agent.md)

### 4. Testing Agents

- [Test Orchestration Agent](testing/orchestration_agent.md)
- [Mock Data Generation Agent](testing/mock_data_agent.md)
- [Verification Agent](testing/verification_agent.md)
- [Test Report Agent](testing/report_agent.md)
- [Chaos Agent](testing/chaos_agent.md)

### 5. Integration Agents

- [API Integration Agent](integration/api_agent.md)
- [Data Transformation Agent](integration/transformation_agent.md)
- [Sync Agent](integration/sync_agent.md)
- [Notification Agent](integration/notification_agent.md)
- [Webhook Agent](integration/webhook_agent.md)

### 6. System Agents

- [Orchestration Agent](system/orchestration_agent.md)
- [Health Monitoring Agent](system/health_agent.md)
- [Resource Management Agent](system/resource_agent.md)
- [Security Agent](system/security_agent.md)
- [Logging Agent](system/logging_agent.md)

## Agent Implementation

Each agent in this catalog can be implemented using the SDK-first architecture with the following components:

1. **Agent Definition File**: Specifies the agent's properties, purpose, and capabilities
2. **Tool Set Definition**: Defines the tools the agent can access
3. **Permission Configuration**: Configures the agent's access rights
4. **Interaction Patterns**: Defines how the agent interacts with other agents

## Integrating with Knowledge Graph

All agents are registered in the knowledge graph with relationships to:

- Tools they can use
- Agents they interact with
- Components they can modify
- Guardrails that constrain them

## Usage

To create a new agent implementation, use the agent scaffolding tool:

```bash
python /agents/tools/create_agent.py --type [agent_type] --name [name] --description [description] --output-dir [dir]
```

This will generate the necessary files and register the agent in the knowledge graph.