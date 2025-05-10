#!/bin/bash

# ========================================================
# Devloop UI and API Server Launcher with UI Safeguard
# ========================================================

# Error handling
set -e  # Exit on any errors

# Color output for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(dirname "$0")"
cd "$SCRIPT_DIR" || exit 1

# Help function
show_help() {
  echo -e "${BLUE}Devloop UI and API Server Launcher with UI Safeguard${NC}"
  echo -e "Usage: $0 [options]"
  echo
  echo -e "Options:"
  echo -e "  --no-browser      Don't open browser automatically"
  echo -e "  --production      Run in production mode"
  echo -e "  --ui-only         Start only the UI server, not the API server"
  echo -e "  --api-only        Start only the API server, not the UI"
  echo -e "  --port PORT       Specify API server port (default: 3000)"
  echo -e "  --no-safeguard    Disable UI Safeguard system"
  echo -e "  --snapshot        Take a snapshot before starting the server"
  echo -e "  --verify          Verify UI components before starting the server"
  echo -e "  --monitor         Run UI Safeguard monitor in background"
  echo -e "  --interval MIN    Snapshot interval for monitor (default: 30 minutes)"
  echo -e "  --help            Show this help message"
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
API_PORT=8080
VITE_PORT=3000
UI_SAFEGUARD=true
TAKE_SNAPSHOT=false
VERIFY_COMPONENTS=false
RUN_MONITOR=false
MONITOR_INTERVAL=30

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
    --monitor)
      RUN_MONITOR=true
      shift
      ;;
    --interval)
      MONITOR_INTERVAL="$2"
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

# Function to run the UI Safeguard agent
run_ui_safeguard() {
  local command=$1
  shift
  
  cd "$SCRIPT_DIR/ui" || exit 1
  
  echo -e "${CYAN}UI Safeguard: Running ${command}...${NC}"
  node scripts/ui-safeguard-cli.js "$command" "$@"
  
  return $?
}

# Function to start the UI Safeguard monitor
start_ui_safeguard_monitor() {
  cd "$SCRIPT_DIR/ui" || exit 1
  
  echo -e "${CYAN}Starting UI Safeguard monitor (interval: ${MONITOR_INTERVAL} minutes)...${NC}"
  node scripts/ui-safeguard-cli.js monitor --interval "$MONITOR_INTERVAL" &
  
  # Save the PID for cleanup
  UI_SAFEGUARD_MONITOR_PID=$!
  echo $UI_SAFEGUARD_MONITOR_PID > ./logs/ui-safeguard-monitor.pid
  
  echo -e "${GREEN}UI Safeguard monitor started (PID: ${UI_SAFEGUARD_MONITOR_PID})${NC}"
}

# Function to start the API server
start_api_server() {
  local mode="development"
  if [ "$PRODUCTION_MODE" = true ]; then
    mode="production"
  fi
  
  echo -e "${BLUE}====================================${NC}"
  echo -e "${BLUE}Starting API server in ${mode} mode on port ${API_PORT}...${NC}"
  echo -e "${BLUE}====================================${NC}"
  
  # Use the unified launcher script
  if [ -x "./launch-server.sh" ]; then
    ./launch-server.sh start "$API_PORT" "$mode"
  else
    chmod +x ./launch-server.sh
    ./launch-server.sh start "$API_PORT" "$mode"
  fi
}

# Function to start the UI server
start_ui_server() {
  # Navigate to the React app directory
  cd "$SCRIPT_DIR/ui" || exit 1
  echo -e "${GREEN}====================================${NC}"
  echo -e "${GREEN}Starting UI server on port ${VITE_PORT}${NC}"
  echo -e "${GREEN}====================================${NC}"
  echo -e "${BLUE}UI directory: $(pwd)${NC}"
  
  # Kill any existing processes using port 8080
  PID_USING_PORT=$(lsof -t -i:8080 2>/dev/null || echo "")
  if [ -n "$PID_USING_PORT" ]; then
    kill -9 $PID_USING_PORT 2>/dev/null || true
  fi
  
  # Install dependencies if needed
  if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install
  fi
  
  # Configure Vite to use the API server 
  if [ -f "vite.config.js" ]; then
    echo -e "${BLUE}Configuring Vite to use API server at port ${API_PORT}...${NC}"
    # For now, we'll rely on environment variables
    export VITE_API_SERVER_URL="http://localhost:${API_PORT}"
  fi
  
  # UI Safeguard operations before starting server
  if [ "$UI_SAFEGUARD" = true ]; then
    # Create necessary directories
    mkdir -p "$SCRIPT_DIR/agents/system-health-agent/child-agents/ui-safeguard-agent/snapshots"
    mkdir -p "$SCRIPT_DIR/agents/system-health-agent/child-agents/ui-safeguard-agent/storage"
    mkdir -p ./logs
    
    # Take snapshot if requested
    if [ "$TAKE_SNAPSHOT" = true ]; then
      run_ui_safeguard snapshot all --description "Pre-development snapshot"
    fi
    
    # Verify components if requested
    if [ "$VERIFY_COMPONENTS" = true ]; then
      run_ui_safeguard verify
    fi
    
    # Start monitor if requested
    if [ "$RUN_MONITOR" = true ]; then
      start_ui_safeguard_monitor
    fi
  fi
  
  # Start server based on mode
  if [ "$PRODUCTION_MODE" = true ]; then
    echo -e "${BLUE}Building for production...${NC}"
    vite build
    
    echo -e "${GREEN}Starting production server...${NC}"
    vite preview --port $VITE_PORT
  else
    echo -e "${BLUE}Starting development server...${NC}"
    
    # Open browser if requested
    if [ "$OPEN_BROWSER" = true ]; then
      sleep 1
      cmd.exe /c start http://localhost:$VITE_PORT &
    fi
    
    # Run Vite with essential hot reload settings and UI Safeguard plugin enabled
    # Use the globally installed vite
    CHOKIDAR_USEPOLLING=true VITE_HMR_TIMEOUT=30000 vite --force --port $VITE_PORT
  fi
}

# Cleanup function to ensure we don't leave processes running
cleanup() {
  echo -e "${YELLOW}Cleaning up...${NC}"
  
  # Kill UI Safeguard monitor if it's running
  if [ -f "./ui/logs/ui-safeguard-monitor.pid" ]; then
    UI_SAFEGUARD_MONITOR_PID=$(cat "./ui/logs/ui-safeguard-monitor.pid")
    if [ -n "$UI_SAFEGUARD_MONITOR_PID" ]; then
      echo -e "${YELLOW}Stopping UI Safeguard monitor (PID: ${UI_SAFEGUARD_MONITOR_PID})...${NC}"
      kill -9 "$UI_SAFEGUARD_MONITOR_PID" 2>/dev/null || true
      rm "./ui/logs/ui-safeguard-monitor.pid"
    fi
  fi
}

# Set up cleanup on exit
trap cleanup EXIT

# Main execution logic
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
  # Start only the UI server
  start_ui_server
else
  echo -e "${CYAN}======================================================${NC}"
  echo -e "${CYAN}    STARTING BOTH API AND UI SERVERS    ${NC}"
  echo -e "${CYAN}======================================================${NC}"
  # Start both servers
  start_api_server
  start_ui_server
fi