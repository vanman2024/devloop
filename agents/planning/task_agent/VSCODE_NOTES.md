# VS Code Notes

## Handling Import Warnings

VS Code may show warnings for imports that can't be resolved, even if the code runs fine from the terminal. This is because VS Code uses a static analysis tool that doesn't know about runtime imports or virtual environments.

### Solution

We've added a setting to ignore import errors in VS Code:

```json
"python.linting.pylintArgs": ["--disable=import-error"]
```

This setting is in the `.vscode/settings.json` file and applies to the entire workspace.

## Running in the Terminal

When running the Task Agent in the terminal, make sure to activate the virtual environment first:

```bash
cd /mnt/c/Users/angel/Devloop
source ./activate-env.sh
```

Then run the agent:

```bash
cd agents/planning/task_agent
python task_agent.py get feature-1001
```

## Missing Imports

If you see warnings about missing imports like:
- `agents.sdk.utils.ai_service.core`
- `agents.utils.agent_communication`

These modules will be created later as part of the project. The warnings can be safely ignored thanks to the VS Code setting.