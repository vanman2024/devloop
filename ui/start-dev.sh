#!/bin/bash
# Development script without safeguard system
# This version completely bypasses the UI safeguard to avoid HMR issues

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up development environment...${NC}"

# Stop any existing monitors
echo -e "${BLUE}Stopping any existing monitors...${NC}"
./run-working-state-detector.sh stop 2>/dev/null || true
./run-safeguard.sh stop 2>/dev/null || true
sleep 1

# Kill any running safeguard processes
pkill -f "ui-safeguard" 2>/dev/null || true
pkill -f "working-state-detector" 2>/dev/null || true

# Start the UI server without any safeguards
echo -e "${BLUE}Starting UI server (no safeguards)...${NC}"
./start.sh --ui-only --no-safeguard

echo -e "${BLUE}UI server has exited${NC}"
