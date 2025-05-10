#!/bin/bash
# UI Natural Language Command Processor

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMAND_SCRIPT="$SCRIPT_DIR/system-core/scripts/ui-development/ui_natural_language_command.py"

if [ $# -eq 0 ]; then
  echo "Usage: $0 <natural language command>"
  echo "Examples:"
  echo "  $0 create a dashboard for system health monitoring"
  echo "  $0 create a sandbox for feature 6001"
  echo "  $0 integrate ui feature 6001"
  exit 1
fi

python3 "$COMMAND_SCRIPT" "$@"
