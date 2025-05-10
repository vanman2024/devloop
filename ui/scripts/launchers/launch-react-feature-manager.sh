#!/bin/bash
# Script to launch the React Feature Manager UI with improved navigation

# Colors for better UX
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}╔═════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      DEVLOOP REACT FEATURE MANAGER UI       ║${NC}"
echo -e "${BLUE}╚═════════════════════════════════════════════╝${NC}"
echo

# Check if a port is already in use
function check_port() {
  local port=$1
  local pid=$(lsof -t -i:$port 2>/dev/null)
  if [ -n "$pid" ]; then
    echo -e "${YELLOW}Port $port is already in use by process $pid${NC}"
    read -p "Would you like to kill it and start fresh? (y/n): " kill_process
    if [[ $kill_process == "y" || $kill_process == "Y" ]]; then
      echo "Killing process $pid..."
      kill -9 $pid
      sleep 1
    else
      echo "Exiting. Please stop the running process before launching the UI."
      exit 1
    fi
  fi
}

# Check for the React app directory
if [ ! -d "./system-core/ui-system/react-app" ]; then
  echo -e "${YELLOW}Error: Could not find the React app directory${NC}"
  echo "The React app doesn't exist at ./system-core/ui-system/react-app"
  echo "Please make sure you're running this script from the correct directory."
  exit 1
fi

# Check if port 3000 is in use
check_port 3000

# Get IP address for WSL
IP_ADDRESS=$(hostname -I | awk '{print $1}')

echo -e "${GREEN}Launching React Feature Manager UI${NC}"
echo -e "This UI includes all feature functionality with improved navigation."
echo
echo -e "${BLUE}Features:${NC}"
echo " • Feature cards with chat and activity buttons"
echo " • System Health dashboard"
echo " • Improved navigation between pages"
echo " • No page reloads when navigating"
echo " • Lazy loading for better performance"
echo

# Display access information
echo -e "${BLUE}You can access the app at:${NC}"
echo -e "  ${GREEN}http://$IP_ADDRESS:3000${NC} (from Windows)"
echo -e "  ${GREEN}http://localhost:3000${NC} (from WSL)"
echo
echo -e "${YELLOW}To stop the server, press Ctrl+C${NC}"
echo

# Launch the React app
cd "./system-core/ui-system/react-app"
npm start