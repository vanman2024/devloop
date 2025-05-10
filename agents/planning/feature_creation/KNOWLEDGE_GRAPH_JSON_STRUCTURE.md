# Knowledge Graph JSON Structure

This document describes the JSON structure used for representing features in the knowledge graph.

## Feature Object Structure

When a feature is added to the knowledge graph, it has the following structure:

```json
{
  "id": "feature-7545-knowledge-graph-visualization",
  "type": "feature",
  "properties": {
    "name": "Knowledge Graph Visualization",
    "description": "Create a visualization component for the knowledge graph...",
    "status": "not-started",
    "tags": ["ui", "visualization", "knowledge-graph", "interactive", "dashboard"],
    "domain": "ui",
    "purpose": "new_feature",
    "created_at": "2025-05-07T23:18:19.147Z",
    "updated_at": "2025-05-07T23:18:19.147Z"
  },
  "metadata": {
    "created_by": "feature_creation_agent",
    "milestone": "milestone-ui-dashboard",
    "phase": "phase-04",
    "module": "feature-improvements"
  }
}
```

### Required Fields

| Field | Description | Type |
|-------|-------------|------|
| `id` | Unique identifier for the feature | String |
| `type` | Node type (always "feature" for features) | String |
| `properties` | Properties of the feature | Object |
| `metadata` | Metadata about the feature | Object |

### Properties

| Field | Description | Type |
|-------|-------------|------|
| `name` | Name of the feature | String |
| `description` | Description of the feature | String |
| `status` | Current status of the feature | String |
| `tags` | Tags associated with the feature | Array of Strings |
| `domain` | Domain the feature belongs to (ui, testing, data, api, agent) | String |
| `purpose` | Purpose of the feature (bugfix, enhancement, new_feature, refactoring) | String |
| `created_at` | Creation timestamp | ISO 8601 String |
| `updated_at` | Last update timestamp | ISO 8601 String |
| `priority` | Feature priority (high, medium, low) | String |
| `requirements` | Extracted requirements from description | Array of Strings |
| `user_stories` | User stories associated with the feature | Array of Strings |
| `effort_estimate` | Estimated effort to implement (high, medium, low) | String |
| `risk_level` | Risk level of implementation (high, medium, low) | String |
| `test_coverage` | Required test coverage percentage | Number |
| `version` | Target version for implementation | String |
| `stakeholders` | Teams or individuals interested in the feature | Array of Strings |

### Metadata

| Field | Description | Type |
|-------|-------------|------|
| `created_by` | Creator of the feature | String |
| `milestone` | Milestone the feature belongs to | String |
| `phase` | Phase the feature belongs to | String |
| `module` | Module the feature belongs to | String |

## Knowledge Graph Structure

The knowledge graph consists of nodes and edges:

### Nodes

Nodes represent entities in the system:

```json
{
  "nodes": {
    "feature-7545-knowledge-graph-visualization": { /* feature node */ },
    "milestone-ui-dashboard": { /* milestone node */ },
    "phase-04": { /* phase node */ },
    "feature-improvements": { /* module node */ },
    "concept-visualization": { /* concept node */ },
    "domain-ui": { /* domain node */ },
    "purpose-new_feature": { /* purpose node */ }
  }
}
```

#### Node Types

1. **Feature Nodes**: Represent individual features
2. **Milestone Nodes**: Represent high-level project milestones
3. **Phase Nodes**: Represent development phases within milestones
4. **Module Nodes**: Represent functional modules within phases
5. **Concept Nodes**: Represent concepts/tags associated with features
6. **Domain Nodes**: Represent feature domains (ui, testing, data, etc.)
7. **Purpose Nodes**: Represent feature purposes (bugfix, enhancement, etc.)

### Edges

Edges represent relationships between nodes:

```json
{
  "edges": [
    {
      "type": "module_contains_feature",
      "source": "feature-improvements",
      "target": "feature-7545-knowledge-graph-visualization",
      "properties": {},
      "metadata": {
        "created_by": "feature_creation_agent",
        "created_at": "2025-05-07T23:18:19.164Z"
      }
    },
    /* Other edges... */
  ]
}
```

#### Edge Types

1. **milestone_contains_phase**: Connects milestones to phases
2. **phase_contains_module**: Connects phases to modules
3. **module_contains_feature**: Connects modules to features
4. **feature_related_to_concept**: Connects features to concepts/tags
5. **feature_belongs_to_domain**: Connects features to their domain
6. **feature_has_purpose**: Connects features to their purpose
7. **feature_depends_on**: Connects features to their dependencies

## API-Feature Update JSON

When updating an existing feature through the API:

```json
{
  "id": "feature-7545-knowledge-graph-visualization",
  "name": "Knowledge Graph Visualization",
  "description": "Create a visualization component for the knowledge graph...",
  "milestone": "milestone-ui-dashboard",
  "phase": "phase-04",
  "module": "feature-improvements",
  "tags": ["ui", "visualization", "knowledge-graph", "interactive", "dashboard"],
  "domain": "ui",
  "purpose": "new_feature",
  "status": "in-progress",
  "dependencies": [
    {
      "id": "feature-2101",
      "name": "Dynamic UI Components",
      "type": "feature"
    }
  ]
}
```

## Feature Creation Request JSON

When creating a new feature through the API:

```json
{
  "name": "Knowledge Graph Visualization",
  "description": "Create a visualization component for the knowledge graph...",
  "projectId": "devloop-main",
  "tags": ["ui", "visualization", "knowledge-graph", "interactive"]
}
```

### Optional Fields for Creation

| Field | Description | Type |
|-------|-------------|------|
| `milestone` | Preferred milestone | String |
| `phase` | Preferred phase | String |
| `module` | Preferred module | String |
| `confirmed` | Whether to update the knowledge graph | Boolean |

## Feature Creation Response JSON

Response from the feature creation API:

```json
{
  "success": true,
  "feature": {
    "id": "feature-7545-knowledge-graph-visualization",
    "name": "Knowledge Graph Visualization",
    "description": "Create a visualization component for the knowledge graph...",
    "suggestedMilestone": "milestone-ui-dashboard",
    "suggestedPhase": "phase-04",
    "suggestedModule": "feature-improvements",
    "suggestedTags": ["ui", "visualization", "knowledge-graph", "interactive", "dashboard"],
    "potentialDependencies": [
      {
        "id": "feature-2101",
        "name": "Dynamic UI Components",
        "type": "feature"
      }
    ],
    "analysisDetails": {
      "concepts": ["visualization", "knowledge-graph", "interactive", "component"],
      "domain": "ui",
      "purpose": "new_feature",
      "confidence": 0.85
    }
  }
}
```

## Additional Feature Fields in MongoDB

When stored in MongoDB, features have additional fields:

```json
{
  "_id": "feature-7545-knowledge-graph-visualization",
  "name": "Knowledge Graph Visualization",
  "description": "Create a visualization component for the knowledge graph...",
  "milestone": "milestone-ui-dashboard",
  "phase": "phase-04", 
  "module": "feature-improvements",
  "tags": ["ui", "visualization", "knowledge-graph", "interactive", "dashboard"],
  "domain": "ui",
  "purpose": "new_feature",
  "status": "not-started",
  "dependencies": [
    {
      "id": "feature-2101",
      "name": "Dynamic UI Components",
      "type": "feature"
    }
  ],
  "created_at": "2025-05-07T23:18:19.147Z",
  "updated_at": "2025-05-07T23:18:19.147Z",
  "created_by": "feature_creation_agent",
  "extracted_requirements": [
    "Display nodes and relationships", 
    "Interactive exploration",
    "Filtering by node types", 
    "Search functionality"
  ]
}
```

## Missing Fields and Enhancements

Based on the current implementation, the following fields could be added to enrich the knowledge graph:

1. **Extracted Requirements**: Breaking down the feature description into individual requirements
2. **User Stories**: User-focused requirements in the format "As a [role], I want [goal], so that [benefit]"
3. **Effort Estimate**: Estimated time or complexity to implement
4. **Priority**: Feature priority (high, medium, low)
5. **Risk Level**: Potential risks associated with implementation
6. **Test Coverage**: Required test coverage percentage
7. **Version**: Target version for implementation
8. **Stakeholders**: Individuals interested in this feature

```json
{
  "properties": {
    /* existing properties */
    "requirements": [
      "Display nodes and relationships", 
      "Interactive exploration",
      "Filtering by node types",
      "Search functionality"
    ],
    "user_stories": [
      "As a developer, I want to visualize the knowledge graph, so that I can understand relationships between components",
      "As a user, I want to filter nodes by type, so that I can focus on specific aspects of the system"
    ],
    "effort_estimate": "medium",
    "priority": "high",
    "risk_level": "low",
    "test_coverage": 80,
    "version": "1.2.0",
    "stakeholders": ["ui-team", "knowledge-team"]
  }
}
```

These additional fields would provide more context and richness to the knowledge graph, enabling better planning, prioritization, and dependency management.