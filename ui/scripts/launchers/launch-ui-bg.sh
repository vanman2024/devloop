#!/bin/bash
# ┌─────────────────────────────────────────────────┐
# │ Devloop UI System Background Launcher           │
# └─────────────────────────────────────────────────┘
# A launcher that runs the UI server in the background

# Colors for better UX
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}╔═════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       DEVLOOP UI BACKGROUND LAUNCHER        ║${NC}"
echo -e "${BLUE}╚═════════════════════════════════════════════╝${NC}"
echo

# Check if server is already running
if pgrep -f "node.*wsl-server.js" > /dev/null; then
  echo -e "${YELLOW}UI server is already running!${NC}"
  echo "To access the UI, open your browser and navigate to:"
  IP_ADDRESS=$(hostname -I | awk '{print $1}')
  echo -e "  ${GREEN}http://$IP_ADDRESS:3000${NC} (from Windows)"
  echo -e "  ${GREEN}http://localhost:3000${NC} (from WSL)"
  echo
  echo -e "To stop the server, run: ${YELLOW}./stop-ui.sh${NC}"
  exit 0
fi

# Check if wsl-server.js exists
if [ ! -f "./system-core/ui-system/wsl-server.js" ]; then
  echo -e "${YELLOW}Error: Could not find wsl-server.js${NC}"
  echo "The server file doesn't exist at ./system-core/ui-system/wsl-server.js"
  echo "Please make sure you're running this script from the correct directory."
  exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p ./system-core/ui-system/logs

# Launch HTML UI with improved server
echo -e "${GREEN}Launching Original HTML Feature Manager UI in the background${NC}"
echo "This UI includes feature cards with chat and activity buttons"
echo

# Get IP address for WSL
IP_ADDRESS=$(hostname -I | awk '{print $1}')

# Create a PID file to track the background process
PID_FILE="./system-core/ui-system/logs/ui-server.pid"

# Start the server in the background
cd "./system-core/ui-system" || exit 1
nohup node wsl-server.js > logs/ui-server.log 2>&1 &
LAST_PID=$!
echo $LAST_PID > "$PID_FILE"

# Wait a moment to make sure the server starts
sleep 2

# Check if the server started successfully
if [ -f "$PID_FILE" ] && ps -p "$(cat "$PID_FILE")" > /dev/null; then
  echo -e "${GREEN}UI server started successfully!${NC}"
  echo -e "Server is running in the background (PID: $(cat "$PID_FILE"))"
  echo
  echo -e "${BLUE}To access the UI, open your browser and navigate to:${NC}"
  echo -e "  ${GREEN}http://$IP_ADDRESS:3000${NC} (from Windows)"
  echo -e "  ${GREEN}http://localhost:3000${NC} (from WSL)"
  echo
  echo -e "To stop the server, run: ${YELLOW}./stop-ui.sh${NC}"
else
  echo -e "${YELLOW}Failed to start the UI server.${NC}"
  echo "Check the log file for more information: ./system-core/ui-system/logs/ui-server.log"
  exit 1
fi