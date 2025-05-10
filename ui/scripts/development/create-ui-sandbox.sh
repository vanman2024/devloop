#!/bin/bash
# Create a UI sandbox
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/system-core/scripts/ui-development/create-ui-sandbox.sh" "$@"
