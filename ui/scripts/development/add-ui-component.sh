#!/bin/bash
# Add a UI component to the preview system
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <feature_id> [--component <component_name>]"
  echo "Example: $0 6001 --component MyComponent"
  exit 1
fi

python3 "$SCRIPT_DIR/system-core/scripts/ui-development/lightweight_sandbox.py" add "$@"
