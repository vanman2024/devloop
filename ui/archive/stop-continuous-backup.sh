#!/bin/bash
# Stop the continuous backup service

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

PID_FILE="continuous-backup.pid"

if [ ! -f "$PID_FILE" ]; then
  echo -e "${YELLOW}Continuous backup service is not running${NC}"
  exit 0
fi

PID=$(cat "$PID_FILE")

# Check if process exists
if ps -p $PID > /dev/null; then
  echo -e "${YELLOW}Stopping continuous backup service (PID: $PID)...${NC}"
  kill $PID
  echo -e "${GREEN}Continuous backup service stopped${NC}"
else
  echo -e "${YELLOW}Continuous backup service is not running (stale PID file)${NC}"
fi

# Remove PID file
rm "$PID_FILE"