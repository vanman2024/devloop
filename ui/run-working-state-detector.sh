#!/bin/bash
# Run the working state detector after editing has ceased

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the current directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Configuration
QUIET_PERIOD=60  # Seconds to wait after last file changes
INTERVAL=15      # Check every 15 seconds
MAX_BACKUPS=10   # Maximum number of backups to keep
RETRY_PERIOD=300 # Wait 5 minutes before retrying after failure
SUCCESS_PERIOD=1800 # Wait 30 minutes after successful backup
LOG_FILE="$DIR/logs/working-state-detector.log"
PID_FILE="$DIR/working-detector.pid"

# Ensure logs directory exists
mkdir -p "$DIR/logs"

# Helper function for logging
log() {
  local message="$1"
  local type="${2:-INFO}"
  local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  echo -e "[${timestamp}] [${type}] ${message}"
  echo "[${timestamp}] [${type}] ${message}" >> "$LOG_FILE"
}

# Check for Node.js
if ! command -v node &> /dev/null; then
  log "Node.js is not installed" "ERROR"
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v)
log "Using Node.js $NODE_VERSION"

# Process command line arguments
case "$1" in
  status)
    node "$DIR/tools/working-state-detector.js" status
    exit $?
    ;;
  now|check)
    log "Running immediate working state check..." "INFO"
    node "$DIR/tools/working-state-detector.js" check
    exit $?
    ;;
  backup)
    log "Running immediate backup if working state..." "INFO"
    node "$DIR/tools/working-state-detector.js" backup
    exit $?
    ;;
  clean)
    log "Cleaning up old backups..." "INFO"
    node "$DIR/tools/working-state-detector.js" clean
    exit $?
    ;;
  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if ps -p "$PID" > /dev/null; then
        log "Stopping working state detector (PID: $PID)" "INFO"
        kill "$PID"
        rm "$PID_FILE"
        exit 0
      else
        log "No running detector found with PID $PID" "WARNING"
        rm "$PID_FILE"
        exit 1
      fi
    else
      log "No PID file found. Detector may not be running." "WARNING"
      exit 1
    fi
    ;;
  help|-h|--help)
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  (no arguments)  Run continuous monitoring"
    echo "  status          Show detector status"
    echo "  check|now       Run immediate working state check"
    echo "  backup          Run immediate backup if in working state"
    echo "  clean           Clean up old backups"
    echo "  stop            Stop a running detector"
    echo "  help            Show this help message"
    exit 0
    ;;
esac

# Check if already running
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p "$PID" > /dev/null; then
    log "Working state detector already running with PID $PID" "ERROR"
    echo -e "${RED}Working state detector already running with PID $PID${NC}"
    echo -e "${YELLOW}Use '$0 stop' to stop it first${NC}"
    exit 1
  else
    log "Found stale PID file, cleaning up" "WARNING"
    rm "$PID_FILE"
  fi
fi

# Save our PID
echo $$ > "$PID_FILE"

# Set up trap to remove PID file on exit
cleanup() {
  log "Shutting down working state detector" "INFO"
  [ -f "$PID_FILE" ] && rm "$PID_FILE"
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Start continuous monitoring mode
log "Starting working state detector in continuous mode" "INFO"
echo -e "${CYAN}==================================================${NC}"
echo -e "${CYAN}  WORKING STATE DETECTOR - CONTINUOUS MONITORING  ${NC}"
echo -e "${CYAN}==================================================${NC}"
echo -e "${BLUE}Will check for working state after $QUIET_PERIOD seconds of inactivity${NC}"
echo -e "${BLUE}Will store up to $MAX_BACKUPS backups${NC}"
echo -e "${BLUE}Logs: $LOG_FILE${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"

# Track the last modification time of the src directory
get_last_mod_time() {
  find "$DIR/src" -type f -name "*.jsx" -o -name "*.js" | xargs stat -c %Y 2>/dev/null | sort -nr | head -n1
}

LAST_MOD=$(get_last_mod_time)
QUIET_COUNT=0
BACKUPS_CREATED=0

while true; do
  # Get current modification time
  CURRENT_MOD=$(get_last_mod_time)
  
  if [ "$CURRENT_MOD" != "$LAST_MOD" ]; then
    # Files have changed
    echo -e "${BLUE}Changes detected, resetting quiet period counter...${NC}"
    LAST_MOD=$CURRENT_MOD
    QUIET_COUNT=0
  else
    # No changes since last check
    QUIET_COUNT=$((QUIET_COUNT + INTERVAL))
    if [ $QUIET_COUNT -ge $QUIET_PERIOD ]; then
      echo -e "${GREEN}$QUIET_PERIOD seconds of inactivity detected, checking working state...${NC}"
      
      # Run the detector
      if node "$DIR/tools/working-state-detector.js" backup; then
        BACKUPS_CREATED=$((BACKUPS_CREATED + 1))
        echo -e "${GREEN}Successfully backed up working state (total: $BACKUPS_CREATED)${NC}"
        
        # Reset the counter to avoid constant backups
        # Wait longer before allowing another backup
        QUIET_COUNT=0
        QUIET_PERIOD=$SUCCESS_PERIOD
        echo -e "${BLUE}Waiting $((SUCCESS_PERIOD/60)) minutes before next backup opportunity${NC}"
      else
        echo -e "${RED}Not in a working state, will check again later${NC}"
        # Reset counter but use shorter period for retry
        QUIET_COUNT=0
        QUIET_PERIOD=$RETRY_PERIOD
        echo -e "${BLUE}Will try again after $((RETRY_PERIOD/60)) minutes of inactivity${NC}"
      fi
    else
      echo -e "${BLUE}Waiting for quiet period: $QUIET_COUNT/$QUIET_PERIOD seconds${NC}"
    fi
  fi
  
  # Sleep before checking again
  sleep $INTERVAL
done