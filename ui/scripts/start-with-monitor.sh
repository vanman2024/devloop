#!/bin/bash
# Start the UI server with monitoring enabled

# Color output for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(dirname "$0")"
cd "$SCRIPT_DIR/.." || exit 1

# Create logs directory if it doesn't exist
mkdir -p logs

# Start server monitor
echo -e "${BLUE}Starting server monitor...${NC}"
node scripts/server-monitor.js start > logs/server-monitor.log 2>&1 &
MONITOR_PID=$!

# Store PID for cleanup
echo $MONITOR_PID > logs/server-monitor.pid

echo -e "${GREEN}Server monitor started (PID: $MONITOR_PID)${NC}"
echo -e "${YELLOW}Monitor logs available at:${NC} logs/server-monitor.log"
echo -e "${YELLOW}Server logs available at:${NC} server.log"
echo -e "${CYAN}Use the following commands to view logs:${NC}"
echo -e "  node scripts/server-monitor.js logs    # View server logs"
echo -e "  tail -f logs/server-monitor.log        # View monitor logs"
echo -e "${CYAN}Use the following command to check status:${NC}"
echo -e "  node scripts/server-monitor.js status"

# Return to previous directory
cd - > /dev/null