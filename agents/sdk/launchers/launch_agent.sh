#!/bin/bash
#
# Agent Launcher Script for SDK-First Architecture
#
# This script provides a simple way to launch agents from the command line,
# supporting both single agents and agent handoffs.
#
# Usage:
#   ./launch_agent.sh [options]
#
# Options:
#   --agent-type TYPE      Type of agent to launch
#   --agent-name NAME      Name for the agent
#   --instructions TEXT    Instructions for the agent
#   --task TEXT            Initial task for the agent
#   --model MODEL          Model to use (default: gpt-4o)
#   --tools LIST           Comma-separated list of tool names to enable
#   --interactive          Enable interactive mode
#   --output FILE          Write output to FILE
#   --handoff              Enable agent handoff mode

set -e

# Default configuration
AGENT_TYPE="assistant"
AGENT_NAME="devloop-agent"
INSTRUCTIONS="You are a helpful assistant for the Devloop system."
MODEL="gpt-4o"
TOOLS=""
TASK=""
INTERACTIVE=0
OUTPUT_FILE=""
HANDOFF=0

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Process command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --agent-type)
      AGENT_TYPE="$2"
      shift
      shift
      ;;
    --agent-name)
      AGENT_NAME="$2"
      shift
      shift
      ;;
    --instructions)
      INSTRUCTIONS="$2"
      shift
      shift
      ;;
    --task)
      TASK="$2"
      shift
      shift
      ;;
    --model)
      MODEL="$2"
      shift
      shift
      ;;
    --tools)
      TOOLS="$2"
      shift
      shift
      ;;
    --interactive)
      INTERACTIVE=1
      shift
      ;;
    --output)
      OUTPUT_FILE="$2"
      shift
      shift
      ;;
    --handoff)
      HANDOFF=1
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate required environment variables
if [[ -z "${OPENAI_API_KEY}" ]]; then
  echo "Error: OPENAI_API_KEY environment variable is not set."
  echo "Please set it with: export OPENAI_API_KEY=your_api_key"
  exit 1
fi

# Create agent config file
TIMESTAMP=$(date +%Y%m%d%H%M%S)
AGENT_ID="${AGENT_TYPE}-${TIMESTAMP}"
CONFIG_FILE="/tmp/agent_config_${AGENT_ID}.json"

echo "Creating agent configuration at ${CONFIG_FILE}..."

# Parse tools into array
IFS=',' read -r -a TOOL_ARRAY <<< "$TOOLS"
TOOLS_JSON="[]"

if [[ ${#TOOL_ARRAY[@]} -gt 0 ]]; then
  TOOLS_JSON="["
  for tool in "${TOOL_ARRAY[@]}"; do
    # Look up tool definition from tools directory
    TOOL_FILE="${ROOT_DIR}/sdk/tools/${tool}.json"
    if [[ -f "$TOOL_FILE" ]]; then
      if [[ "$TOOLS_JSON" != "[" ]]; then
        TOOLS_JSON="${TOOLS_JSON},"
      fi
      TOOLS_JSON="${TOOLS_JSON}$(cat "$TOOL_FILE")"
    else
      echo "Warning: Tool definition not found: ${tool}"
    fi
  done
  TOOLS_JSON="${TOOLS_JSON}]"
fi

# Create the agent configuration file
cat > "$CONFIG_FILE" << EOF
{
  "agent_id": "${AGENT_ID}",
  "agent_name": "${AGENT_NAME}",
  "agent_type": "${AGENT_TYPE}",
  "instructions": "${INSTRUCTIONS}",
  "model": "${MODEL}",
  "tools": ${TOOLS_JSON},
  "interactive": ${INTERACTIVE},
  "handoff_enabled": ${HANDOFF}
}
EOF

echo "Launching agent ${AGENT_NAME} (${AGENT_ID})..."

# Execute agent
PYTHON_SCRIPT="${ROOT_DIR}/sdk/launchers/agent_runner.py"

if [[ ! -f "$PYTHON_SCRIPT" ]]; then
  echo "Creating agent_runner.py..."
  
  # Create the Python runner script if it doesn't exist
  mkdir -p "$(dirname "$PYTHON_SCRIPT")"
  cat > "$PYTHON_SCRIPT" << 'EOF'
#!/usr/bin/env python3
"""
Agent Runner Script

This script launches an agent based on a configuration file and
executes initial tasks or runs in interactive mode.
"""

import os
import sys
import json
import argparse
import logging
from typing import Dict, Any, Optional

# Add parent directories to path for imports
script_dir = os.path.dirname(os.path.abspath(__file__))
agents_dir = os.path.abspath(os.path.join(script_dir, "../../"))
if agents_dir not in sys.path:
    sys.path.append(agents_dir)

# Import SDK agent
from sdk.core.agent import SDKAgent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] - %(message)s"
)
logger = logging.getLogger("agent_runner")

def load_config(config_path: str) -> Dict[str, Any]:
    """Load agent configuration from file"""
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading configuration: {e}")
        sys.exit(1)

def run_interactive(agent: SDKAgent) -> None:
    """Run the agent in interactive mode"""
    print(f"\nInteractive session with agent {agent.name}\n")
    print("Type 'exit' or 'quit' to end the session.")
    
    while True:
        try:
            # Get user input
            user_input = input("\nYou: ")
            
            # Check for exit command
            if user_input.lower() in ["exit", "quit"]:
                print("\nExiting interactive session.")
                break
            
            # Process with agent
            response = agent.execute(user_input)
            
            # Display response
            print(f"\nAgent: {response}")
            
        except KeyboardInterrupt:
            print("\nInteractive session terminated by user.")
            break
        except Exception as e:
            logger.error(f"Error in interactive session: {e}")
            print(f"\nError: {str(e)}")

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Agent Runner")
    parser.add_argument("config", help="Path to agent configuration file")
    parser.add_argument("--task", help="Initial task for the agent")
    parser.add_argument("--output", help="Output file for results")
    
    args = parser.parse_args()
    
    # Load configuration
    config = load_config(args.config)
    
    # Create agent
    logger.info(f"Creating agent {config.get('agent_name')}")
    agent = SDKAgent(config)
    
    # Check agent initialization
    if not agent.openai_available:
        logger.error("Agent initialization failed: OpenAI client not available")
        sys.exit(1)
    
    # Handle output file
    output_file = args.output
    
    # Process task if provided
    if args.task:
        logger.info(f"Executing task: {args.task}")
        result = agent.execute(args.task)
        
        # Display result
        print("\nTask Result:")
        print(result)
        
        # Write to output file if specified
        if output_file:
            try:
                with open(output_file, 'w') as f:
                    f.write(result)
                logger.info(f"Result written to {output_file}")
            except Exception as e:
                logger.error(f"Error writing to output file: {e}")
    
    # Run in interactive mode if configured
    elif config.get("interactive", False):
        run_interactive(agent)
    
    # Display agent status if no task or interactive mode
    else:
        status = agent.status()
        print(f"\nAgent {status['name']} ({status['id']}) is ready.")
        print("Use --task or --interactive to interact with the agent.")
    
    logger.info("Agent runner completed")

if __name__ == "__main__":
    main()
EOF

  # Make the script executable
  chmod +x "$PYTHON_SCRIPT"
fi

# Run the agent
if [[ -n "$TASK" ]]; then
  python3 "$PYTHON_SCRIPT" "$CONFIG_FILE" --task "$TASK" ${OUTPUT_FILE:+--output "$OUTPUT_FILE"}
elif [[ $INTERACTIVE -eq 1 ]]; then
  python3 "$PYTHON_SCRIPT" "$CONFIG_FILE"
else
  echo "No task specified. Use --task or --interactive option."
  python3 "$PYTHON_SCRIPT" "$CONFIG_FILE"
fi

# Clean up
echo "Cleaning up temporary files..."
rm -f "$CONFIG_FILE"

echo "Agent execution complete."