# Project Architect Agent

## Purpose

The Project Architect Agent is responsible for designing and maintaining the high-level structure of projects. It creates milestones, phases, and modules, ensuring logical organization and balanced workload distribution.

## Pattern

This agent follows the **Manager** pattern, coordinating with other planning agents like the Detail Agent and Relationship Agent to create a comprehensive project structure.

## Capabilities

- Create and modify project milestones
- Design logical phase structure
- Organize modules within phases
- Balance workload across project components
- Identify structural issues and propose improvements
- Apply best practices for project organization

## Tools

| Tool Name | Purpose | Input | Output |
|-----------|---------|-------|--------|
| `StructureGenerator` | Creates project structure components | Structure specification | Created structure components |
| `DependencyAnalyzer` | Identifies dependencies between components | Component list | Dependency mapping |
| `BalanceOptimizer` | Optimizes workload distribution | Current structure | Balanced structure |
| `TemplateLibrary` | Accesses project structure templates | Template type | Template content |
| `StructureValidator` | Validates structural integrity | Project structure | Validation report |

## Agent Definition

```json
{
  "id": "agent-project-architect",
  "name": "Project Architect Agent",
  "description": "Designs and maintains project structure with milestones, phases, and modules",
  "version": "1.0.0",
  "type": "manager",
  "model": "gpt-4o",
  "tools": [
    "tool-structure-generator",
    "tool-dependency-analyzer",
    "tool-balance-optimizer",
    "tool-template-library",
    "tool-structure-validator"
  ],
  "permissions": [
    "create_milestone",
    "modify_milestone",
    "create_phase",
    "modify_phase",
    "create_module",
    "modify_module",
    "read_features"
  ],
  "instructions": "You are a Project Architect Agent responsible for designing and maintaining well-structured projects. You create milestones, phases, and modules with logical organization and balanced workload distribution. Ensure all structural elements follow naming conventions and best practices. Coordinate with Detail Agents and Relationship Agents to build comprehensive project structures. When asked to create or modify project structures, analyze requirements carefully and apply appropriate patterns from your template library. Always validate structural integrity after making changes."
}
```

## Handoffs

| Target Agent | Handoff Type | Trigger Condition | Data Passed |
|--------------|--------------|-------------------|-------------|
| Detail Agent | Sequential | Structure creation complete | New structure components |
| Relationship Agent | Sequential | Structure modification complete | Modified components |
| UI Orchestration Agent | Parallel | Structure changes | Updated structure view |
| Validation Agent | Conditional | Structure changes require validation | Structure to validate |

## Interaction Example

```
User requests new project structure
↓
UI Orchestration Agent passes request to Project Architect Agent
↓
Project Architect Agent:
1. Uses TemplateLibrary to find suitable project patterns
2. Uses StructureGenerator to create milestone, phases, modules
3. Uses BalanceOptimizer to ensure even workload distribution
4. Uses StructureValidator to check structural integrity
↓
Project Architect Agent handoff to Detail Agent for feature creation
↓
Project Architect Agent handoff to UI Orchestration Agent for UI update
```

## Knowledge Graph Integration

The Project Architect Agent is registered in the knowledge graph with:

- Relationships to tools it can use
- Connections to other planning agents
- Authority over milestone, phase, and module nodes
- Constraints from applicable guardrails

## Implementation Notes

- The agent should use a consistent naming convention for all structural elements
- Balance quality vs. speed based on request urgency
- Consider dependencies when modifying existing structures
- Maintain audit trail of structural changes
- Cache frequently used templates for performance

## Development Status

- [x] Agent specification
- [x] Tool definitions
- [ ] Permission configuration
- [ ] Integration with knowledge graph
- [ ] Implementation and testing