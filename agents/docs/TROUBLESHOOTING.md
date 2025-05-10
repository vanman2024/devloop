# Troubleshooting the Agentic Architecture

This guide helps diagnose and resolve common issues with the Feature Creation and Task Management system in DevLoop.

## Table of Contents

- [Agent Availability Issues](#agent-availability-issues)
- [Task Generation Problems](#task-generation-problems)
- [Knowledge Graph Connection Issues](#knowledge-graph-connection-issues)
- [UI Integration Problems](#ui-integration-problems)
- [Performance Issues](#performance-issues)
- [Error Messages](#error-messages)
- [Common Fixes](#common-fixes)

## Agent Availability Issues

### Symptoms
- "Task generation is not available" message
- Feature creation works but no tasks are generated
- Agent-specific buttons are missing from the UI

### Diagnostic Steps

1. **Check if Task Agent is running**:
   ```bash
   cd /mnt/c/Users/angel/devloop/agents/planning/task_agent
   python3 task_agent.py status
   ```
   Expected output: "Task Agent is running and available"

2. **Verify agent API accessibility**:
   ```bash
   curl -X POST http://localhost:8000/api/agents/task_agent/execute \
     -H "Content-Type: application/json" \
     -d '{"operation": "status"}'
   ```
   Expected output: JSON response with `{"success": true, "status": "available"}`

3. **Check agent logs**:
   ```bash
   tail -f /mnt/c/Users/angel/devloop/logs/task_agent.log
   ```
   Look for error messages or exceptions

### Fixes

1. **Start Task Agent explicitly**:
   ```bash
   cd /mnt/c/Users/angel/devloop/agents/planning/task_agent
   python3 task_agent.py service
   ```

2. **Restart API server**:
   ```bash
   cd /mnt/c/Users/angel/devloop
   ./launch-api-server.sh
   ```

3. **Set up agent service to auto-start**:
   Add the following to your launch script:
   ```bash
   echo "Starting Task Agent..."
   cd /mnt/c/Users/angel/devloop/agents/planning/task_agent
   python3 task_agent.py service --port 5001 &
   echo $! > /mnt/c/Users/angel/devloop/task_agent.pid
   ```

## Task Generation Problems

### Symptoms
- Tasks aren't being generated when requested
- Empty task list despite successful feature creation
- Error message when clicking "Generate Tasks with AI"

### Diagnostic Steps

1. **Try manual task generation**:
   ```bash
   cd /mnt/c/Users/angel/devloop/agents/planning/task_agent
   python3 task_agent.py process feature-id-here
   ```
   Check the output for success or errors

2. **Verify feature exists in Knowledge Graph**:
   ```bash
   curl http://localhost:8000/api/graph/node/feature-id-here
   ```
   Ensure the feature exists and has required properties

3. **Check dependencies**:
   Verify that all necessary dependencies are installed:
   ```bash
   pip install -r requirements.txt
   ```

### Fixes

1. **Fix feature data**:
   If the feature lacks necessary data (like requirements or description):
   ```bash
   curl -X PUT http://localhost:8000/api/graph/node/feature-id-here \
     -H "Content-Type: application/json" \
     -d '{"properties": {"description": "Detailed description", "requirements": ["Req 1", "Req 2"]}}'
   ```

2. **Add fallback requirements**:
   If the feature has no requirements, the task generation might fail. Add some default requirements:
   ```bash
   curl -X PUT http://localhost:8000/api/graph/node/feature-id-here \
     -H "Content-Type: application/json" \
     -d '{"properties": {"requirements": ["Implement core functionality", "Ensure responsive design", "Add error handling"]}}'
   ```

3. **Force simple task generation**:
   Sometimes the AI-powered task generation might fail. Force simple template-based generation:
   ```bash
   cd /mnt/c/Users/angel/devloop/agents/planning/task_agent
   python3 task_agent.py process feature-id-here --no-llm
   ```

## Knowledge Graph Connection Issues

### Symptoms
- "Failed to connect to Knowledge Graph" error
- Features or tasks don't persist
- Can't retrieve existing features or tasks

### Diagnostic Steps

1. **Check if Knowledge Graph server is running**:
   ```bash
   curl http://localhost:8000/api/graph/status
   ```
   Expected output: `{"status": "OK"}`

2. **Verify Knowledge Graph accessibility**:
   ```bash
   curl http://localhost:8000/api/graph/nodes?type=feature&limit=1
   ```
   Should return at least one feature if any exist

3. **Check Knowledge Graph logs**:
   ```bash
   tail -f /mnt/c/Users/angel/devloop/logs/knowledge_graph.log
   ```

### Fixes

1. **Start Knowledge Graph service**:
   ```bash
   cd /mnt/c/Users/angel/devloop/backups/system-core-backup/system-core/memory/manager
   ./launch-memory-api.sh
   ```

2. **Reset Knowledge Graph connection**:
   ```bash
   ./stop-memory-api.sh
   # Wait a few seconds
   ./launch-memory-api.sh
   ```

3. **Use the backup Knowledge Graph**:
   ```bash
   cp /mnt/c/Users/angel/devloop/backups/knowledge_graph_backups/knowledge_graph_backup_recent/sdk_knowledge_graph.json /mnt/c/Users/angel/devloop/backups/system-core-backup/system-core/memory/knowledge_graph.json
   ```

## UI Integration Problems

### Symptoms
- Feature creation works, but no tasks appear
- Task generation buttons are missing
- Feature appears but the Tasks tab is empty

### Diagnostic Steps

1. **Check browser console for errors**:
   Open the browser's developer tools (F12) and look for errors in the Console tab

2. **Verify API responses directly**:
   ```bash
   curl http://localhost:8000/api/graph/feature/feature-id-here/tasks
   ```
   Should return a list of tasks associated with the feature

3. **Verify TaskAgentService is being loaded**:
   Check the network tab in browser dev tools for requests to the task agent API

### Fixes

1. **Clear browser cache**:
   Press Ctrl+F5 to force-refresh the page with a cache clear

2. **Restart UI server**:
   ```bash
   cd /mnt/c/Users/angel/devloop/ui
   ./start.sh
   ```

3. **Check file paths in imports**:
   Ensure the paths in import statements match the actual file structure:
   ```javascript
   // Should be:
   import { processFeatureWithAgent } from '../services/taskAgentService';
   // Not:
   import { processFeatureWithAgent } from './services/taskAgentService';
   ```

## Performance Issues

### Symptoms
- Task generation takes a very long time
- UI becomes unresponsive during agent operations
- Timeouts during agent API calls

### Diagnostic Steps

1. **Check server resources**:
   ```bash
   top
   ```
   Look for processes using excessive CPU or memory

2. **Check API response times**:
   ```bash
   time curl http://localhost:8000/api/agents/task_agent/execute \
     -H "Content-Type: application/json" \
     -d '{"operation": "status"}'
   ```
   Should complete in under a second

3. **Check Knowledge Graph size**:
   ```bash
   ls -lh /mnt/c/Users/angel/devloop/backups/system-core-backup/system-core/memory/knowledge_graph.json
   ```
   If over 10MB, it might be causing performance issues

### Fixes

1. **Increase timeouts in API calls**:
   Edit `/mnt/c/Users/angel/devloop/ui/src/services/taskAgentService.js` to increase the timeout:
   ```javascript
   // Add timeout to fetch calls
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
   
   const response = await fetch(url, {
     // ... other options
     signal: controller.signal
   });
   
   clearTimeout(timeoutId);
   ```

2. **Use batch processing for multiple features**:
   Instead of processing features one by one, use batch processing:
   ```javascript
   const result = await processBatchWithAgent(featureIds);
   ```

3. **Enable task template fallback**:
   If AI task generation is too slow, modify task_agent.py to use template-based generation by default:
   ```python
   # In task_agent.py
   self.config["fallback_to_templates"] = True
   self.config["use_llm_by_default"] = False
   ```

## Error Messages

### "Failed to connect to Task Agent API"

This usually means the Task Agent service isn't running or the API server isn't forwarding requests correctly.

**Fix:**
1. Start the Task Agent service
2. Verify API routes are correctly configured in server.js
3. Check for network issues between UI and API

### "Knowledge Graph node not found"

This indicates that a feature or task ID doesn't exist in the Knowledge Graph.

**Fix:**
1. Verify the feature ID is correct
2. Check if the Knowledge Graph is running
3. Try creating a new feature instead of using an existing one

### "No tasks could be extracted"

This means the Task Agent couldn't generate tasks from the feature description or requirements.

**Fix:**
1. Enhance the feature description with more details
2. Add explicit requirements to the feature
3. Try manual task creation instead

### "Agent communication error"

This indicates problems in agent-to-agent communication, often between Feature Creation Agent and Task Agent.

**Fix:**
1. Ensure both agents are running
2. Check agent communication service configuration
3. Restart both agents to reset communication channels

## Common Fixes

### Reset the Entire System

If you encounter persistent issues, try resetting the entire system:

```bash
# Stop all services
./stop-all-services.sh

# Clean temporary files
rm -f /mnt/c/Users/angel/devloop/agents/planning/*/temp_*.json

# Restart in proper order
./launch-api-server.sh
cd /mnt/c/Users/angel/devloop/backups/system-core-backup/system-core/memory/manager
./launch-memory-api.sh
cd /mnt/c/Users/angel/devloop/agents/planning/task_agent
python3 task_agent.py service &
cd /mnt/c/Users/angel/devloop/ui
./start.sh
```

### Fix Knowledge Graph Connections

If agents have trouble connecting to the Knowledge Graph:

```bash
# Edit the knowledge graph configuration
nano /mnt/c/Users/angel/devloop/agents/planning/feature_creation/config.json

# Ensure these settings:
{
  "knowledge_graph": {
    "host": "localhost",
    "port": 8000,
    "endpoint": "/api/graph"
  }
}
```

### Fix UI Service Connections

If UI can't connect to agent services:

```bash
# Edit the base URLs in service files
nano /mnt/c/Users/angel/devloop/ui/src/services/taskAgentService.js

# Ensure these settings:
const API_BASE_URL = 'http://localhost:8000/api';
const AGENT_API_URL = `${API_BASE_URL}/agents`;
```

### Update Node Modules

If you're getting strange errors in the UI, try updating node modules:

```bash
cd /mnt/c/Users/angel/devloop/ui
npm install
```

---

If you continue to experience issues after trying these troubleshooting steps, please check the detailed logs or contact the development team for assistance.