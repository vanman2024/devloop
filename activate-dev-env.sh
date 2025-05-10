#!/bin/bash
# Script to activate the development environment for the Devloop project

# Activate the virtual environment
source venv/bin/activate

# Set up environment variables
export PYTHONPATH="$PYTHONPATH:$(pwd)"

# Display information
echo "✅ Development environment activated!"
echo "Python interpreter: $(which python)"
echo "Python version: $(python --version)"
echo "Virtual environment: $VIRTUAL_ENV"
echo "Working directory: $(pwd)"
echo ""
echo "Available OpenAI packages:"
pip list | grep -i openai
echo ""
echo "To run Task Agent test:"
echo "  python -m agents.planning.task_agent.tests.test_feature_task_integration"
echo ""
echo "To deactivate the environment, type: deactivate"