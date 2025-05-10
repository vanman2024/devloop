#!/bin/bash
# Install the UI Incremental Development Framework

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRAMEWORK_DIR="$SCRIPT_DIR/milestones/milestone-ui-dashboard/phase-06/module-core/feature-6001-ui-incremental-dev/output"

# Check if the framework exists
if [ ! -d "$FRAMEWORK_DIR" ]; then
  echo "Error: UI Development Framework not found"
  echo "Directory not found: $FRAMEWORK_DIR"
  exit 1
fi

# Run the installation script
"$FRAMEWORK_DIR/install-ui-framework.sh"