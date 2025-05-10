#!/bin/bash
# ┌─────────────────────────────────────────────────┐
# │ Devloop UI System Stop Script                   │
# └─────────────────────────────────────────────────┘
# Stops the UI server running in the background

# Colors for better UX
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${RED}╔═════════════════════════════════════════════╗${NC}"
echo -e "${RED}║        STOPPING DEVLOOP UI SERVER           ║${NC}"
echo -e "${RED}╚═════════════════════════════════════════════╝${NC}"
echo

# PID file location
PID_FILE="./system-core/ui-system/logs/ui-server.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  
  # Check if process is running
  if ps -p "$PID" > /dev/null; then
    echo "Stopping UI server with PID: $PID"
    kill "$PID"
    sleep 1
    
    # Double check if it's stopped
    if ! ps -p "$PID" > /dev/null; then
      echo -e "${GREEN}UI server stopped successfully!${NC}"
      rm "$PID_FILE"
    else
      echo "Server didn't stop gracefully, forcing termination..."
      kill -9 "$PID"
      rm "$PID_FILE"
      echo -e "${GREEN}UI server forcefully terminated.${NC}"
    fi
  else
    echo "UI server is not running (stale PID file found)."
    rm "$PID_FILE"
  fi
else
  # Check if any server is running without PID file
  SERVER_PID=$(pgrep -f "node.*wsl-server.js")
  if [ -n "$SERVER_PID" ]; then
    echo "Found UI server running with PID: $SERVER_PID"
    kill "$SERVER_PID"
    echo -e "${GREEN}UI server stopped successfully!${NC}"
  else
    echo "No UI server is currently running."
  fi
fi