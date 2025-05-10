#!/bin/bash
# Create a new UI feature
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/system-core/scripts/ui-development/create-ui-feature.sh" "$@"
