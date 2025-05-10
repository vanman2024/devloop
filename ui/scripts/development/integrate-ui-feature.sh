#!/bin/bash
# Integrate a UI feature
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/system-core/scripts/ui-development/integrate-ui-feature.sh" "$@"
