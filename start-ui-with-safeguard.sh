#\!/bin/bash
#
# Start Vite with the Standalone UI Safeguard System
#

# Set colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory of this script
SCRIPT_DIR="$(dirname "$0")"
cd "$SCRIPT_DIR" || exit 1

# Configuration
VITE_PORT=8080
SAFEGUARD_PORT=8090
REACT_APP_DIR="system-core/ui-system/react-app"

# Start UI Safeguard in the background
echo -e "${BLUE}Starting UI Safeguard System...${NC}"
cd $REACT_APP_DIR || exit 1
node standalone-ui-safeguard.js > ui-safeguard.log 2>&1 &
SAFEGUARD_PID=$\!

# Save PID to file for cleanup
echo $SAFEGUARD_PID > ui-safeguard.pid

# Give it a moment to initialize
sleep 1

# Check if safeguard started successfully
if \! ps -p $SAFEGUARD_PID > /dev/null; then
  echo -e "${RED}Failed to start UI Safeguard System\!${NC}"
  echo "Check ui-safeguard.log for details"
  exit 1
fi

echo -e "${GREEN}UI Safeguard System running (PID: $SAFEGUARD_PID)${NC}"
echo -e "Safeguard panel: file://$PWD/ui-safeguard-panel.html"
echo -e "Safeguard API: http://localhost:$SAFEGUARD_PORT"

# Function to clean up background processes on exit
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  
  # Kill UI Safeguard if it's running
  if [ -f "ui-safeguard.pid" ]; then
    SAFEGUARD_PID=$(cat ui-safeguard.pid)
    if ps -p $SAFEGUARD_PID > /dev/null; then
      echo -e "${YELLOW}Stopping UI Safeguard (PID: $SAFEGUARD_PID)...${NC}"
      kill $SAFEGUARD_PID
    fi
    rm ui-safeguard.pid
  fi
  
  echo -e "${GREEN}Cleanup complete${NC}"
}

# Register the cleanup function to run on script termination
trap cleanup EXIT

# Go back to project root
cd "$SCRIPT_DIR" || exit 1

# Run the original start-ui.sh to start Vite
echo -e "\n${BLUE}Starting Vite development server...${NC}"
./start-ui.sh
EOF < /dev/null
