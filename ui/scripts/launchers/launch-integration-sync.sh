#!/bin/bash
# ┌─────────────────────────────────────────────────┐
# │ Launch Integration Sync Dashboard                │
# └─────────────────────────────────────────────────┘
# 📦 PURPOSE:
#   Launches the Integration Sync Dashboard UI
#
# 📋 USAGE:
#   ./launch-integration-sync.sh
#
# ─────────────────────────────────────────────────────

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_PATH="${SCRIPT_DIR}/system-core/ui-system"

# Check if live-server is available or use python's built-in HTTP server
if command -v live-server &> /dev/null; then
  echo "Starting live-server for Integration Sync Dashboard..."
  cd "${UI_PATH}" && live-server --port=8008 --entry-file=pages/integration-sync.html
else
  echo "live-server not found, using Python's HTTP server..."
  cd "${UI_PATH}" && python3 -m http.server 8008
fi

# Open the browser after a short delay
(
  sleep 2
  if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8008/pages/integration-sync.html
  elif command -v open &> /dev/null; then
    open http://localhost:8008/pages/integration-sync.html
  elif command -v start &> /dev/null; then
    start http://localhost:8008/pages/integration-sync.html
  else
    echo "Please open http://localhost:8008/pages/integration-sync.html in your browser"
  fi
) &

echo "Integration Sync Dashboard running at: http://localhost:8008/pages/integration-sync.html"