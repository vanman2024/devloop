#!/bin/bash
# Start the continuous backup service

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting continuous backup service...${NC}"

# Check for npm packages
if ! npm list chokidar --silent > /dev/null; then
  echo -e "${YELLOW}Installing required packages...${NC}"
  npm install --no-save chokidar
fi

# Get PID file path
PID_FILE="continuous-backup.pid"

# Check if already running
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p $PID > /dev/null; then
    echo -e "${YELLOW}Continuous backup is already running with PID $PID${NC}"
    echo -e "To stop it, run: ${GREEN}./stop-continuous-backup.sh${NC}"
    exit 0
  else
    echo -e "${YELLOW}Removing stale PID file...${NC}"
    rm "$PID_FILE"
  fi
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Start the continuous backup process in the background
echo -e "${GREEN}Starting continuous backup watcher...${NC}"
nohup node tools/continuous-backup.js > logs/continuous-backup.log 2>&1 &
PID=$!

# Save PID to file
echo $PID > "$PID_FILE"
echo -e "${GREEN}Continuous backup started with PID $PID${NC}"
echo -e "View logs: ${YELLOW}less -f logs/continuous-backup.log${NC}"
echo -e "To stop it: ${YELLOW}./stop-continuous-backup.sh${NC}"