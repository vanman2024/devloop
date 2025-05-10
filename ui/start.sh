#!/bin/bash
#
# Integrated UI Launch Script with Standalone UI Safeguard System
#

# Error handling
set -e

# Set colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(dirname "$0")"
cd "$SCRIPT_DIR" || exit 1

# Configuration
VITE_PORT=3000
API_PORT=8080
SAFEGUARD_PORT=8090
REACT_APP_DIR="$SCRIPT_DIR"
API_SERVER_DIR="/mnt/c/Users/angel/Devloop/api"

# Help function
show_help() {
  echo -e "${BLUE}Devloop UI and API Server Launcher with Standalone UI Safeguard${NC}"
  echo -e "Usage: $0 [options]"
  echo
  echo -e "Options:"
  echo -e "  --no-browser      Don't open browser automatically"
  echo -e "  --production      Run in production mode"
  echo -e "  --ui-only         Start only the UI server, not the API server"
  echo -e "  --api-only        Start only the API server, not the UI"
  echo -e "  --port PORT       Specify API server port (default: 8080)"
  echo -e "  --no-safeguard    Disable UI Safeguard system"
  echo -e "  --help            Show this help message"
  echo
  echo -e "UI Safeguard Options:"
  echo -e "  --snapshot        Take a snapshot before starting the server"
  echo -e "  --verify          Verify UI components before starting the server"
  echo -e "  --safeguard-port PORT  Set the safeguard system port (default: 8090)"
  echo
  echo -e "Working State Detector:"
  echo -e "  The UI launcher automatically starts the working state detector"
  echo -e "  which monitors your code and creates backups when the UI is in a"
  echo -e "  working state. To restore from a backup, use:"
  echo -e "  ./restore-from-backup.sh"
  echo
  echo -e "Examples:"
  echo -e "  $0                # Start both UI and API servers with UI Safeguard"
  echo -e "  $0 --production   # Build and serve production versions"
  echo -e "  $0 --snapshot     # Take snapshot before starting servers"
  echo -e "  $0 --no-safeguard # Start without UI Safeguard"
  exit 0
}

# Parse command line arguments
OPEN_BROWSER=true
PRODUCTION_MODE=false
UI_ONLY=false
API_ONLY=false
UI_SAFEGUARD=true
TAKE_SNAPSHOT=false
VERIFY_COMPONENTS=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-browser)
      OPEN_BROWSER=false
      shift
      ;;
    --production)
      PRODUCTION_MODE=true
      shift
      ;;
    --ui-only)
      UI_ONLY=true
      shift
      ;;
    --api-only)
      API_ONLY=true
      shift
      ;;
    --port)
      API_PORT="$2"
      VITE_PORT="$2"
      shift 2
      ;;
    --no-safeguard)
      UI_SAFEGUARD=false
      shift
      ;;
    --snapshot)
      TAKE_SNAPSHOT=true
      shift
      ;;
    --verify)
      VERIFY_COMPONENTS=true
      shift
      ;;
    --safeguard-port)
      SAFEGUARD_PORT="$2"
      shift 2
      ;;
    --help)
      show_help
      ;;
    *)
      shift
      ;;
  esac
done

# Function to start the API server
start_api_server() {
  local mode="development"
  if [ "$PRODUCTION_MODE" = true ]; then
    mode="production"
  fi
  
  echo -e "${BLUE}====================================${NC}"
  echo -e "${BLUE}Starting API server in ${mode} mode on port ${API_PORT}...${NC}"
  echo -e "${BLUE}====================================${NC}"
  
  # Use parent directory's launch-server.sh
  cd "/mnt/c/Users/angel/devloop" || exit 1
  
  if [ -x "./launch-server.sh" ]; then
    ./launch-server.sh start "$API_PORT" "$mode"
  else
    chmod +x ./launch-server.sh
    ./launch-server.sh start "$API_PORT" "$mode"
  fi
  
  # Return to original directory
  cd "$SCRIPT_DIR" || exit 1
}

# Function to start the UI Safeguard system
start_ui_safeguard() {
  echo -e "${BLUE}Starting UI Safeguard System...${NC}"
  
  # Kill any existing processes
  if [ -f "ui-safeguard.pid" ]; then
    local pid=$(cat "ui-safeguard.pid")
    if ps -p "$pid" > /dev/null; then
      echo -e "${YELLOW}Stopping existing UI Safeguard (PID: $pid)...${NC}"
      kill "$pid" 2>/dev/null || true
    fi
    rm "ui-safeguard.pid"
  fi
  
  # Start the safeguard system
  node standalone-ui-safeguard.js > ui-safeguard.log 2>&1 &
  local safeguard_pid=$!
  
  # Save PID
  echo $safeguard_pid > ui-safeguard.pid
  
  # Wait longer for it to initialize
  sleep 5
  
  # Check if it started successfully
  if ! ps -p $safeguard_pid > /dev/null; then
    echo -e "${RED}Failed to start UI Safeguard System!${NC}"
    echo "Check ui-safeguard.log for details"
    return 1
  fi
  
  echo -e "${GREEN}UI Safeguard System running (PID: $safeguard_pid)${NC}"
  echo -e "Safeguard panel: file://$PWD/ui-safeguard-panel.html"
  echo -e "Safeguard API: http://localhost:$SAFEGUARD_PORT"
  
  # Take snapshot if requested
  if [ "$TAKE_SNAPSHOT" = true ]; then
    echo -e "${BLUE}Taking initial snapshot...${NC}"
    curl -s -X POST -H "Content-Type: application/json" -d '{"description":"Initial snapshot"}' http://localhost:$SAFEGUARD_PORT/snapshot > /dev/null
  fi
  
  # Verify components if requested
  if [ "$VERIFY_COMPONENTS" = true ]; then
    echo -e "${BLUE}Verifying UI components...${NC}"
    curl -s http://localhost:$SAFEGUARD_PORT/verify > /dev/null
  fi
}

# Function to start the UI server
start_ui_server() {
  echo -e "${GREEN}====================================${NC}"
  echo -e "${GREEN}Starting UI server on port ${VITE_PORT}${NC}"
  echo -e "${GREEN}====================================${NC}"
  echo -e "${BLUE}UI directory: ${REACT_APP_DIR}${NC}"
  
  # Kill any existing processes using the Vite port
  local pid_using_port=$(lsof -t -i:$VITE_PORT 2>/dev/null || echo "")
  if [ -n "$pid_using_port" ]; then
    echo -e "${YELLOW}Killing process using port $VITE_PORT (PID: $pid_using_port)...${NC}"
    kill -9 $pid_using_port 2>/dev/null || true
  fi
  
  # Install dependencies if needed
  if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install
  fi
  
  # Set environment variables
  export VITE_API_SERVER_URL="http://localhost:${API_PORT}"
  export VITE_SAFEGUARD_API="http://localhost:${SAFEGUARD_PORT}"
  
  echo -e "${BLUE}Starting development server on port ${VITE_PORT}...${NC}"
  
  # Open browser if requested
  if [ "$OPEN_BROWSER" = true ]; then
    sleep 1
    cmd.exe /c start http://localhost:$VITE_PORT &
  fi
  
  # Start Vite
  if [ "$PRODUCTION_MODE" = true ]; then
    vite build && vite preview --port $VITE_PORT
  else
    # Use the globally installed vite with enhanced HMR settings for better hot reloading
    CHOKIDAR_USEPOLLING=true VITE_HMR_TIMEOUT=60000 VITE_PRESERVE_HMR_DURING_ERROR=true node --max-old-space-size=4096 $(which vite) --force --clearScreen=false --port $VITE_PORT
  fi
}

# Cleanup function
cleanup() {
  echo -e "${YELLOW}Cleaning up...${NC}"
  
  # Kill UI Safeguard if running
  if [ -f "$REACT_APP_DIR/ui-safeguard.pid" ]; then
    local safeguard_pid=$(cat "$REACT_APP_DIR/ui-safeguard.pid")
    if ps -p "$safeguard_pid" > /dev/null; then
      echo -e "${YELLOW}Stopping UI Safeguard (PID: $safeguard_pid)...${NC}"
      kill "$safeguard_pid" 2>/dev/null || true
    fi
    rm "$REACT_APP_DIR/ui-safeguard.pid" 2>/dev/null || true
  fi
  
  # Kill working state detector if running
  if [ -f "$REACT_APP_DIR/working-detector.pid" ]; then
    local detector_pid=$(cat "$REACT_APP_DIR/working-detector.pid")
    if ps -p "$detector_pid" > /dev/null; then
      echo -e "${YELLOW}Stopping working state detector (PID: $detector_pid)...${NC}"
      kill "$detector_pid" 2>/dev/null || true
    fi
    rm "$REACT_APP_DIR/working-detector.pid" 2>/dev/null || true
  fi
}

# Set up cleanup on exit
trap cleanup EXIT

# Main execution
if [ "$API_ONLY" = true ]; then
  echo -e "${CYAN}======================================================${NC}"
  echo -e "${CYAN}    STARTING IN API-ONLY MODE    ${NC}"
  echo -e "${CYAN}======================================================${NC}"
  # Start only the API server
  start_api_server
elif [ "$UI_ONLY" = true ]; then
  echo -e "${CYAN}======================================================${NC}"
  echo -e "${CYAN}    STARTING IN UI-ONLY MODE    ${NC}"
  echo -e "${CYAN}======================================================${NC}"
  # Start only the UI server (and UI Safeguard if enabled)
  if [ "$UI_SAFEGUARD" = true ]; then
    start_ui_safeguard
  fi
  
  # Start working state detector in background if it exists
  if [ -f "./run-working-state-detector.sh" ]; then
    echo -e "${BLUE}Starting working state detector in background...${NC}"
    ./run-working-state-detector.sh &
    DETECTOR_PID=$!
    echo $DETECTOR_PID > working-detector.pid
    echo -e "${GREEN}Working state detector running (PID: $DETECTOR_PID)${NC}"
  else
    echo -e "${YELLOW}Working state detector not found. Automatic backups disabled.${NC}"
  fi
  
  start_ui_server
else
  echo -e "${CYAN}======================================================${NC}"
  echo -e "${CYAN}    STARTING BOTH API AND UI SERVERS    ${NC}"
  echo -e "${CYAN}======================================================${NC}"
  # Start both servers
  start_api_server
  
  if [ "$UI_SAFEGUARD" = true ]; then
    # Try to start UI safeguard but continue even if it fails
    start_ui_safeguard || echo -e "${YELLOW}UI Safeguard failed to start, continuing anyway...${NC}"
  fi
  
  # Start working state detector in background if it exists
  if [ -f "./run-working-state-detector.sh" ]; then
    echo -e "${BLUE}Starting working state detector in background...${NC}"
    ./run-working-state-detector.sh &
    DETECTOR_PID=$!
    echo $DETECTOR_PID > working-detector.pid
    echo -e "${GREEN}Working state detector running (PID: $DETECTOR_PID)${NC}"
  else
    echo -e "${YELLOW}Working state detector not found. Automatic backups disabled.${NC}"
  fi
  
  start_ui_server
fi