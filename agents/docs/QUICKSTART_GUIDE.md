# Agentic Architecture Quick Start Guide

This guide provides step-by-step instructions for using the integrated Feature Creation and Task Management system in DevLoop.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Creating a Feature with Tasks](#creating-a-feature-with-tasks)
- [Generating Tasks for Existing Features](#generating-tasks-for-existing-features)
- [Generating Tasks for an Entire Milestone](#generating-tasks-for-an-entire-milestone)
- [Managing Tasks](#managing-tasks)
- [Tracking Progress](#tracking-progress)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure:

1. The DevLoop system is running:
   ```bash
   cd /mnt/c/Users/angel/devloop
   ./launch-server.sh
   ```

2. The Knowledge Graph API is running:
   ```bash
   cd /mnt/c/Users/angel/devloop/backups/system-core-backup/system-core/memory/manager
   ./launch-memory-api.sh
   ```

3. The UI is running:
   ```bash
   cd /mnt/c/Users/angel/devloop/ui
   ./start.sh
   ```

## Creating a Feature with Tasks

### Step 1: Open the Feature Creator

1. Navigate to the DevLoop UI (typically http://localhost:3000)
2. Click on "Feature Manager" in the sidebar
3. Click the "Create Feature" button

### Step 2: Enter Feature Details

1. Fill in the required fields:
   - **Name**: A concise title for your feature
   - **Description**: Detailed description of what the feature does 
   - **Milestone**: Select an appropriate milestone (or let AI suggest one)
   - **Phase**: Select a development phase (or let AI suggest one)
   - **Module**: Select a module (or let AI suggest one)

2. Add any relevant tags

3. **Important**: Ensure "Auto-generate tasks with AI" is checked (enabled by default)

### Step 3: Submit and Review

1. Click "Create Feature" to submit
2. Review the success message showing:
   - Feature ID
   - Number of tasks generated
   - Next steps

### Step 4: Explore Generated Tasks

1. Click "View Tasks" in the success message (or navigate to the feature and select the Tasks tab)
2. Review the auto-generated tasks, which typically include:
   - Design tasks
   - Implementation tasks
   - Testing tasks
   - Documentation tasks

## Generating Tasks for Existing Features

### Step 1: Navigate to the Feature

1. Go to "Feature Manager" in the sidebar
2. Find and select the feature you want to generate tasks for
3. Click to open the feature details

### Step 2: Generate Tasks

1. Navigate to the "Tasks" tab
2. If no tasks exist, you'll see a "Generate Tasks with AI" button
3. Click the button to start the generation process
4. Wait for the process to complete (typically a few seconds)

### Step 3: Review Generated Tasks

1. Once generation is complete, review the tasks
2. Click "Show AI Thoughts" to see the reasoning behind task generation (if available)
3. Tasks are automatically organized in a logical implementation order

## Generating Tasks for an Entire Milestone

### Step 1: Navigate to the Roadmap

1. Click "Roadmap" in the sidebar
2. Find the milestone you want to generate tasks for

### Step 2: Generate Tasks for All Features

1. Click the "Auto-Generate Tasks" button on the milestone card
2. Confirm the action in the dialog that appears
3. Wait for the process to complete (this may take longer depending on the number of features)

### Step 3: Review Results

1. Once complete, you'll see a summary showing:
   - Number of features processed
   - Total tasks generated
   - Any features that failed processing
2. Click "View Details" for more information
3. Navigate to individual features to see their tasks

## Managing Tasks

### Updating Task Status

1. Find the task you want to update in any task view
2. Click the status button to cycle through statuses:
   - Not Started → In Progress → Completed
   - Or use the dropdown menu for more options, including "Blocked"
3. Add a comment if needed to explain the status change

### Adding Task Details

1. Click on a task to open its details
2. Add or update:
   - Description
   - Notes
   - Attachments
   - Dependencies
3. Click "Save" to update the task

### Filtering and Sorting Tasks

1. Use the filter dropdown to show tasks by status:
   - Not Started
   - In Progress
   - Completed
   - Blocked
2. Use the sort dropdown to sort by:
   - Priority
   - Status
   - Creation date
   - Due date

## Tracking Progress

### Feature Level Progress

1. Navigate to a feature
2. View the progress bar showing:
   - Percentage of tasks completed
   - Number of tasks in each status
3. Use the Tasks tab to see a detailed breakdown

### Milestone Level Progress

1. Navigate to the Roadmap
2. Each milestone shows:
   - Overall completion percentage
   - Phase-by-phase breakdown
   - Feature count and status
3. Click on a milestone to expand and see features

### System-wide Task Management

1. Go to "Tasks" in the sidebar
2. This shows all tasks across the system
3. Use filters to narrow down:
   - By milestone
   - By feature
   - By status
   - By assignee
4. Use this view for daily task planning

## Troubleshooting

### Task Generation Failed

If task generation fails:

1. Check if the Task Agent is running:
   ```bash
   cd /mnt/c/Users/angel/devloop/agents/planning/task_agent
   python3 task_agent.py status
   ```

2. Manually trigger task generation:
   ```bash
   python3 task_agent.py process feature-id-here
   ```

3. Check the logs:
   ```bash
   tail -f /mnt/c/Users/angel/devloop/logs/task_agent.log
   ```

### Tasks Not Showing Up

If tasks are generated but not visible:

1. Verify the Knowledge Graph connection:
   ```bash
   curl http://localhost:8000/api/graph/feature/feature-id-here/tasks
   ```

2. Refresh the UI page
3. Check browser console for errors
4. Verify that task IDs have been properly created in the Knowledge Graph

### Progress Not Updating

If progress indicators aren't updating:

1. Make sure you've updated task status correctly
2. Check if tasks are properly linked to the feature
3. Refresh the page to get the latest data
4. Verify that the Knowledge Graph has the updated task status

## Common Commands

### Check Task Agent Status
```bash
cd /mnt/c/Users/angel/devloop/agents/planning/task_agent
python3 task_agent.py status
```

### Process a Feature with the Task Agent
```bash
python3 task_agent.py process feature-1234-example
```

### Process Multiple Features
```bash
python3 task_agent.py batch feature-1234-example feature-5678-example
```

### Get Tasks for a Feature
```bash
python3 task_agent.py get feature-1234-example
```

### Update Task Status
```bash
python3 task_agent.py update task-1234 completed
```

---

This quick start guide covers the essential operations for using the integrated Feature Creation and Task Management system in DevLoop. For more detailed information, see the full documentation in the `/agents/docs/` directory.