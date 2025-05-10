# Task Agent

## Purpose
The Task Agent is an AI-powered agent responsible for creating, managing, and tracking tasks that implement features defined in the Devloop Knowledge Graph. It uses LLM capabilities to intelligently break down features into actionable tasks, analyze dependencies, and manage the task lifecycle.

## Responsibilities
1. Break down features into concrete tasks using AI analysis
2. Extract tasks from feature requirements and user stories
3. Assign appropriate metadata to tasks (priority, complexity, estimated hours)
4. Determine task dependencies and sequencing
5. Create feature-task relationships in the knowledge graph
6. Update task status and track progress
7. Communicate with other agents through handoffs
8. Generate summaries and metrics for feature implementation

## Integration Points
- **Feature Creation Agent**: Receives new features and creates tasks for them
- **Relationship Agent**: Handoff for dependency mapping and analysis
- **Knowledge Graph**: Stores tasks as nodes with "feature_has_task" relationships
- **UI Components**: Provides task tracking and management UI
- **LLM Services**: Uses AI to extract tasks and analyze feature requirements

## AI Capabilities
The Task Agent leverages AI in multiple ways:
1. **Task Extraction**: Uses LLM to analyze feature descriptions, requirements, and user stories to identify necessary tasks
2. **Task Structuring**: Groups tasks by type (design, implementation, testing, documentation)
3. **Dependency Analysis**: Determines logical task dependencies and sequencing
4. **Estimation Assistance**: Suggests priorities and complexity based on feature attributes
5. **Agent Memory**: Maintains memory of previously processed features and tasks
6. **Thought Process**: Records agent reasoning and decision-making process

## Implementation Pattern
The Task Agent follows the Single agent pattern with specialized tools for task management, enhanced with:
- Agent memory for consistent decision-making
- LLM integration for intelligent task generation
- Agent communication for handoffs and notifications
- Fallback mechanisms for reliability

## Schema
```json
{
  "task": {
    "id": "task-1001-001",
    "name": "Implement data model for feature X",
    "description": "Create the database schema and model classes for feature X",
    "status": "not-started",
    "priority": "high",
    "complexity": "medium",
    "estimated_hours": 4,
    "depends_on": ["task-1001-000"],
    "feature_id": "feature-1001"
  }
}
```

## Agent Memory
The Task Agent maintains memory of:
1. **Processed Features**: Record of features that have been analyzed and broken down
2. **Task History**: History of task status changes over time
3. **Agent Thoughts**: Record of agent reasoning and decision-making

## LLM Prompting
The agent uses structured prompts for task extraction:
```
You are a task planning expert. Given a feature description, extract well-defined tasks
that would be needed to implement this feature. Focus on creating practical, 
actionable tasks with clear scope.

Feature Information:
- Name: {feature_name}
- Description: {feature_description}
- Domain: {domain}
- Purpose: {purpose}

Requirements:
{requirements}

User Stories:
{user_stories}

Based on this information, please generate a list of tasks needed to implement this feature.
For each task, provide:
- A clear name (task title)
- A detailed description
- Appropriate priority (high, medium, low)
- Complexity estimate (high, medium, low)
- Estimated hours to complete
```

## API
- `process_feature(feature_id, use_llm)`: Process a feature to generate tasks with AI assistance
- `process_feature_batch(feature_ids, use_llm)`: Process multiple features
- `update_task(task_id, status)`: Update a task's status
- `get_feature_tasks(feature_id)`: Get tasks for a feature with statistics
- `handle_agent_message(message_data)`: Handle incoming messages from other agents

## Workflow
1. Feature Creation Agent creates a new feature with requirements and user stories
2. Task Agent receives the feature ID (via direct call or agent message)
3. Task Agent retrieves feature details from the knowledge graph
4. LLM analyzes the feature to extract well-defined tasks
5. Tasks are analyzed for dependencies and logical sequencing
6. Tasks are added to the knowledge graph with "feature_has_task" relationships
7. Task Agent hands off to Relationship Agent for deeper dependency analysis
8. UI components display tasks with their metadata, status, and dependencies
9. As work progresses, task status is updated in the knowledge graph
10. When all tasks are complete, the Task Agent notifies other agents

## Agent Communication
The Task Agent communicates with other agents through:
1. **Handoffs**: Structured messages to transfer work to other agents
2. **Notifications**: Status updates about feature completion
3. **Requests**: Receiving task creation requests from other agents

Example handoff to Relationship Agent:
```json
{
  "sender": "task_agent",
  "recipient": "relationship_agent",
  "message_type": "handoff",
  "content": {
    "action": "analyze_dependencies",
    "feature_id": "feature-1001",
    "feature_name": "Knowledge Graph Visualization",
    "feature_domain": "ui",
    "feature_purpose": "new_feature",
    "task_count": 5,
    "tasks": [
      {"id": "task-1001-001", "name": "Design visualization component"},
      {"id": "task-1001-002", "name": "Implement force-directed graph"},
      {"id": "task-1001-003", "name": "Add interactive controls"}
    ],
    "requires_response": true,
    "timestamp": "2025-05-08T12:34:56.789Z"
  }
}
```

## Command Line Usage
The Task Agent can be used from the command line with enhanced options:

```bash
# Process a feature to generate tasks with LLM
python -m agents.planning.task_agent.task_agent process feature-1001

# Process a feature without using LLM (template-based)
python -m agents.planning.task_agent.task_agent process feature-1001 --no-llm

# Process multiple features
python -m agents.planning.task_agent.task_agent batch feature-1001 feature-1002

# Update a task's status
python -m agents.planning.task_agent.task_agent update task-1001-001 in-progress

# Get tasks for a feature
python -m agents.planning.task_agent.task_agent get feature-1001

# Handle a message from another agent
python -m agents.planning.task_agent.task_agent message message.json

# Run as an agent service listening for messages
python -m agents.planning.task_agent.task_agent service --port 5000
```

## Knowledge Graph Integration
The Task Agent integrates with the knowledge graph through:
1. "task" node type with properties for name, description, status, etc.
2. "feature_has_task" edge type connecting features to tasks
3. Task metadata stored in the knowledge graph node
4. Task dependencies modeled as properties on task nodes

## Templates for Domain-Specific Tasks
The Task Agent includes templates for common task patterns by domain:
- **UI**: Design, implement, style, connect to data, add error handling, test, document
- **API**: Define endpoints, implement routes, validate requests, implement business logic, etc.
- **Data**: Design schema, implement models, create migrations, implement queries, etc.

When LLM extraction fails, the agent falls back to these templates for reliability.

## Future Enhancements
- Task dependencies visualization in UI
- Automated task estimation using historical data
- Multi-agent collaboration for cross-feature dependencies
- Integration with project management tools
- Developer assignment and tracking
- Advanced LLM-based task planning with context from codebase
- Task prioritization based on critical path analysis