#\!/bin/bash

# Consolidated UI Launch and Management Script for Devloop
# This script replaces all scattered UI scripts with a unified interface

# Navigate to project root directory
ROOT_DIR="/mnt/c/Users/angel/Devloop"
cd "$ROOT_DIR"

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
  echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║                   DEVLOOP UI MANAGER                      ║${NC}"
  echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"
}

show_usage() {
  print_header
  echo -e "${GREEN}Usage:${NC} $0 [command] [options]"
  echo
  echo -e "${BLUE}Commands:${NC}"
  echo "  start       - Start the UI development server (with auto-reload)"
  echo "  production  - Start in production mode"
  echo "  stop        - Stop all running UI servers"
  echo "  clean       - Clean up UI temporary files"
  echo "  create      - Create a new UI feature"
  echo "  fix         - Fix common UI issues"
  echo "  status      - Check status of UI servers"
  echo "  help        - Show this help message"
  echo
  echo -e "${BLUE}Options:${NC}"
  echo "  --no-browser   - Don't open browser automatically"
  echo "  --debug        - Show debug output"
  echo "  --ip=IP        - Use specific IP for server (default: auto-detect)"
  echo
  echo -e "${BLUE}Examples:${NC}"
  echo "  $0 start         - Start development server"
  echo "  $0 production    - Start production server"
  echo "  $0 stop          - Stop all servers"
  echo "  $0 create myfeature 'My Feature Description'"
  exit 0
}

get_ip() {
  # Get IP address for WSL
  if grep -q Microsoft /proc/version; then
    ip route  < /dev/null |  grep default | awk '{print $3}'
  else
    hostname -I | awk '{print $1}'
  fi
}

# Kill any existing UI servers
kill_servers() {
  echo -e "${BLUE}Stopping any running UI servers...${NC}"
  pkill -f "vite" 2>/dev/null || true
  pkill -f "node.*server" 2>/dev/null || true
  killall -9 node 2>/dev/null || true
  echo -e "${GREEN}All UI servers stopped.${NC}"
}

# Start development server with proper WSL configuration
start_dev_server() {
  cd "$ROOT_DIR/system-core/ui-system/react-app"
  
  # Install dependencies if needed
  if [ \! -d "node_modules" ]; then
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install
  fi
  
  # Ensure dependencies are up to date
  echo -e "${BLUE}Checking for missing dependencies...${NC}"
  npm install --no-save react-bootstrap recharts react-icons
  
  # Clean Vite cache
  rm -rf node_modules/.vite 2>/dev/null
  
  # Set IP for HMR to work properly
  IP=$(get_ip)
  
  # Modify vite.config.js to use the correct IP
  sed -i "s/host: '[^']*'/host: '$IP'/g" "$ROOT_DIR/system-core/ui-system/react-app/vite.config.js"
  
  echo -e "${GREEN}Starting development server on $IP:3000${NC}"
  echo -e "${YELLOW}Keep this terminal open to maintain the server${NC}"
  
  # Open browser if not disabled
  if [ "$NO_BROWSER" \!= "true" ]; then
    echo -e "${BLUE}Opening browser...${NC}"
    cmd.exe /c start http://$IP:3000 &
  fi
  
  # Start with optimized settings for WSL
  CHOKIDAR_USEPOLLING=true CHOKIDAR_INTERVAL=300 VITE_HMR_TIMEOUT=120000 npm run dev
}

# Start production server
start_prod_server() {
  cd "$ROOT_DIR/system-core/ui-system/react-app"
  
  # Build for production
  echo -e "${BLUE}Building for production...${NC}"
  npm run build
  
  # Start production server
  echo -e "${GREEN}Starting production server...${NC}"
  npm run preview -- --host 0.0.0.0
}

# Clean up UI files
clean_ui() {
  echo -e "${BLUE}Cleaning UI temporary files...${NC}"
  
  # Remove development cache
  rm -rf "$ROOT_DIR/system-core/ui-system/react-app/node_modules/.vite" 2>/dev/null
  
  # Remove logs
  rm -f "$ROOT_DIR/system-core/ui-system/ui-server.log" 2>/dev/null
  rm -f "$ROOT_DIR/system-core/ui-system/react-app/react-server.log" 2>/dev/null
  rm -f "$ROOT_DIR/react-server.log" 2>/dev/null
  
  # Move backups to backup directory
  mkdir -p "$ROOT_DIR/system-core/ui-system/backups" 2>/dev/null
  find "$ROOT_DIR/system-core/ui-system" -name "*_[0-9]*" -type f -exec mv {} "$ROOT_DIR/system-core/ui-system/backups/" \; 2>/dev/null
  
  echo -e "${GREEN}UI cleanup complete.${NC}"
}

# Create a new UI feature
create_ui_feature() {
  if [ -z "$2" ]; then
    echo -e "${RED}Error: Feature name required${NC}"
    echo -e "Usage: $0 create <feature_name> [description]"
    exit 1
  fi
  
  FEATURE_NAME="$2"
  DESCRIPTION="${3:-New UI Feature}"
  
  echo -e "${BLUE}Creating new UI feature: $FEATURE_NAME${NC}"
  
  # Use existing create-ui-feature script if available
  if [ -f "$ROOT_DIR/create-ui-feature.sh" ]; then
    "$ROOT_DIR/create-ui-feature.sh" "$FEATURE_NAME" "$DESCRIPTION"
  else
    # Simple implementation if script not found
    mkdir -p "$ROOT_DIR/system-core/ui-system/ui-features/$FEATURE_NAME"
    echo "# $FEATURE_NAME - $DESCRIPTION" > "$ROOT_DIR/system-core/ui-system/ui-features/$FEATURE_NAME/README.md"
    echo -e "${GREEN}Feature created at: system-core/ui-system/ui-features/$FEATURE_NAME${NC}"
  fi
}

# Fix common UI issues
fix_ui() {
  echo -e "${BLUE}Fixing common UI issues...${NC}"
  
  # Fix vite config
  IP=$(get_ip)
  sed -i "s/host: '[^']*'/host: '$IP'/g" "$ROOT_DIR/system-core/ui-system/react-app/vite.config.js"
  sed -i "s/hmr:.*host: '[^']*'/hmr: {\n      protocol: 'ws',\n      host: '$IP'/g" "$ROOT_DIR/system-core/ui-system/react-app/vite.config.js"
  
  # Fix watch settings
  if \! grep -q "usePolling: true" "$ROOT_DIR/system-core/ui-system/react-app/vite.config.js"; then
    sed -i '/watch:/,/}/d' "$ROOT_DIR/system-core/ui-system/react-app/vite.config.js"
    sed -i "/server:/a \    watch: {\n      usePolling: true, // Required for WSL\n      interval: 100,\n      binaryInterval: 300\n    }," "$ROOT_DIR/system-core/ui-system/react-app/vite.config.js"
  fi
  
  echo -e "${GREEN}UI issues fixed.${NC}"
}

# Check status of UI servers
check_status() {
  echo -e "${BLUE}Checking UI server status...${NC}"
  
  VITE_RUNNING=$(pgrep -f "vite" >/dev/null && echo "Yes" || echo "No")
  
  echo -e "Development server running: ${YELLOW}$VITE_RUNNING${NC}"
  
  if [ "$VITE_RUNNING" == "Yes" ]; then
    VITE_PID=$(pgrep -f "vite")
    echo -e "Development server PID: ${YELLOW}$VITE_PID${NC}"
  fi
  
  # Check if recent log entries
  if [ -f "$ROOT_DIR/system-core/ui-system/react-app/react-server.log" ]; then
    LAST_LOG_TIME=$(stat -c '%y' "$ROOT_DIR/system-core/ui-system/react-app/react-server.log" | cut -d. -f1)
    echo -e "Last log entry: ${YELLOW}$LAST_LOG_TIME${NC}"
    
    # Show last few log entries
    echo -e "${BLUE}Recent log entries:${NC}"
    tail -n 5 "$ROOT_DIR/system-core/ui-system/react-app/react-server.log"
  fi
}

# Parse arguments
COMMAND=${1:-help}
NO_BROWSER=false
DEBUG=false

# Extract options
for arg in "$@"; do
  case $arg in
    --no-browser)
      NO_BROWSER=true
      ;;
    --debug)
      DEBUG=true
      ;;
    --ip=*)
      IP="${arg#*=}"
      ;;
  esac
done

# Process command
case $COMMAND in
  start)
    kill_servers
    start_dev_server
    ;;
  production)
    kill_servers
    start_prod_server
    ;;
  stop)
    kill_servers
    ;;
  clean)
    clean_ui
    ;;
  create)
    create_ui_feature "$@"
    ;;
  fix)
    fix_ui
    ;;
  status)
    check_status
    ;;
  help|--help|-h)
    show_usage
    ;;
  *)
    echo -e "${RED}Unknown command: $COMMAND${NC}"
    show_usage
    ;;
esac

exit 0
