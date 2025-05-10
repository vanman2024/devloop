# Relationship Agent

## Purpose

The Relationship Agent is responsible for managing relationships between components in the project structure. It identifies, creates, and validates dependencies between features, modules, and other project elements, ensuring a coherent and consistent project graph.

## Pattern

This agent follows the **Single** pattern with specialized tools for relationship management and knowledge graph operations.

## Capabilities

- Identify dependencies between features
- Create and validate relationships in the knowledge graph
- Detect and resolve circular dependencies
- Generate dependency visualizations
- Analyze impact of changes across the project
- Recommend refactoring to improve component relationships
- Maintain relationship metadata

## Tools

| Tool Name | Purpose | Input | Output |
|-----------|---------|-------|--------|
| `GraphQueryEngine` | Query the knowledge graph | Query parameters | Query results |
| `RelationshipCreator` | Create relationships in the graph | Source, target, relationship type | Created relationship |
| `DependencyAnalyzer` | Analyze dependencies between components | Component ID or list | Dependency analysis |
| `CircularDetector` | Detect circular dependencies | Component ID | Circular dependency report |
| `ImpactAnalyzer` | Analyze impact of changes | Component ID, change type | Impact analysis report |

## Agent Definition

```json
{
  "id": "agent-relationship",
  "name": "Relationship Agent",
  "description": "Manages relationships between components in the project structure",
  "version": "1.0.0",
  "type": "single",
  "model": "gpt-4o",
  "tools": [
    "tool-graph-query-engine",
    "tool-relationship-creator",
    "tool-dependency-analyzer",
    "tool-circular-detector",
    "tool-impact-analyzer"
  ],
  "permissions": [
    "read_knowledge_graph",
    "write_knowledge_graph",
    "read_milestone",
    "read_phase",
    "read_module",
    "read_feature",
    "modify_relationship"
  ],
  "instructions": "You are a Relationship Agent responsible for managing connections between project components. Your primary task is to identify, create, and validate relationships in the knowledge graph. When examining features, identify dependencies, detect circular references, and analyze the impact of changes. Create and maintain relationships in the knowledge graph with appropriate metadata. Generate visualizations to help understand complex dependency networks. Recommend refactoring when relationship structures become problematic. Always ensure that the knowledge graph maintains a coherent and accurate representation of project relationships."
}
```

## Handoffs

| Target Agent | Handoff Type | Trigger Condition | Data Passed |
|--------------|--------------|-------------------|-------------|
| Project Architect Agent | Conditional | Structural changes needed | Relationship analysis requiring structural changes |
| Detail Agent | Conditional | Feature details needed | Relationship context requiring more feature details |
| UI Orchestration Agent | Parallel | Relationship updates | Updated relationship data for UI |
| Validation Agent | Sequential | Relationship validation needed | Relationships to validate |

## Interaction Example

```
Detail Agent completes feature detailing
↓
Detail Agent hands off to Relationship Agent
↓
Relationship Agent:
1. Uses DependencyAnalyzer to identify dependencies between features
2. Uses GraphQueryEngine to query the knowledge graph
3. Uses RelationshipCreator to create relationships in the graph
4. Uses CircularDetector to check for circular dependencies
5. Uses ImpactAnalyzer to assess change impact
↓
Relationship Agent hands off to UI Orchestration Agent for UI update
↓
Relationship Agent hands off to Validation Agent for validation
```

## Knowledge Graph Integration

The Relationship Agent is registered in the knowledge graph with:

- Relationships to tools it can use
- Permissions to read and write to the knowledge graph
- Connections to Project Architect, Detail, and Validation agents
- Specific responsibilities for relationship management

## Implementation Notes

- The agent should prioritize correctness over speed
- Use knowledge graph traversal for complex relationship analysis
- Maintain bidirectional relationships where appropriate
- Document relationship rationale in metadata
- Handle large dependency networks efficiently

## Development Status

- [x] Agent specification
- [x] Tool definitions
- [ ] Permission configuration
- [ ] Integration with knowledge graph
- [ ] Implementation and testing