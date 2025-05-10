# Knowledge Graph Schema for SDK-First Planning System

This document defines the complete knowledge graph schema for our roadmap and agent system, providing the foundation for the entire planning ecosystem.

## Node Types

### Project Structure Nodes

#### Milestone
```json
{
  "id": "milestone-{id}",
  "name": "String",
  "description": "String",
  "version": "String",
  "status": "not-started|in-progress|completed|blocked",
  "created": "Timestamp",
  "last_updated": "Timestamp",
  "metadata": {
    "priority": "high|medium|low",
    "target_completion": "Timestamp",
    "owner": "String"
  }
}
```

#### Phase
```json
{
  "id": "phase-{number}",
  "name": "String",
  "description": "String",
  "sequence": "Integer",
  "status": "pending|active|completed|skipped|failed",
  "metadata": {
    "estimated_duration": "Integer (days)",
    "dependencies": ["phase-id"]
  }
}
```

#### Module
```json
{
  "id": "module-{id}",
  "name": "String",
  "description": "String",
  "status": "pending|active|completed|skipped|failed",
  "metadata": {
    "domain": "String",
    "complexity": "high|medium|low",
    "team": "String"
  }
}
```

#### Feature
```json
{
  "id": "feature-{number}-{id}",
  "name": "String",
  "description": "String",
  "status": "not-started|in-progress|completed|failed|blocked",
  "created": "Timestamp",
  "last_updated": "Timestamp",
  "metadata": {
    "priority": "high|medium|low",
    "complexity": "high|medium|low",
    "estimated_hours": "Integer",
    "assigned_to": "String"
  }
}
```

### Agent System Nodes

#### Agent
```json
{
  "id": "agent-{id}",
  "name": "String",
  "description": "String",
  "type": "architect|detail|relationship|ui|suggestion|validation|test",
  "status": "active|inactive|deprecated",
  "capabilities": ["Array of capabilities"],
  "metadata": {
    "created_by": "String",
    "version": "String",
    "last_execution": "Timestamp"
  }
}
```

#### Tool
```json
{
  "id": "tool-{id}",
  "name": "String",
  "description": "String",
  "category": "structure|knowledge|ui|system|testing",
  "input_schema": "JSON Schema",
  "output_schema": "JSON Schema",
  "permissions": ["Array of required permissions"],
  "metadata": {
    "version": "String",
    "last_updated": "Timestamp",
    "failure_rate": "Float"
  }
}
```

#### Handoff
```json
{
  "id": "handoff-{source}-{target}-{type}",
  "name": "String",
  "description": "String",
  "handoff_type": "sequential|parallel|conditional",
  "trigger_conditions": ["Array of conditions"],
  "data_mapping": {
    "source_outputs": ["Array of outputs"],
    "target_inputs": ["Array of inputs"]
  },
  "metadata": {
    "average_duration": "Integer (ms)",
    "success_rate": "Float"
  }
}
```

#### Guardrail
```json
{
  "id": "guardrail-{id}",
  "name": "String",
  "description": "String",
  "rule_type": "validation|security|quality|performance",
  "enforcement": "block|warn|log",
  "rule_definition": "String or JSON defining the rule",
  "metadata": {
    "created_by": "String",
    "priority": "high|medium|low"
  }
}
```

## Relationship Types

### Project Structure Relationships

#### milestone_contains_phase
```json
{
  "source": "milestone",
  "target": "phase",
  "properties": {
    "sequence": "Integer",
    "required": "Boolean"
  }
}
```

#### phase_contains_module
```json
{
  "source": "phase",
  "target": "module",
  "properties": {
    "sequence": "Integer"
  }
}
```

#### module_contains_feature
```json
{
  "source": "module",
  "target": "feature",
  "properties": {
    "core": "Boolean"
  }
}
```

#### feature_depends_on
```json
{
  "source": "feature",
  "target": "feature",
  "properties": {
    "dependency_type": "strong|weak|optional",
    "notes": "String"
  }
}
```

### Agent System Relationships

#### agent_uses_tool
```json
{
  "source": "agent",
  "target": "tool",
  "properties": {
    "usage_frequency": "Float",
    "permission_level": "full|limited|supervised",
    "success_rate": "Float"
  }
}
```

#### agent_has_guardrail
```json
{
  "source": "agent",
  "target": "guardrail",
  "properties": {
    "override_enabled": "Boolean",
    "enforcement_level": "strict|adaptive"
  }
}
```

#### agent_handoff_to_agent
```json
{
  "source": "agent",
  "target": "agent",
  "properties": {
    "handoff_id": "String",
    "priority": "high|medium|low",
    "retry_policy": "JSON defining retry behavior"
  }
}
```

#### tool_depends_on_tool
```json
{
  "source": "tool",
  "target": "tool",
  "properties": {
    "dependency_type": "invocation|data|resource",
    "optional": "Boolean"
  }
}
```

### Cross-Domain Relationships

#### agent_manages_milestone
```json
{
  "source": "agent",
  "target": "milestone",
  "properties": {
    "permission_level": "view|edit|manage",
    "assignment_date": "Timestamp"
  }
}
```

#### agent_manages_feature
```json
{
  "source": "agent",
  "target": "feature",
  "properties": {
    "responsibility": "create|update|validate|implement",
    "assignment_date": "Timestamp"
  }
}
```

#### tool_operates_on_feature
```json
{
  "source": "tool",
  "target": "feature",
  "properties": {
    "operation_type": "create|update|delete|validate",
    "allowed_statuses": ["Array of valid statuses"]
  }
}
```

## Traversal Paths

### Project Structure Paths

```json
{
  "milestone_to_features": {
    "description": "Path from milestone to all contained features",
    "path": ["milestone_contains_phase", "phase_contains_module", "module_contains_feature"]
  },
  "feature_dependencies": {
    "description": "All dependencies of a feature (direct and indirect)",
    "path": ["feature_depends_on+"]
  },
  "feature_dependents": {
    "description": "All features that depend on a given feature",
    "path": ["<-feature_depends_on"]
  }
}
```

### Agent System Paths

```json
{
  "agent_tool_chain": {
    "description": "Complete chain of tools used by an agent",
    "path": ["agent_uses_tool", "tool_depends_on_tool*"]
  },
  "handoff_network": {
    "description": "Complete agent handoff network",
    "path": ["agent_handoff_to_agent+"]
  },
  "agent_guardrails": {
    "description": "All guardrails applied to an agent",
    "path": ["agent_has_guardrail"]
  }
}
```

### Cross-Domain Paths

```json
{
  "feature_governance": {
    "description": "All agents and tools governing a feature",
    "path": ["<-agent_manages_feature", "<-tool_operates_on_feature"]
  },
  "agent_responsibilities": {
    "description": "All milestones and features managed by an agent",
    "path": ["agent_manages_milestone", "agent_manages_feature"]
  }
}
```

## Query Examples

### Project Structure Queries

1. Get all features in a milestone:
```cypher
MATCH (m:Milestone {id: 'milestone-sdk-foundation'})-[:milestone_contains_phase]->
      (p:Phase)-[:phase_contains_module]->
      (mod:Module)-[:module_contains_feature]->(f:Feature)
RETURN f
```

2. Find features blocked by a specific feature:
```cypher
MATCH (f:Feature {id: 'feature-1001-sdk-config'})<-[:feature_depends_on]-(blocked:Feature)
WHERE blocked.status = 'blocked'
RETURN blocked
```

### Agent System Queries

1. Find all tools used by an agent:
```cypher
MATCH (a:Agent {id: 'agent-project-architect'})-[:agent_uses_tool]->(t:Tool)
RETURN t
```

2. Trace complete handoff path:
```cypher
MATCH path = (a1:Agent {id: 'agent-project-architect'})-[:agent_handoff_to_agent*]->(a2:Agent)
RETURN path
```

### Cross-Domain Queries

1. Find agents responsible for blocked features:
```cypher
MATCH (a:Agent)-[:agent_manages_feature]->(f:Feature)
WHERE f.status = 'blocked'
RETURN a, count(f) as blocked_features
ORDER BY blocked_features DESC
```

2. Find all tools operating on features in a specific milestone:
```cypher
MATCH (m:Milestone {id: 'milestone-sdk-foundation'})-[:milestone_contains_phase]->
      (p:Phase)-[:phase_contains_module]->
      (mod:Module)-[:module_contains_feature]->(f:Feature),
      (t:Tool)-[:tool_operates_on_feature]->(f)
RETURN t, count(f) as feature_count
```

## Implementation Notes

1. **Storage backend**: Neo4j is recommended for this knowledge graph schema due to its rich property graph model and high-performance graph traversals.

2. **Cache layer**: Redis should be used to cache frequently accessed paths and nodes to improve UI responsiveness.

3. **Updates**: All updates should be transactional to maintain consistency across the graph.

4. **Indexing**: Create indexes on all 'id' properties and commonly queried attributes like 'status'.

5. **Temporality**: Consider implementing temporal aspects to track the history of changes over time.

6. **Permissions**: Implement a fine-grained permission system at the node and relationship level for multi-user scenarios.