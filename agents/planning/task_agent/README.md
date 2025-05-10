# Task Agent

The Task Agent is an AI-powered agent responsible for breaking down features into concrete tasks and managing their lifecycle. It uses LLM capabilities to analyze feature descriptions, requirements, and user stories to create actionable tasks with appropriate metadata.

## Features

- LLM-powered task extraction from feature descriptions
- Automatic task dependencies analysis
- Domain-specific task templates
- Agent memory for consistent decision-making
- Handoff capabilities to other agents
- Task completion tracking and notifications
- Fallback mechanisms for reliability

## Directory Structure

```
task_agent/
├── README.md                # This file
├── task_agent.md            # Agent specification
├── task_agent.py            # Main agent implementation
├── task_service.py          # Task management service
└── templates/               # Template files
    └── task_templates.json  # Domain-specific task templates
```

## Installation

The Task Agent is part of the Devloop agent ecosystem and uses the Knowledge Graph for data storage. Ensure you have the following dependencies:

- Python 3.8+
- Knowledge Graph integration
- LLM connector

### Environment Setup

To properly set up the environment for the Task Agent:

1. Activate the development environment:

```bash
cd /mnt/c/Users/angel/Devloop
source ./activate-env.sh
```

2. Run the Task Agent with the provided script:

```bash
./run-task-agent.sh --feature "feature-1001"
```

3. Run the integration test to verify everything is working:

```bash
./run-task-agent.sh --test
```

For more details on setting up your development environment, see the SETUP.md file.

## Usage

### Command Line Interface

The Task Agent provides a command-line interface for task management:

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

# Run as an agent service
python -m agents.planning.task_agent.task_agent service
```

### Python API

You can also use the Task Agent programmatically:

```python
from agents.planning.task_agent.task_agent import TaskAgent

# Initialize the agent
agent = TaskAgent()

# Process a feature to generate tasks
result = agent.process_feature("feature-1001")

# Get tasks for a feature
tasks = agent.get_feature_tasks("feature-1001")

# Update a task's status
agent.update_task("task-1001-001", "in-progress")
```

## Integration with Feature Creation Agent

The Task Agent integrates with the Feature Creation Agent through the Knowledge Graph:

1. Feature Creation Agent creates a feature with enhanced properties
2. Task Agent receives the feature ID via direct call or agent message
3. Task Agent retrieves feature details from the Knowledge Graph
4. LLM analyzes the feature to extract well-defined tasks
5. Tasks are added to the Knowledge Graph with "feature_has_task" relationships
6. Task Agent hands off to Relationship Agent for dependency analysis

## Extending the Task Agent

### Adding Domain-Specific Templates

You can add new domain-specific templates by editing the `templates/task_templates.json` file:

```json
{
  "new_domain": [
    "Task template 1",
    "Task template 2",
    "Task template 3"
  ]
}
```

### Customizing LLM Prompts

You can modify the prompts used for task extraction by updating the `_extract_tasks_with_llm` method in `task_agent.py`.

## Task Schema

Tasks created by the agent follow this schema:

```json
{
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
```

## Agent Communication

The Task Agent can communicate with other agents through messages:

```json
{
  "sender": "task_agent",
  "recipient": "relationship_agent",
  "message_type": "handoff",
  "content": {
    "action": "analyze_dependencies",
    "feature_id": "feature-1001",
    "feature_name": "Knowledge Graph Visualization",
    "task_count": 5,
    "tasks": [
      {"id": "task-1001-001", "name": "Design visualization component"},
      {"id": "task-1001-002", "name": "Implement force-directed graph"}
    ],
    "requires_response": true
  }
}
```

## Future Enhancements

- Task dependencies visualization in UI
- Automated task estimation using historical data
- Multi-agent collaboration for cross-feature dependencies
- Integration with project management tools
- Advanced LLM-based task planning with context from codebase