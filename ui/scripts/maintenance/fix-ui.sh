#!/bin/bash
# Script to fix UI issues and restore the React UI

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REACT_APP_DIR="$SCRIPT_DIR/system-core/ui-system/react-app"

# Stop any running UI processes
echo "Stopping any running UI processes..."
pkill -f "vite --force" 2>/dev/null || true
pkill -f "node server/server.js" 2>/dev/null || true
pkill -f "node wsl-server.js" 2>/dev/null || true

# Make sure we've removed all drift detection components
echo "Cleaning up drift detection components..."
rm -f "$REACT_APP_DIR/src/components/health/DriftDetectionMonitor.jsx" 2>/dev/null || true
rm -f "$REACT_APP_DIR/src/components/health/DriftDetectionTab.jsx" 2>/dev/null || true
rm -f "$REACT_APP_DIR/src/services/driftDetectionService.js" 2>/dev/null || true

# Remove any custom launch script that might be causing issues
rm -f "$SCRIPT_DIR/launch-drift-detection-ui.sh" 2>/dev/null || true
rm -f "$SCRIPT_DIR/reload-react-with-drift.sh" 2>/dev/null || true

echo "==========================================="
echo "✅ UI has been fixed and cleaned up!"
echo "==========================================="
echo "To launch the original React UI:"
echo "  ./launch-react-ui.sh"
echo ""
echo "The SystemHealth.jsx file has been restored to"
echo "its original state without the Drift Detection tab."