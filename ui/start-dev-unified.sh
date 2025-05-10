#!/bin/bash
# Development script with unified UI safeguard system
# This script starts the UI server with the unified safeguard system

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo -e "${BLUE}Starting UI with unified safeguard system...${NC}"

# Stop any existing monitoring scripts
echo -e "${BLUE}Stopping any existing monitors...${NC}"
./run-working-state-detector.sh stop 2>/dev/null || true
./run-safeguard.sh stop 2>/dev/null || true
sleep 1

# Parse options
USE_SAFEGUARD=true
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-safeguard)
      USE_SAFEGUARD=false
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# Start the unified safeguard in the background if enabled
if [ "$USE_SAFEGUARD" = true ]; then
  echo -e "${BLUE}Starting unified UI safeguard in background...${NC}"
  ./run-safeguard.sh &
  SAFEGUARD_PID=$!
  echo -e "${GREEN}Unified UI safeguard started with PID: $SAFEGUARD_PID${NC}"
else
  echo -e "${YELLOW}Unified UI safeguard disabled${NC}"
fi

# Start the UI server
echo -e "${BLUE}Starting UI server...${NC}"
# Use the standard start script but disable the old safeguard
./start.sh --ui-only --no-safeguard

# This point is only reached if the UI server exits
# Clean up our safeguard if it's running
if [ "$USE_SAFEGUARD" = true ]; then
  if ps -p "$SAFEGUARD_PID" > /dev/null 2>&1; then
    echo -e "${YELLOW}Stopping unified UI safeguard...${NC}"
    kill "$SAFEGUARD_PID" 2>/dev/null || true
    sleep 1
  fi
fi

echo -e "${BLUE}UI server has exited${NC}"