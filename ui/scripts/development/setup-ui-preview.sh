#!/bin/bash
# Set up the UI component preview system
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "$SCRIPT_DIR/system-core/scripts/ui-development/lightweight_sandbox.py" setup
