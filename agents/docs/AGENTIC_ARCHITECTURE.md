# Agentic Architecture: Feature Creation and Task Management

This document describes the integrated agentic architecture for feature management and task generation in the DevLoop system. The architecture combines multiple specialized agents to provide an intelligent, seamless workflow from feature creation to task management.

## Table of Contents

- [Overview](#overview)
- [Architecture Components](#architecture-components)
- [Agent Integration Flow](#agent-integration-flow)
- [API Integration](#api-integration)
- [UI Integration](#ui-integration)
- [Knowledge Graph as Source of Truth](#knowledge-graph-as-source-of-truth)
- [Common Workflows](#common-workflows)
- [Extending the Architecture](#extending-the-architecture)

## Overview

The DevLoop system implements an agentic architecture where specialized AI agents work together to streamline the software development process. This document focuses on two primary agents and their integration:

1. **Feature Creation Agent** - Analyzes feature descriptions and suggests optimal placement within the project structure
2. **Task Agent** - Generates and manages tasks for features based on AI analysis

Together, these agents provide an end-to-end workflow for feature management, from initial idea to actionable tasks, all connected through the Knowledge Graph as a single source of truth.

## Architecture Components

![Agentic Architecture](../docs/architecture/agentic_architecture.png)

### Core Components

1. **Feature Creation Agent**
   - Located at: `/agents/planning/feature_creation/core.py`
   - Responsible for analyzing feature descriptions
   - Suggests optimal project placement (milestone, phase, module)
   - Generates IDs and metadata for new features
   - Integrates with Knowledge Graph

2. **Task Agent**
   - Located at: `/agents/planning/task_agent/task_agent.py`
   - Generates tasks from feature requirements and user stories
   - Analyzes task dependencies
   - Manages task lifecycle (status tracking)
   - Provides completion statistics

3. **Knowledge Graph**
   - Central data store for all project components
   - Maintains relationships between features and tasks
   - Provides a single source of truth for project structure
   - Accessible via API at `/api/graph/`

4. **API Layer**
   - Feature Creation API: `/api/feature-creation`
   - Task API: `/api/agents/task_agent`
   - Graph API: `/api/graph`

5. **UI Services**
   - Feature Creation Service: `/ui/src/services/featureCreationService.js`
   - Task Agent Service: `/ui/src/services/taskAgentService.js`
   - Combined Feature Agent Service: `/ui/src/services/featureAgentService.js`
   - Roadmap Service: `/ui/src/services/roadmap/RoadmapService.js`

6. **UI Components**
   - Feature Creator: `/ui/src/components/FeatureCreator.jsx`
   - Task List View: `/ui/src/components/tasks/TaskListView.jsx`
   - Tasks Tab: `/ui/src/components/tasks/TasksTab.jsx`
   - Roadmap: `/ui/src/pages/Roadmap.jsx`

## Agent Integration Flow

The feature creation and task management workflow follows these steps:

1. **Feature Analysis and Creation**
   - User provides a feature description
   - Feature Creation Agent analyzes the description
   - Agent suggests appropriate placement in project structure
   - Feature is created in the Knowledge Graph

2. **Task Generation**
   - Task Agent analyzes the feature requirements and user stories
   - Agent generates appropriate tasks based on feature domain and purpose
   - Tasks are created in the Knowledge Graph and linked to the feature
   - Dependencies between tasks are established

3. **Task Management**
   - Users track and update task status through UI
   - Task Agent monitors task completion
   - Agent provides completion statistics for features
   - When all tasks are complete, feature is marked as ready for review

4. **Milestone Management**
   - Features are organized into milestones, phases, and modules
   - Tasks can be generated for all features in a milestone at once
   - Completion statistics are aggregated at each level

## API Integration

### Feature Creation API

```
POST /api/feature-creation/process
{
  "name": "Feature Name",
  "description": "Feature description...",
  "milestone": "milestone-id",  // Optional
  "phase": "phase-id",          // Optional
  "module": "module-id",        // Optional
  "tags": ["tag1", "tag2"]      // Optional
}
```

Response:
```json
{
  "success": true,
  "feature": {
    "id": "feature-1234-name",
    "name": "Feature Name",
    "description": "Feature description...",
    "suggestedMilestone": "milestone-id",
    "suggestedPhase": "phase-id",
    "suggestedModule": "module-id",
    "suggestedTags": ["tag1", "tag2"]
  }
}
```

### Task Agent API

```
POST /api/agents/task_agent/execute
{
  "operation": "process",
  "params": {
    "feature_id": "feature-1234-name",
    "use_llm": true
  }
}
```

Response:
```json
{
  "success": true,
  "message": "Created 8 tasks",
  "task_ids": ["task-1", "task-2", "task-3", "task-4", "task-5", "task-6", "task-7", "task-8"],
  "tasks": [...],
  "summary": "Task Agent has processed feature 'Feature Name' and created 8 tasks..."
}
```

### Batch Processing API

```
POST /api/agents/task_agent/execute
{
  "operation": "batch",
  "params": {
    "feature_ids": ["feature-1", "feature-2", "feature-3"],
    "use_llm": true
  }
}
```

## UI Integration

### Feature Creator Component

The Feature Creator component provides a user interface for creating new features with AI assistance. It integrates with both the Feature Creation Agent and Task Agent.

Key functionality:
- Form for entering feature details (name, description, etc.)
- AI-assisted feature creation with suggestions
- Option to automatically generate tasks for the feature
- Real-time feedback on AI analysis
- Success/failure messaging with task count information

### Tasks Tab Component

The Tasks Tab component displays tasks for a specific feature and allows for AI-powered task generation.

Key functionality:
- Display tasks for a feature with status indicators
- Progress tracking with completion percentage
- "Generate Tasks with AI" button for automatic task creation
- Task filtering and sorting
- Status updates for tasks

### Roadmap Component

The Roadmap component provides a hierarchical view of the project structure with milestones, phases, modules, and features. It includes the ability to generate tasks for all features in a milestone.

Key functionality:
- Display project structure from Knowledge Graph
- Progress tracking at all levels
- "Auto-Generate Tasks" button for milestones
- Task summary and status display

## Knowledge Graph as Source of Truth

The Knowledge Graph serves as the single source of truth for the entire system. It stores:

1. **Project Structure**
   - Milestones
   - Phases
   - Modules
   - Features
   - Tasks

2. **Relationships**
   - Milestone contains Phases
   - Phase contains Modules
   - Module contains Features
   - Feature has Tasks
   - Feature depends on Feature
   - Task depends on Task

3. **Metadata**
   - Status information
   - Priority levels
   - Domain classifications
   - Tags

All UI components and agents interact with the Knowledge Graph through the API layer, ensuring consistent data access and modification.

## Common Workflows

### 1. Creating a Feature with Tasks

1. User opens the Feature Creator
2. User enters feature name and description
3. Feature Creation Agent analyzes and suggests placement
4. User reviews and confirms feature details
5. If "Auto-generate tasks" is enabled, Task Agent generates tasks
6. Feature and tasks are created in Knowledge Graph
7. UI displays success message with task count

### 2. Generating Tasks for Existing Features

1. User navigates to a feature's Tasks Tab
2. User clicks "Generate Tasks with AI"
3. Task Agent analyzes feature details
4. Tasks are created in Knowledge Graph
5. UI updates to display new tasks

### 3. Batch Processing Features in a Milestone

1. User navigates to the Roadmap view
2. User expands a milestone
3. User clicks "Auto-Generate Tasks" on the milestone
4. Task Agent processes all features in the milestone
5. Tasks are created in Knowledge Graph
6. UI displays success message with feature and task counts

### 4. Tracking Feature Completion

1. Users update task statuses as work progresses
2. Task Agent monitors task completion
3. When all tasks are complete, feature is flagged as ready for review
4. Completion statistics are updated in the UI

## Extending the Architecture

The agentic architecture is designed to be extensible. New agents can be added to handle specialized tasks:

1. **Relationship Agent**
   - Analyzes relationships between features
   - Suggests dependencies and integration points
   - Works with both Feature Creation Agent and Task Agent

2. **Planning Agent**
   - Suggests optimal scheduling for features and tasks
   - Analyzes resource requirements
   - Makes recommendations for milestone planning

3. **Testing Agent**
   - Generates test cases from feature requirements
   - Analyzes test coverage
   - Suggests additional testing scenarios

4. **Documentation Agent**
   - Generates documentation from feature and task descriptions
   - Keeps documentation in sync with implementation
   - Suggests improvements to existing documentation

## Implementation Details

### Feature Agent Service

The Feature Agent Service (`featureAgentService.js`) provides a unified interface for both the Feature Creation Agent and Task Agent:

```javascript
// Create a feature and generate tasks in one operation
const result = await featureAgentService.createFeatureWithTasks(featureData, true);

// Analyze a feature to estimate tasks
const analysis = await featureAgentService.analyzeFeatureWithTaskEstimate(name, description);

// Process multiple features with task generation
const batchResult = await featureAgentService.processFeaturesWithTasks(featuresData);
```

### Task Agent Service

The Task Agent Service (`taskAgentService.js`) provides direct methods for task generation and management:

```javascript
// Generate tasks for a feature
const result = await taskAgentService.processFeatureWithAgent(featureId);

// Process multiple features
const batchResult = await taskAgentService.processBatchWithAgent(featureIds);

// Get tasks for a feature
const tasks = await taskAgentService.getFeatureTasksWithAgent(featureId);

// Update a task status
const updateResult = await taskAgentService.updateTaskWithAgent(taskId, status);
```

### Roadmap Service

The Roadmap Service (`RoadmapService.js`) extends the milestone view with task generation capabilities:

```javascript
// Generate tasks for all features in a milestone
const result = await roadmapService.processMilestoneFeatures(milestoneId);
```

---

This document provides a comprehensive overview of the agentic architecture for feature and task management in the DevLoop system. The integration of specialized agents, combined with the Knowledge Graph as a single source of truth, creates a powerful system for managing software development from high-level features to actionable tasks.