# Setting up the Task Agent Environment

This guide will help you set up your development environment to work with the Task Agent.

## Prerequisites

- Python 3.8 or higher
- VS Code with Python extensions

## Setup Steps

1. **Install Dependencies**

   Run the provided installation script to set up the virtual environment with all required packages:
   ```bash
   cd /mnt/c/Users/angel/Devloop
   ./install-env.sh
   ```

2. **Activate the Virtual Environment**

   After installing, activate the environment:
   ```bash
   cd /mnt/c/Users/angel/Devloop
   source ./activate-env.sh
   ```

3. **Configure VS Code**

   - Open VS Code at the project root
   - Open the Command Palette (Ctrl+Shift+P)
   - Type "Python: Select Interpreter"
   - Select the interpreter at `/mnt/c/Users/angel/Devloop/venv/bin/python`
   - If needed, reload the window (Command Palette → "Developer: Reload Window")

4. **Verify Installation**

   In a terminal with the activated environment, run:
   ```bash
   python -c "import openai; print(f'OpenAI version: {openai.__version__}')"
   ```

## Running the Task Agent

To test the Task Agent with the Feature Creation Agent integration:

```bash
cd /mnt/c/Users/angel/Devloop
source ./activate-env.sh
cd agents/planning/task_agent
python task_agent.py get feature-1001
```

## Troubleshooting

If you encounter import errors:

1. Make sure you've activated the virtual environment
2. Try reinstalling dependencies with the install-env.sh script
3. Ensure you run Python from the same terminal where you activated the environment
4. Verify that all required packages are installed in your environment:
   ```bash
   pip list | grep openai
   ```

## Working in WSL Environment

When working with WSL, remember these tips:

1. Always use the WSL paths (with `/mnt/c/...`) when working in the terminal
2. When opening files in VS Code, you can use WSL paths or Windows paths
3. Use the activation script to ensure your environment is properly set up each time