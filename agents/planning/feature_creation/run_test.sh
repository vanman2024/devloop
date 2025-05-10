#!/bin/bash
# Run LLM integration test using API keys from .env file

echo "Running LLM integration test..."
echo "API keys will be loaded from .env file"

# Set the ProjectRoot environment variable if not already set
if [ -z "$PROJECT_ROOT" ]; then
  export PROJECT_ROOT="$(cd "$(dirname "$0")/../../../" && pwd)"
  echo "PROJECT_ROOT set to $PROJECT_ROOT"
fi

# Check if .env file exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
  echo "❌ Error: .env file not found at $PROJECT_ROOT/.env"
  exit 1
fi

# Check if venv directory exists
if [ -d "$PROJECT_ROOT/venv" ]; then
  echo "Using Python from venv"
  # Activate venv if it exists
  source "$PROJECT_ROOT/venv/bin/activate"
  
  # Install OpenAI package if needed
  pip install openai langchain langchain_openai
fi

# Run the test script
python test_llm.py